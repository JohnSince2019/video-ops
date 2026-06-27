import { createReadStream, existsSync, promises as fs } from "node:fs";
import path from "node:path";
import http from "node:http";
import { URL } from "node:url";

import {
  JobProgressChannel,
  createJobProgressPayload,
  createJobProgressStream,
} from "./lib/progress/job-progress.ts";
import {
  buildCustomVoiceReferenceAbsolutePath,
  getCustomVoiceReferenceRoot,
  saveCustomVoiceReference,
} from "./lib/audio/custom-voice-reference.ts";
import {
  getCustomVoiceAuthorizationNotice,
  getVoicePreset,
  listVoicePresets,
} from "./lib/audio/voice-presets.ts";
import { getTtsProviderProfile, listTtsProviderProfiles } from "./lib/audio/tts-providers.ts";
import { ensureVoicePreviewAsset, getVoicePreviewMeta } from "./lib/audio/voice-preview.ts";
import { buildJobDetailView, buildJobListView } from "./lib/ui/job-dashboard.ts";
import { buildComplianceReport, exportComplianceReportJson } from "./lib/compliance/compliance-report.ts";
import { exportComplianceReportPdf } from "./lib/compliance/compliance-report-pdf.ts";
import { runComplianceGuard } from "./lib/domain/compliance-guard.ts";
import {
  buildStoryboardPreview,
  SUBTITLE_STYLES,
  TRANSITION_STYLES,
} from "./lib/ui/storyboard-preview.ts";
import { normalizeWizardConfig, summarizeWizardConfig, validateWizardConfig } from "./lib/ui/wizard-config.ts";
import { renderZenPageShell } from "./lib/ui/zen-shell.ts";
import { createVideoJobFromDraft } from "./lib/jobs/job-creation.ts";
import { renderJobArtifacts } from "./lib/video/local-renderer.ts";

const port = Number(process.env.PORT ?? 3003);
const channel = new JobProgressChannel();
const createdJobs = new Map();
const workspaceRoot = process.cwd();
const voicePreviewRoot = path.join(workspaceRoot, "tmp", "voice-previews");
const customVoiceReferenceRoot = getCustomVoiceReferenceRoot();
const voicePresetCardsHtml = listVoicePresets()
  .map((preset, index) => {
    const provider = getTtsProviderProfile(preset.providerId);
    const qualityLabel =
      provider.qualityTier === "premium"
        ? "高保真"
        : provider.qualityTier === "production"
          ? "生产级"
          : "轻量兜底";
    const deploymentLabel =
      provider.deploymentMode === "cloud_ready"
        ? "适合云端 SaaS"
        : provider.deploymentMode === "hybrid"
          ? "本地与云端都可落地"
          : "更适合本地工作站";

    return `
      <article class="voice-card${index === 0 ? " active" : ""}" data-voice-mode="${preset.id}">
        <div class="voice-card-top">
          <strong>${preset.chineseLabel}</strong>
          <span class="voice-quality-chip">${qualityLabel}</span>
        </div>
        <small>${preset.description}</small>
        <div class="voice-meta-list">
          <span>适合内容：${preset.chineseUseCase}</span>
          <span>声音引擎：${provider.displayName}</span>
          <span>自然度：${provider.naturalnessLabel}</span>
          <span>产品定位：${provider.recommendedRoleLabel}</span>
          <span>音色克隆：${provider.supportsVoiceCloning ? "支持" : "暂不支持"}</span>
          <span>部署方式：${deploymentLabel}</span>
        </div>
        <div class="voice-actions">
          <button type="button" class="secondary voice-preview-btn">试听</button>
          <button type="button" class="${index === 0 ? "primary" : "secondary"} voice-apply-btn">应用该声音</button>
        </div>
      </article>`;
  })
  .join("");
const defaultVoicePreset = getVoicePreset("male_coach_deep");
const defaultVoiceProvider = getTtsProviderProfile(defaultVoicePreset.providerId);
const customVoiceAuthorizationNotice = getCustomVoiceAuthorizationNotice();
const ttsProviderSelectOptionsHtml = listTtsProviderProfiles()
  .map((provider) => {
    const deploymentLabel =
      provider.deploymentMode === "hybrid"
        ? "本地与云端"
        : provider.deploymentMode === "cloud_ready"
          ? "云端 SaaS"
          : "本地工作站";
    const qualityLabel =
      provider.qualityTier === "premium"
        ? "高保真"
        : provider.qualityTier === "production"
          ? "生产级"
          : "轻量兜底";

    return `<option value="${provider.id}"${provider.id === defaultVoiceProvider.id ? " selected" : ""}>${provider.displayName} · ${qualityLabel} · ${deploymentLabel}</option>`;
  })
  .join("");
const ttsProviderStrategyCardsHtml = listTtsProviderProfiles()
  .map((provider, index) => {
    const qualityLabel =
      provider.qualityTier === "premium"
        ? "高拟真生产"
        : provider.qualityTier === "production"
          ? "主力生产"
          : "低成本兜底";
    const deploymentLabel =
      provider.deploymentMode === "hybrid"
        ? "本地与云端都可落地"
        : provider.deploymentMode === "cloud_ready"
          ? "适合云端 SaaS"
          : "更适合本地工作站";
    const routeLabel =
      provider.id === "cosyvoice-mlx"
        ? "适合当前第一阶段主链路，支持中文解说与参考音频克隆。"
        : provider.id === "f5-tts"
          ? "适合更高拟真度和后续 SaaS 生产线路。"
          : "适合快速预览、批量兜底和成本敏感场景。";

    return `
      <article class="provider-strategy-card${index === 0 ? " active" : ""}" data-provider-id="${provider.id}">
        <div class="provider-strategy-top">
          <strong>${provider.displayName}</strong>
          <span class="voice-quality-chip">${qualityLabel}</span>
        </div>
        <small>${provider.naturalnessLabel}</small>
        <div class="voice-meta-list">
          <span>产品定位：${provider.recommendedRoleLabel}</span>
          <span>部署方式：${deploymentLabel}</span>
          <span>音色克隆：${provider.supportsVoiceCloning ? "支持" : "暂不支持"}</span>
          <span>实时试听：${provider.supportsStreamingPreview ? "支持" : "不支持"}</span>
          <span>试听体验：${provider.previewExperienceLabel}</span>
          <span>${provider.saasFitLabel}</span>
          <span>${routeLabel}</span>
        </div>
      </article>`;
  })
  .join("");

const sharedPageStyles = `
  .workspace-page {
    min-height: calc(100vh - 64px);
    display: grid;
    grid-template-columns: 206px minmax(0, 1fr) 248px;
    background: var(--bg);
  }
  .flow-sidebar,
  .gate-sidebar {
    background: rgba(255, 255, 255, 0.74);
    border-right: 1px solid var(--border);
    padding: 16px 14px;
  }
  .gate-sidebar {
    border-right: 0;
    border-left: 1px solid var(--border);
  }
  .main-stage {
    min-width: 0;
    padding: 16px 18px 24px;
  }
  .section-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--muted);
    letter-spacing: 0.02em;
  }
  .section-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--ink);
    letter-spacing: -0.02em;
  }
  .layout {
    display: grid;
    gap: 18px;
    grid-template-columns: 1.1fr 0.9fr;
    margin-top: 20px;
  }
  .field-grid {
    display: grid;
    gap: 14px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .field { display: grid; gap: 8px; }
  .field.full { grid-column: 1 / -1; }
  label {
    font-size: 12px;
    font-weight: 700;
    color: var(--ink);
    letter-spacing: 0.02em;
  }
  input, select, textarea {
    width: 100%;
    border: 1px solid var(--border);
    background: #fff;
    border-radius: 12px;
    padding: 11px 13px;
    font: inherit;
    color: var(--ink);
  }
  textarea { min-height: 220px; resize: vertical; }
  input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: rgba(118, 103, 255, 0.5);
    box-shadow: 0 0 0 3px rgba(118, 103, 255, 0.12);
  }
  .hint { font-size: 12px; color: var(--muted); }
  .actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 18px;
  }
  button {
    border: 0;
    border-radius: 10px;
    padding: 11px 16px;
    cursor: pointer;
    font-weight: 700;
    letter-spacing: 0.01em;
  }
  button.primary {
    background: var(--primary);
    color: white;
    box-shadow: 0 8px 18px rgba(118, 103, 255, 0.2);
  }
  button.secondary {
    background: #fff;
    color: var(--ink);
    border: 1px solid var(--border);
  }
  .summary-meta {
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-top: 12px;
  }
  pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
    font-size: 13px;
    color: #22324d;
  }
  .soft-card {
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 14px;
  }
  @media (max-width: 1120px) {
    .workspace-page {
      grid-template-columns: 1fr;
    }
    .flow-sidebar,
    .gate-sidebar {
      border: 0;
      border-bottom: 1px solid var(--border);
      padding: 14px 16px;
    }
    .gate-sidebar {
      border-top: 1px solid var(--border);
      border-bottom: 0;
    }
    .main-stage {
      padding: 14px 16px 20px;
    }
  }
  @media (max-width: 900px) {
    .layout { grid-template-columns: 1fr; }
  }
  @media (max-width: 640px) {
    .field-grid, .summary-meta { grid-template-columns: 1fr; }
  }
`;

const navItems = [
  {
    href: "/",
    label: "向导",
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.1 4.9L19 10l-4.9 2.1L12 17l-2.1-4.9L5 10l4.9-2.1L12 3z"/><path d="M5 19l1.2-2.8L9 15l-2.8-1.2L5 11l-1.2 2.8L1 15l2.8 1.2L5 19z"/><path d="M19 21l.8-1.9L22 18l-2.2-.9L19 15l-.8 2.1L16 18l2.2 1.1L19 21z"/></svg>',
  },
  {
    href: "/jobs",
    label: "任务",
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="12" height="18" rx="2"/><path d="M8 7h5"/><path d="M8 11h5"/><path d="M8 15h3"/><path d="M18 8l2 2 3-4"/></svg>',
  },
  {
    href: "/storyboard",
    label: "分镜",
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="6" height="14" rx="1.5"/><rect x="10.5" y="5" width="10.5" height="6" rx="1.5"/><rect x="10.5" y="13" width="10.5" height="6" rx="1.5"/></svg>',
  },
  {
    href: "/compliance-report",
    label: "合规",
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3z"/><path d="M9 12l2 2 4-4"/></svg>',
  },
  {
    href: "/demo",
    label: "进度演示",
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18V6"/><path d="M10 18V10"/><path d="M16 18V8"/><path d="M22 18V4"/></svg>',
  },
];

const demoJobs = [
  {
    id: "job-001",
    title: "AI 工具如何让研发效率提升 3 倍",
    state: "AI_PROCESSING",
    platform: "douyin",
    renderProfile: "standard",
    updatedAt: "2026-06-27T02:20:00.000Z",
    createdAt: "2026-06-27T01:50:00.000Z",
    progress: 44,
    currentStep: "image_generation",
    manifestId: "manifest-001",
    ownerTokenHash: "owner-hash-001",
    lastCheckpoint: {
      step: "image_generation",
      progress: 44,
      storyboardScenes: 5,
      voiceMode: "male_clear_teacher",
      ttsProviderId: "cosyvoice-mlx",
      ttsRouteLabel: "默认中文解说路线",
      stylePreset: "john_vertical_comic",
      personaPreset: "john_persona_v1",
    },
    qualitySummary: {
      durationSec: null,
      resolution: null,
      audioPresence: null,
      subtitleStatus: "planned",
      fallbackStatus: null,
      complianceStatus: "allowed",
      complianceViolations: 0,
    },
    costSummary: {
      gptImageUsd: 0.092,
      wanxUsd: 0.018,
      ttsUsd: 0.011,
      totalUsd: 0.121,
    },
    outputs: [],
    errors: [],
  },
  {
    id: "job-002",
    title: "Atlas x John 副业工作流拆解",
    state: "COMPLETED",
    platform: "xiaohongshu",
    renderProfile: "high_quality",
    updatedAt: "2026-06-27T01:40:00.000Z",
    createdAt: "2026-06-27T00:55:00.000Z",
    progress: 100,
    currentStep: "done",
    manifestId: "manifest-002",
    ownerTokenHash: "owner-hash-002",
    lastCheckpoint: {
      step: "done",
      progress: 100,
      storyboardScenes: 6,
      outputsReady: true,
      previewUrl: "/output/jobs/job-002/final/video.mp4",
      voiceMode: "female_energetic_creator",
      ttsProviderId: "f5-tts",
      ttsRouteLabel: "高拟真 SaaS 生产路线",
      stylePreset: "john_vertical_comic",
      personaPreset: "john_persona_v1",
    },
    qualitySummary: {
      fileSizeBytes: 8_912_384,
      durationSec: 34.6,
      resolution: "1080x1920",
      audioPresence: true,
      subtitleStatus: "embedded",
      fallbackStatus: "primary",
      fallbackReason: null,
      complianceStatus: "allowed",
      complianceViolations: 0,
    },
    costSummary: {
      gptImageUsd: 0.188,
      wanxUsd: 0.024,
      ttsUsd: 0.063,
      totalUsd: 0.275,
    },
    outputs: [
      { kind: "video", path: "output/job-002.mp4" },
      { kind: "cover", path: "output/job-002-cover.png" },
      { kind: "metadata", path: "output/job-002-metadata.json" },
    ],
    errors: [],
  },
  {
    id: "job-003",
    title: "高强度脑力工作者精力管理",
    state: "FAILED",
    platform: "videox",
    renderProfile: "draft",
    updatedAt: "2026-06-27T00:25:00.000Z",
    createdAt: "2026-06-27T00:05:00.000Z",
    progress: 58,
    currentStep: "tts_generation",
    manifestId: "manifest-003",
    ownerTokenHash: "owner-hash-003",
    lastCheckpoint: {
      step: "tts_generation",
      progress: 58,
      storyboardScenes: 4,
      scene: 4,
      voiceMode: "custom_reference",
      customVoiceReference: "john-demo.wav",
      ttsProviderId: "cosyvoice-mlx",
      ttsRouteLabel: "自定义声音克隆路线",
      stylePreset: "john_vertical_comic",
      personaPreset: "john_persona_v1",
    },
    qualitySummary: {
      fileSizeBytes: null,
      durationSec: null,
      resolution: "1080x1920",
      audioPresence: false,
      subtitleStatus: "planned",
      fallbackStatus: "fallback",
      fallbackReason: "TTS 生成超时",
      complianceStatus: "allowed",
      complianceViolations: 0,
    },
    costSummary: {
      gptImageUsd: 0.121,
      wanxUsd: 0.012,
      ttsUsd: 0.036,
      totalUsd: 0.169,
    },
    outputs: [{ kind: "cover", path: "output/job-003-cover.png" }],
    errors: [{ stepName: "tts_generation", errorMessage: "cosyvoice timeout", retryCount: 3 }],
  },
  {
    id: "job-004",
    title: "Waiting Queue Demo",
    state: "QUEUED",
    platform: "douyin",
    renderProfile: "draft",
    updatedAt: "2026-06-27T02:45:00.000Z",
    createdAt: "2026-06-27T02:45:00.000Z",
    progress: 0,
    currentStep: "waiting_for_worker",
    manifestId: "manifest-004",
    ownerTokenHash: "owner-hash-004",
    lastCheckpoint: {
      step: "waiting_for_worker",
      progress: 0,
      storyboardScenes: 0,
      voiceMode: "male_coach_deep",
      ttsProviderId: "melotts",
      ttsRouteLabel: "低成本快速预览路线",
      stylePreset: "john_vertical_comic",
      personaPreset: "john_persona_v1",
    },
    qualitySummary: {
      fileSizeBytes: null,
      durationSec: null,
      resolution: null,
      audioPresence: null,
      subtitleStatus: "planned",
      fallbackStatus: null,
      complianceStatus: "allowed",
      complianceViolations: 0,
    },
    costSummary: {
      gptImageUsd: 0,
      wanxUsd: 0,
      ttsUsd: 0,
      totalUsd: 0,
    },
    outputs: [],
    errors: [],
  },
];

const storyboardScenes = [
  {
    id: "scene-001",
    narration: "第一幕：AI 工具不是一个个孤立技巧，而是一条能持续复用的工作流。",
    visualHint: "双屏工位上打开内容策划和代码编辑器",
    durationMs: 4200,
    transition: "crossfade",
  },
  {
    id: "scene-002",
    narration: "第二幕：Atlas 帮你把经验、踩坑和成功复盘沉淀成下一次更快的执行模板。",
    visualHint: "白板上写满 SOP 与 checklist",
    durationMs: 5100,
    transition: "fade",
  },
  {
    id: "scene-003",
    narration: "第三幕：John 用训练、营养和节律管理，让高强度脑力输出可持续。",
    visualHint: "晨跑结束后喝咖啡开始录制视频",
    durationMs: 4700,
    transition: "cut",
  },
];

const videoWorkbenchSteps = [
  { id: "asset_intake", title: "素材收集", detail: "粘贴完整短视频脚本，自动抽取标题、hook、摘要和场景。", status: "active" },
  { id: "storyboard_generation", title: "分镜确认", detail: "核对场景拆分、口播和画面建议，确认镜头节奏。", status: "locked" },
  { id: "image_generation", title: "图像生成", detail: "按 John 风格生成主画面和补充 B-roll 画面。", status: "locked" },
  { id: "voice_generation", title: "声音应用", detail: "试听预设声音或导入你的声音，然后确认应用。", status: "locked" },
  { id: "video_assembly", title: "合成预览", detail: "组装字幕、语音、画面和 BGM，生成可预览视频。", status: "locked" },
  { id: "preview_publish", title: "合规发布", detail: "检查多平台输出、合规结果和最终 MP4 产物。", status: "locked" },
];

function buildStepLabel(step) {
  if (step.status === "done") {
    return "已通过";
  }
  if (step.status === "active") {
    return "当前步骤";
  }
  return "未解锁";
}

function getWizardStepsForState(jobState) {
  if (!jobState) {
    return videoWorkbenchSteps;
  }

  const unlockedIndexByState = {
    QUEUED: 1,
    PARSING: 1,
    AI_PROCESSING: 2,
    ASSEMBLING: 4,
    RENDERING: 4,
    POST_PROCESSING: 5,
    COMPLETED: 6,
  };

  const unlockedCount = unlockedIndexByState[jobState] ?? 1;
  return videoWorkbenchSteps.map((step, index) => {
    if (index + 1 < unlockedCount) {
      return { ...step, status: "done" };
    }
    if (index + 1 === unlockedCount) {
      return { ...step, status: "active" };
    }
    return { ...step, status: "locked" };
  });
}

const wizardStepContent = {
  asset_intake: {
    title: "素材收集",
    subtitle: "直接粘贴短视频脚本，系统会自动识别标题、开场抓手、摘要、总时长和分段结构。",
    goalTitle: "把一条可拍的短视频脚本转成结构化生产输入",
    goalText: "你提供脚本，系统负责提取标题、开场抓手、摘要、总时长、分段内容和行动引导。",
    goalHint: "用户不应该先填一堆内部字段。这里的目标是少输入、快理解、可立即进入分镜和生成。",
  },
  storyboard_generation: {
    title: "分镜确认",
    subtitle: "确认每一段内容的拆分、口播顺序、画面建议与时长是否合理。",
    goalTitle: "把脚本变成可以直接进入生产的镜头草图",
    goalText: "这里重点确认每一段要说什么、建议画面是什么、建议时长是否支撑最终视频节奏。",
    goalHint: "如果分镜不清楚，后面的生图、配音和合成都会放大问题，所以这一关是内容质量的关键闸口。",
  },
  image_generation: {
    title: "图像生成",
    subtitle: "基于 John 风格和每一段的画面建议生成主画面与补充素材。",
    goalTitle: "让每一段内容都有统一且可用的视觉资产",
    goalText: "系统会围绕人物一致性、画面风格、安全区和平台比例生成主图与补充 B-roll。",
    goalHint: "这一阶段更关注画风一致、人物稳定、镜头可读，而不是一次就追求最终极致质感。",
  },
  voice_generation: {
    title: "声音应用",
    subtitle: "选择预设声音或应用你的参考声音，确认整条视频的口播方案。",
    goalTitle: "给脚本配上自然、稳定、可连续复用的声音",
    goalText: "默认支持多组男女声预设，也为后续接入自定义音色克隆预留了入口。",
    goalHint: "声音要服务内容理解，优先保证清晰、可信和没有明显 AI 味，再去考虑风格化。",
  },
  video_assembly: {
    title: "合成预览",
    subtitle: "组装画面、字幕、语音和 BGM，输出可预览的 MP4 成品。",
    goalTitle: "把分散资产合成成一条可以真正观看的视频",
    goalText: "这个阶段会完成时间线装配、字幕叠加、音视频合流，并准备预览和下载产物。",
    goalHint: "如果这一关通过，说明产品已经从“脚本工具”跨进了“视频生产工具”。",
  },
  preview_publish: {
    title: "合规发布",
    subtitle: "核对多平台输出、合规状态、元数据和最终可交付的 MP4。",
    goalTitle: "确认这条视频可以被安全交付和后续发布",
    goalText: "这里会查看最终预览、输出包、元数据与发布前检查项，确保不是只生成了一个临时文件。",
    goalHint: "最终目标不是“渲染成功”四个字，而是你真的拿到一条能继续发布和复用的视频资产。",
  },
};

function resolveWizardStep(stepId) {
  const defaultStep = "asset_intake";
  if (!stepId) {
    return defaultStep;
  }
  if (stepId in wizardStepContent) {
    return stepId;
  }
  return defaultStep;
}

function stepQueryHref(stepId) {
  return stepId === "asset_intake" ? "/" : `/?step=${stepId}`;
}

function profileLabel(value) {
  if (value === "draft") return "草稿";
  if (value === "high_quality") return "高质量";
  return "标准";
}

function scriptModeLabel(value) {
  return value === "markdown" ? "Markdown" : "纯文本";
}

function pageNav(activeHref) {
  return navItems.map((item) => ({ ...item, active: item.href === activeHref }));
}

function renderWizardPage(stepId = "angle_refine") {
  const wizardSteps = getWizardStepsForState();
  const currentStepId = resolveWizardStep(stepId);
  const currentStepIndex = Math.max(0, wizardSteps.findIndex((step) => step.id === currentStepId));
  const completedSteps = currentStepIndex;
  const currentStepContent = wizardStepContent[currentStepId] ?? wizardStepContent.angle_refine;
  const previousStepId = currentStepIndex > 0 ? wizardSteps[currentStepIndex - 1]?.id : null;
  const progressPercent = Math.max(10, Math.round((completedSteps / wizardSteps.length) * 100));
  const stepRailHtml = wizardSteps
    .map(
      (step, index) => {
        const visualStatus = index < currentStepIndex ? "done" : index === currentStepIndex ? "active" : "locked";
        return `
            <a class="step-item${visualStatus === "active" ? " active" : ""}${visualStatus === "locked" ? " locked" : ""}" data-step-id="${step.id}" href="${stepQueryHref(step.id)}">
              <div class="step-index">${index + 1}</div>
              <div class="step-copy">
                <div class="step-title">${step.title}</div>
                <small class="step-status-label">${buildStepLabel({ status: visualStatus })}</small>
                <p>${step.detail}</p>
              </div>
            </a>`;
      },
    )
    .join("");
  const isAssetIntakeStep = currentStepId === "asset_intake";
  const isVoiceGenerationStep = currentStepId === "voice_generation";

  return renderZenPageShell({
    title: "视频工作台",
    eyebrow: "Video-Ops / M3 / JOH-80",
    navItems: pageNav("/"),
    extraStyles: `
${sharedPageStyles}
      .wizard-shell {
        display: grid;
        grid-template-columns: 206px minmax(0, 1fr) 248px;
        min-height: calc(100vh - 64px);
      }
      .wizard-flow,
      .wizard-gate {
        background: rgba(255,255,255,0.72);
        padding: 14px 12px;
      }
      .wizard-flow {
        border-right: 1px solid var(--border);
      }
      .wizard-gate {
        border-left: 1px solid var(--border);
      }
      .wizard-main {
        min-width: 0;
        padding: 14px 18px 24px;
      }
      .flow-header {
        display: grid;
        gap: 6px;
        padding: 2px 4px 14px;
      }
      .flow-progress-bar {
        height: 4px;
        border-radius: 999px;
        background: #eceffd;
        overflow: hidden;
      }
      .flow-progress-bar span {
        display: block;
        width: ${progressPercent}%;
        height: 100%;
        border-radius: 999px;
        background: var(--primary);
      }
      .step-rail,
      .quality-list,
      .job-events,
      .gate-list,
      .asset-list {
        display: grid;
        gap: 10px;
      }
      .step-item,
      .quality-item,
      .event-item-compact,
      .gate-item,
      .asset-item {
        border: 1px solid var(--border);
        border-radius: 14px;
        background: #fff;
      }
      .step-item {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 12px;
        opacity: 0.68;
        text-decoration: none;
      }
      .step-item.active {
        opacity: 1;
        background: #f7f5ff;
        border-color: #dcd5ff;
        box-shadow: inset 0 0 0 1px rgba(118,103,255,0.08);
      }
      .step-item.locked {
        opacity: 0.42;
      }
      .step-index {
        width: 28px;
        height: 28px;
        border-radius: 10px;
        display: grid;
        place-items: center;
        background: #f1f3f9;
        color: var(--muted);
        font-size: 12px;
        font-weight: 800;
        flex: 0 0 auto;
      }
      .step-item.active .step-index {
        background: var(--primary);
        color: #fff;
      }
      .step-copy {
        display: grid;
        gap: 3px;
      }
      .step-title,
      .panel-title {
        font-size: 14px;
        font-weight: 700;
        color: var(--ink);
        letter-spacing: -0.01em;
      }
      .step-copy small {
        font-size: 11px;
        color: var(--muted);
      }
      .step-copy p {
        font-size: 12px;
        line-height: 1.55;
      }
      .tip-label {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .tip-icon {
        width: 17px;
        height: 17px;
        border-radius: 999px;
        background: #eef1fb;
        color: var(--primary);
        display: inline-grid;
        place-items: center;
        font-size: 11px;
        font-weight: 800;
        cursor: help;
        position: relative;
      }
      .tip-icon::after {
        content: attr(data-tip);
        position: absolute;
        left: 50%;
        bottom: calc(100% + 10px);
        transform: translateX(-50%);
        min-width: 220px;
        max-width: 280px;
        padding: 10px 12px;
        border-radius: 12px;
        background: #182033;
        color: #fff;
        font-size: 12px;
        line-height: 1.5;
        box-shadow: 0 16px 28px rgba(15, 23, 42, 0.22);
        opacity: 0;
        pointer-events: none;
        transition: opacity .15s ease;
        z-index: 20;
      }
      .tip-icon:hover::after {
        opacity: 1;
      }
      .script-intake-layout {
        display: grid;
        gap: 16px;
      }
      .script-paste-box {
        display: grid;
        gap: 10px;
      }
      .script-paste-box textarea {
        min-height: 260px;
        font-size: 14px;
        line-height: 1.75;
      }
      .platform-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
      }
      .check-card {
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 12px 14px;
        background: #fff;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .check-card input {
        width: 16px;
        height: 16px;
        margin: 0;
      }
      .auto-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .auto-card {
        border: 1px solid var(--border);
        border-radius: 14px;
        background: #fbfcff;
        padding: 14px;
        display: grid;
        gap: 8px;
      }
      .auto-card b {
        font-size: 12px;
        color: var(--muted);
      }
      .auto-card strong {
        font-size: 14px;
        color: var(--ink);
      }
      .scene-outline {
        display: grid;
        gap: 10px;
      }
      .scene-row {
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 12px;
        background: #fff;
        display: grid;
        gap: 8px;
      }
      .scene-row strong {
        font-size: 13px;
      }
      .scene-row-label {
        font-size: 12px;
        color: var(--muted);
        font-weight: 700;
      }
      .scene-row-value {
        color: var(--ink);
        line-height: 1.6;
      }
      .advanced-config {
        border: 1px solid var(--border);
        border-radius: 16px;
        background: #fcfdff;
        overflow: hidden;
      }
      .advanced-config[open] {
        background: #fff;
      }
      .advanced-config summary {
        list-style: none;
        cursor: pointer;
        padding: 14px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .advanced-config summary::-webkit-details-marker {
        display: none;
      }
      .advanced-config-title {
        display: grid;
        gap: 4px;
      }
      .advanced-config-title strong {
        font-size: 14px;
        color: var(--ink);
      }
      .advanced-config-title span {
        font-size: 12px;
        color: var(--muted);
        line-height: 1.5;
      }
      .advanced-config-caret {
        flex: 0 0 auto;
        color: var(--muted);
        font-size: 12px;
        font-weight: 700;
      }
      .advanced-config[open] .advanced-config-caret {
        color: var(--primary);
      }
      .advanced-config-body {
        padding: 0 16px 16px;
      }
      .voice-preset-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .provider-strategy-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
        margin-bottom: 12px;
      }
      .provider-strategy-card {
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 14px;
        background: rgba(247, 249, 252, 0.92);
        display: grid;
        gap: 8px;
        cursor: pointer;
      }
      .provider-strategy-card.active {
        border-color: #d9d2ff;
        background: #f8f6ff;
        box-shadow: inset 0 0 0 1px rgba(118, 103, 255, 0.08);
      }
      .provider-strategy-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .voice-card {
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 14px;
        background: #fff;
        display: grid;
        gap: 8px;
      }
      .voice-card-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .voice-quality-chip {
        border-radius: 999px;
        padding: 4px 8px;
        background: #efe9ff;
        color: #5a43b5;
        font-size: 11px;
        font-weight: 700;
        white-space: nowrap;
      }
      .voice-card.active {
        border-color: #d9d2ff;
        background: #f8f6ff;
        box-shadow: inset 0 0 0 1px rgba(118, 103, 255, 0.08);
      }
      .voice-card small {
        color: var(--muted);
        font-size: 12px;
      }
      .voice-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .voice-meta-list {
        display: grid;
        gap: 4px;
        font-size: 12px;
        color: var(--muted);
      }
      .mini-section-title {
        margin: 14px 0 8px;
        font-size: 12px;
        font-weight: 700;
        color: var(--muted);
        letter-spacing: 0.02em;
      }
      .artifact-section[hidden] {
        display: none;
      }
      .route-behavior-panel {
        border-radius: 14px;
        border: 1px solid var(--border);
        background: rgba(250, 251, 255, 0.92);
        padding: 12px 14px;
        display: grid;
        gap: 8px;
        margin-bottom: 12px;
      }
      .route-behavior-panel strong {
        font-size: 13px;
        color: var(--ink);
      }
      .route-behavior-note {
        font-size: 12px;
        color: var(--muted);
        line-height: 1.6;
      }
      .route-behavior-list {
        display: grid;
        gap: 6px;
      }
      .route-behavior-item {
        border-radius: 12px;
        background: #fff;
        border: 1px solid rgba(15, 23, 42, 0.08);
        padding: 8px 10px;
        font-size: 12px;
        color: var(--muted);
      }
      .micro-copy {
        font-size: 12px;
        color: var(--muted);
      }
      .main-topbar {
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }
      .main-title {
        display: grid;
        gap: 4px;
      }
      .main-title h2 {
        margin: 0;
        font-size: 24px;
        line-height: 1.1;
        letter-spacing: -0.03em;
      }
      .main-title p {
        font-size: 12px;
      }
      .nav-actions {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .mini-ghost {
        color: var(--muted);
        font-size: 13px;
        font-weight: 700;
      }
      .submit-chip {
        height: 34px;
        border-radius: 10px;
        padding: 0 14px;
        background: var(--primary);
        color: #fff;
        display: inline-flex;
        align-items: center;
        font-size: 13px;
        font-weight: 700;
        box-shadow: 0 10px 18px rgba(118, 103, 255, 0.18);
      }
      .focus-banner,
      .editor-card,
      .storyboard-card,
      .status-card {
        display: grid;
        gap: 14px;
      }
      .focus-banner {
        padding: 14px 16px;
        margin-bottom: 14px;
      }
      .focus-pill {
        width: fit-content;
        border-radius: 999px;
        padding: 5px 10px;
        background: #f4f1ff;
        color: var(--primary);
        font-size: 11px;
        font-weight: 700;
      }
      .focus-banner strong {
        font-size: 14px;
        color: var(--ink);
      }
      .focus-banner p {
        font-size: 12px;
      }
      .editor-card {
        padding: 18px;
      }
      .editor-card textarea#scriptText {
        min-height: 316px;
        font-size: 14px;
        line-height: 1.8;
      }
      .field-grid.workbench {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .field.compact label { font-size: 12px; }
      .editor-tools {
        display: grid;
        gap: 14px;
      }
      .workflow-actions {
        display: grid;
        gap: 12px;
        grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
      }
      .action-stage {
        border: 1px solid var(--border);
        border-radius: 16px;
        background: #fbfcff;
        padding: 14px;
        display: grid;
        gap: 10px;
      }
      .action-stage.primary {
        background: linear-gradient(180deg, #f8f6ff, #ffffff);
        border-color: rgba(118, 103, 255, 0.16);
      }
      .action-stage-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .action-stage-kicker {
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .action-stage-title {
        font-size: 15px;
        font-weight: 800;
        color: var(--ink);
      }
      .action-stage-hint {
        font-size: 12px;
        line-height: 1.6;
        color: var(--muted);
      }
      .action-stage .actions {
        margin-top: 0;
      }
      .stage-chip {
        border-radius: 999px;
        padding: 5px 10px;
        font-size: 11px;
        font-weight: 700;
        border: 1px solid var(--border);
        background: #fff;
        color: var(--muted);
      }
      .stage-chip.ready {
        background: rgba(22, 163, 74, 0.08);
        border-color: rgba(22, 163, 74, 0.14);
        color: #15803d;
      }
      .stage-chip.warn {
        background: rgba(245, 158, 11, 0.12);
        border-color: rgba(245, 158, 11, 0.15);
        color: #b45309;
      }
      .support-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }
      .support-copy {
        font-size: 12px;
        line-height: 1.6;
        color: var(--muted);
      }
      .workflow-status {
        display: grid;
        gap: 4px;
      }
      .workflow-status-line {
        font-size: 13px;
        font-weight: 700;
        color: var(--ink);
      }
      .workflow-status-hint {
        font-size: 12px;
        line-height: 1.6;
        color: var(--muted);
      }
      .editor-meta {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .tiny-chip {
        border-radius: 999px;
        padding: 6px 10px;
        background: #f6f7fb;
        border: 1px solid var(--border);
        color: var(--muted);
        font-size: 11px;
        font-weight: 700;
      }
      .tiny-chip.ok {
        background: rgba(22, 163, 74, 0.08);
        border-color: rgba(22, 163, 74, 0.14);
        color: #15803d;
      }
      .tiny-chip.warn {
        background: rgba(245, 158, 11, 0.12);
        border-color: rgba(245, 158, 11, 0.15);
        color: #b45309;
      }
      .tiny-chip.busy {
        background: rgba(118, 103, 255, 0.12);
        border-color: rgba(118, 103, 255, 0.16);
        color: #6d56f5;
      }
      .storyboard-grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .story-scene {
        border-radius: 14px;
        border: 1px solid var(--border);
        background: #fbfcff;
        padding: 14px;
        display: grid;
        gap: 10px;
      }
      .scene-top {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
      }
      .scene-title {
        font-size: 13px;
        font-weight: 700;
      }
      .scene-duration {
        font-size: 11px;
        color: var(--muted);
        font-weight: 700;
      }
      .scene-visual {
        min-height: 96px;
        border-radius: 12px;
        border: 1px dashed #d8def0;
        background: linear-gradient(180deg, #f9fbff, #f3f6ff);
        padding: 14px;
        color: var(--ink);
        font-size: 12px;
      }
      .scene-caption {
        font-size: 12px;
        color: var(--muted);
      }
      .gate-checklist {
        display: grid;
        gap: 10px;
        margin-top: 12px;
      }
      .gate-check {
        display: grid;
        grid-template-columns: 22px minmax(0, 1fr);
        gap: 10px;
        align-items: start;
        padding: 12px;
        border-radius: 14px;
        border: 1px solid var(--border);
        background: #fff;
      }
      .gate-check.done {
        background: #f8fff9;
        border-color: rgba(22, 163, 74, 0.14);
      }
      .gate-check.pending {
        background: #fffaf2;
        border-color: rgba(245, 158, 11, 0.14);
      }
      .gate-check-icon {
        width: 22px;
        height: 22px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        font-size: 12px;
        font-weight: 800;
      }
      .gate-check.done .gate-check-icon {
        background: rgba(22, 163, 74, 0.12);
        color: #15803d;
      }
      .gate-check.pending .gate-check-icon {
        background: rgba(245, 158, 11, 0.12);
        color: #b45309;
      }
      .gate-check strong {
        display: block;
        margin-bottom: 4px;
        font-size: 13px;
        color: var(--ink);
      }
      .gate-check p {
        margin: 0;
        font-size: 12px;
        line-height: 1.6;
      }
      .progress-track {
        height: 8px;
        border-radius: 999px;
        background: #eceffd;
        overflow: hidden;
      }
      .progress-value {
        height: 100%;
        border-radius: 999px;
        background: linear-gradient(90deg, #7667ff, #8d80ff);
      }
      .status-pair {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      .status-box {
        padding: 12px;
        border-radius: 14px;
        border: 1px solid var(--border);
        background: #fff;
      }
      .status-box b {
        display: block;
        margin-bottom: 6px;
        font-size: 11px;
        color: var(--muted);
      }
      .status-box span {
        font-size: 22px;
        font-weight: 800;
        letter-spacing: -0.03em;
      }
      .quality-item,
      .event-item-compact,
      .gate-item,
      .asset-item {
        padding: 12px;
      }
      .quality-item.pass {
        border-color: #d9f0df;
        background: #f6fcf8;
      }
      .quality-item.warn {
        border-color: #f5e1b3;
        background: #fffaf0;
      }
      .preview-shell {
        display: grid;
        gap: 12px;
      }
      .preview-stage {
        border-radius: 20px;
        overflow: hidden;
        background: #0f1724;
        min-height: 220px;
        display: grid;
        place-items: center;
      }
      .preview-stage video {
        width: 100%;
        display: block;
        background: #000;
      }
      .preview-placeholder {
        padding: 24px;
        color: rgba(255,255,255,.82);
        text-align: center;
        font-size: 12px;
      }
      .preview-links {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      .preview-links a {
        color: var(--primary);
        font-weight: 700;
        text-decoration: none;
      }
      .mono-box {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
        font-size: 12px;
        color: #22324d;
      }
      .gate-panel {
        display: grid;
        gap: 12px;
      }
      .gate-card {
        padding: 14px;
        border-radius: 16px;
        background: #fff;
        border: 1px solid var(--border);
        box-shadow: var(--shadow);
      }
      .gate-score {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }
      .gate-score strong {
        font-size: 26px;
        line-height: 1;
      }
      .gate-badge {
        border-radius: 999px;
        padding: 5px 10px;
        background: #f5f7fb;
        font-size: 11px;
        font-weight: 700;
        color: var(--muted);
      }
      .gate-note {
        padding: 12px;
        border: 1px dashed #dde3f2;
        border-radius: 12px;
        color: var(--muted);
        font-size: 12px;
      }
      .gate-item strong,
      .asset-item strong {
        display: block;
        margin-bottom: 4px;
        font-size: 13px;
      }
      .gate-item p,
      .asset-item p {
        font-size: 12px;
      }
      .upload-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 42px;
        text-decoration: none;
      }
      .voice-reference-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 10px;
      }
      .inline-status {
        min-height: 20px;
        margin-top: 8px;
        font-size: 12px;
        font-weight: 700;
        color: var(--muted);
      }
      .inline-status.busy {
        color: #7c5cff;
      }
      .inline-status.success {
        color: #1d7f45;
      }
      .inline-status.warn {
        color: #c56a00;
      }
      button[disabled] {
        cursor: not-allowed;
        opacity: 0.68;
        box-shadow: none;
      }
      @media (max-width: 1120px) {
        .wizard-shell {
          grid-template-columns: 1fr;
        }
        .wizard-main {
          order: 1;
        }
        .wizard-flow {
          order: 2;
          border-right: 0;
          border-top: 1px solid var(--border);
        }
        .wizard-gate {
          order: 3;
          border-left: 0;
          border-top: 1px solid var(--border);
        }
      }
      @media (max-width: 900px) {
        .workflow-actions,
        .platform-grid,
        .auto-grid,
        .voice-preset-grid,
        .field-grid.workbench,
        .storyboard-grid,
        .status-pair {
          grid-template-columns: 1fr;
        }
        .main-topbar,
        .editor-tools {
          align-items: flex-start;
          flex-direction: column;
        }
      }
    `,
    body: `
      <section class="wizard-shell">
        <aside class="wizard-flow">
          <div class="flow-header">
            <div class="section-title">创作流水线</div>
            <div class="section-label">已完成 ${completedSteps}/${wizardSteps.length} 步</div>
            <div class="flow-progress-bar"><span></span></div>
          </div>
          <div class="step-rail">
            ${stepRailHtml}
          </div>
        </aside>

        <main class="wizard-main">
          <div class="main-topbar">
            <div class="main-title">
              <h2>${currentStepContent.title}</h2>
              <p>${currentStepContent.subtitle}</p>
            </div>
            <div class="nav-actions">
              ${
                previousStepId
                  ? `<a class="mini-ghost" id="prevStepBtn" href="${stepQueryHref(previousStepId)}">上一步</a>`
                  : `<span class="mini-ghost">上一步</span>`
              }
              <span class="submit-chip">提交验收</span>
            </div>
          </div>

          <section class="soft-card focus-banner">
            <span class="focus-pill">本步目标</span>
            <strong>${currentStepContent.goalTitle}</strong>
            <p>${currentStepContent.goalText}</p>
            <p>${currentStepContent.goalHint}</p>
          </section>

          <section class="card editor-card">
              <div class="panel-title">${isAssetIntakeStep ? "脚本输入与自动抽取" : "脚本编辑器"}</div>
              <div class="editor-meta">
                <span class="tiny-chip" id="currentTaskChip">暂无任务</span>
                <span class="tiny-chip" id="currentModeChip">纯文本</span>
                <span class="tiny-chip" id="currentProfileChip">标准</span>
                <span class="tiny-chip" id="heroStatus">可提交</span>
              </div>
              ${
                isAssetIntakeStep
                  ? `
              <div class="script-intake-layout">
                <div class="script-paste-box">
                  <label class="tip-label" for="scriptText">短视频脚本 <span class="tip-icon" data-tip="直接粘贴完整脚本即可。系统会自动尝试提取标题、开场抓手、摘要、总时长，以及每一段要说什么和建议画面。">?</span></label>
                  <input id="platform" type="hidden" value="douyin" />
                  <input id="scriptMode" type="hidden" value="plain_text" />
                  <input id="voiceMode" type="hidden" value="male_coach_deep" />
                  <input id="ttsProviderId" type="hidden" value="${defaultVoiceProvider.id}" />
                  <textarea id="scriptText" placeholder="在这里直接粘贴你的短视频脚本。建议包含：标题、开场抓手、摘要、总时长、分段内容、行动引导。"></textarea>
                  <div class="micro-copy">支持自然语言脚本，也支持接近 JSON / Markdown 的结构化脚本。脚本模式将自动识别，无需手动选择。</div>
                </div>

                <div class="field">
                  <label class="tip-label">发布平台 <span class="tip-icon" data-tip="这里不是单选。一次勾选多个平台后，后续会按平台分别输出适配的视频规格和发布信息。">?</span></label>
                  <div class="platform-grid">
                    <label class="check-card"><input type="checkbox" id="platformWechat" checked /><span>微信视频号</span></label>
                    <label class="check-card"><input type="checkbox" id="platformXiaohongshu" checked /><span>小红书</span></label>
                    <label class="check-card"><input type="checkbox" id="platformDouyin" checked /><span>抖音</span></label>
                    <label class="check-card"><input type="checkbox" id="platformBilibili" /><span>B站</span></label>
                  </div>
                </div>

                <div class="auto-grid">
                  <div class="auto-card">
                    <b>自动提取标题</b>
                    <strong id="derivedTitle">等待脚本解析</strong>
                  </div>
                  <div class="auto-card">
                    <b>自动提取开场抓手</b>
                    <strong id="derivedHook">等待脚本解析</strong>
                  </div>
                  <div class="auto-card">
                    <b>自动提取摘要</b>
                    <strong id="derivedSummary">等待脚本解析</strong>
                  </div>
                  <div class="auto-card">
                    <b>自动提取总时长</b>
                    <strong id="derivedDuration">等待脚本解析</strong>
                  </div>
                </div>

                <div class="field">
                  <label class="tip-label">自动识别分段 <span class="tip-icon" data-tip="系统会把脚本拆成若干内容段，每一段都会给出这一段要说什么、建议画面和建议时长，供下一步分镜确认直接使用。">?</span></label>
                  <div class="scene-outline" id="sceneOutline">
                    <div class="summary-item empty">粘贴脚本后，这里会自动生成分段草稿。</div>
                  </div>
                </div>

                <details class="advanced-config">
                  <summary>
                    <div class="advanced-config-title">
                      <strong>高级设置</strong>
                      <span>默认情况下你不用改这里。只有当你要微调作者、渲染档位、画面风格或任务归属时，再展开查看。</span>
                    </div>
                    <span class="advanced-config-caret">展开查看</span>
                  </summary>
                  <div class="advanced-config-body">
                    <div class="field-grid workbench">
                      <div class="field compact">
                        <label class="tip-label" for="author">作者 <span class="tip-icon" data-tip="用于写入元数据和产物归属，不会直接影响镜头内容。">?</span></label>
                        <input id="author" value="John" />
                      </div>
                      <div class="field compact">
                        <label class="tip-label" for="renderProfile">渲染档位 <span class="tip-icon" data-tip="标准档位用于日常生产；高质量档位适合正式发布；草稿档位用于快速预览。">?</span></label>
                        <select id="renderProfile">
                          <option value="draft">草稿</option>
                          <option value="standard" selected>标准</option>
                          <option value="high_quality">高质量</option>
                        </select>
                      </div>
                      <div class="field compact">
                        <label class="tip-label" for="stylePreset">画面风格 <span class="tip-icon" data-tip="这里决定整条视频的整体视觉方向，包括构图、字幕安全区、人物画风和画面氛围。">?</span></label>
                        <select id="stylePreset">
                          <option value="john_vertical_comic" selected>John 竖屏讲解风格</option>
                        </select>
                      </div>
                      <div class="field compact">
                        <label class="tip-label" for="personaPreset">主角形象 <span class="tip-icon" data-tip="用于锁定主角身份和形象连续性，保证不同场景里看到的都是同一个 John。">?</span></label>
                        <select id="personaPreset">
                          <option value="john_persona_v1" selected>John 专属人物形象</option>
                        </select>
                      </div>
                      <div class="field compact">
                        <label class="tip-label" for="ownerToken">任务归属标签 <span class="tip-icon" data-tip="用于标记这条任务属于哪个创作工作流或创作者，系统也会用它辅助任务去重。">?</span></label>
                        <input id="ownerToken" value="john-ai-lab" placeholder="例如：john-content-studio" />
                      </div>
                      <div class="field compact">
                        <label class="tip-label" for="title">备用标题 <span class="tip-icon" data-tip="只有在脚本自动抽取标题失败时，系统才会回退使用这里的标题。大多数情况下无需手动填写。">?</span></label>
                        <input id="title" placeholder="如果自动抽取失败，可在这里补充标题" />
                      </div>
                    </div>
                  </div>
                </details>

                ${
                  isAssetIntakeStep
                    ? `
                <div class="field full">
                  <label class="tip-label">声音方案摘要 <span class="tip-icon" data-tip="素材收集阶段只需要确认你准备使用哪一类声音。完整试听、录音、应用操作放到第 4 步“声音应用”里完成。">?</span></label>
                  <div class="auto-grid">
                    <div class="auto-card">
                      <b>当前声音方案</b>
                      <strong id="activeVoiceModeLabel">男声教练沉稳</strong>
                    </div>
                    <div class="auto-card">
                      <b>当前 TTS 路线</b>
                      <strong id="assetVoiceRouteLabel">默认中文解说路线</strong>
                    </div>
                    <div class="auto-card">
                      <b>自定义声音参考</b>
                      <strong id="activeVoiceReferenceLabel">未使用自定义参考</strong>
                    </div>
                  </div>
                  <div class="hint">现在先确认脚本结构是否正确，并知道后面准备走哪条声音路线。试听、录音、应用声音都在第 4 步完成。</div>
                </div>
                    `
                    : ""
                }

                ${
                  isVoiceGenerationStep
                    ? `
                <div class="field">
                  <label class="tip-label">声音方案 <span class="tip-icon" data-tip="先试听，再点应用该声音。也可以输入你自己的参考音频并应用为本次任务音色。">?</span></label>
                  <div class="provider-strategy-grid">
                    ${ttsProviderStrategyCardsHtml}
                  </div>
                  <div class="route-behavior-panel">
                    <strong id="routeBehaviorTitle">当前路线：第一阶段默认主链路</strong>
                    <div class="route-behavior-note" id="routeBehaviorNote">这条路线适合当前本地工作台：可以边试听边确认，确认自然度后再进入任务创建。</div>
                    <div class="route-behavior-list" id="routeBehaviorList">
                      <div class="route-behavior-item">试听策略：当前可以直接在页面里试听，适合快速判断声音风格。</div>
                      <div class="route-behavior-item">产线定位：适合第一阶段默认生产主链路，也支持自定义参考音频克隆。</div>
                      <div class="route-behavior-item">部署建议：既适合本地，也能作为云端异步 worker。</div>
                    </div>
                  </div>
                  <div class="field compact" style="margin-bottom:12px">
                    <label class="tip-label" for="ttsProviderIdVisible">TTS 引擎 <span class="tip-icon" data-tip="这里决定最终任务优先走哪套 TTS provider。你可以按自然度、是否支持克隆、以及是否要考虑云端 SaaS 部署来切换。">?</span></label>
                    <select id="ttsProviderIdVisible">${ttsProviderSelectOptionsHtml}</select>
                  </div>
                  <div class="voice-preset-grid">
                    ${voicePresetCardsHtml}
                  </div>
                  <div class="inline-status" id="presetVoiceStatus">当前已应用：${defaultVoicePreset.chineseLabel}</div>
                </div>

                <div class="field full">
                  <label class="tip-label" for="customVoiceReference">录入你自己的声音 <span class="tip-icon" data-tip="上传或录入你自己的声音参考后，可以直接应用为本次任务的自定义音色，并通过试听先确认效果。">?</span></label>
                  <input id="customVoiceReference" placeholder="上传或录音后自动回填文件名" readonly />
                  <div class="voice-reference-actions">
                    <label class="secondary upload-button" for="customVoiceFile">上传声音文件</label>
                    <input id="customVoiceFile" type="file" accept="audio/*" hidden />
                    <button type="button" class="secondary" id="recordVoiceBtn">开始录音</button>
                    <button type="button" class="secondary" id="stopRecordVoiceBtn" disabled>停止录音</button>
                    <button type="button" class="primary" id="applyCustomVoiceBtn">应用我的声音</button>
                    <button type="button" class="secondary" id="previewCustomVoiceBtn">试听我的声音</button>
                  </div>
                  <div class="inline-status" id="customVoiceStatus">上传或录音后，可应用为本次任务音色。</div>
                  <div class="hint">${customVoiceAuthorizationNotice}</div>
                </div>
                    `
                    : ""
                }
              </div>
                  `
                  : isVoiceGenerationStep
                    ? `
              <div class="field-grid workbench">
                <input id="platform" type="hidden" value="douyin" />
                <input id="scriptMode" type="hidden" value="plain_text" />
                <input id="voiceMode" type="hidden" value="male_coach_deep" />
                <input id="ttsProviderId" type="hidden" value="${defaultVoiceProvider.id}" />
                <div class="field compact">
                  <label for="title">标题</label>
                  <input id="title" placeholder="例如：AI 如何让研发效率提升 3 倍" />
                </div>
                <div class="field compact">
                  <label for="author">作者</label>
                  <input id="author" value="John" />
                </div>
                <div class="field compact">
                  <label for="renderProfile">渲染档位</label>
                  <select id="renderProfile">
                    <option value="draft">草稿</option>
                    <option value="standard" selected>标准</option>
                    <option value="high_quality">高质量</option>
                  </select>
                </div>
                <div class="field compact">
                  <label for="stylePreset">画面风格</label>
                  <select id="stylePreset">
                    <option value="john_vertical_comic" selected>John 竖屏讲解风格</option>
                  </select>
                </div>
                <div class="field compact">
                  <label for="personaPreset">主角形象</label>
                  <select id="personaPreset">
                    <option value="john_persona_v1" selected>John 专属人物形象</option>
                  </select>
                </div>
                <div class="field compact">
                  <label for="ownerToken">任务归属标签</label>
                  <input id="ownerToken" placeholder="例如：john-content-studio" />
                </div>
                <div class="field full">
                  <label for="scriptText">脚本文本</label>
                  <textarea id="scriptText" placeholder="这里保留脚本全文，方便你在应用声音时仍能对照内容。"></textarea>
                </div>

                <div class="field full">
                  <label class="tip-label">声音方案 <span class="tip-icon" data-tip="完整试听、应用、录音、自定义声音操作都集中在这一步完成。">?</span></label>
                  <div class="provider-strategy-grid">
                    ${ttsProviderStrategyCardsHtml}
                  </div>
                  <div class="route-behavior-panel">
                    <strong id="routeBehaviorTitle">当前路线：第一阶段默认主链路</strong>
                    <div class="route-behavior-note" id="routeBehaviorNote">这条路线适合当前本地工作台：可以边试听边确认，确认自然度后再进入任务创建。</div>
                    <div class="route-behavior-list" id="routeBehaviorList">
                      <div class="route-behavior-item">试听策略：当前可以直接在页面里试听，适合快速判断声音风格。</div>
                      <div class="route-behavior-item">产线定位：适合第一阶段默认生产主链路，也支持自定义参考音频克隆。</div>
                      <div class="route-behavior-item">部署建议：既适合本地，也能作为云端异步 worker。</div>
                    </div>
                  </div>
                  <div class="field compact" style="margin-bottom:12px">
                    <label class="tip-label" for="ttsProviderIdVisible">TTS 引擎 <span class="tip-icon" data-tip="这里决定最终任务优先走哪套 TTS provider。你可以按自然度、是否支持克隆、以及是否要考虑云端 SaaS 部署来切换。">?</span></label>
                    <select id="ttsProviderIdVisible">${ttsProviderSelectOptionsHtml}</select>
                  </div>
                  <div class="voice-preset-grid">
                    ${voicePresetCardsHtml}
                  </div>
                  <div class="inline-status" id="presetVoiceStatus">当前已应用：${defaultVoicePreset.chineseLabel}</div>
                  <div class="hint">默认推荐使用 ${defaultVoiceProvider.displayName} 跑中文解说；如果后续做云端 SaaS 重度生产，可优先考虑 ${getTtsProviderProfile("f5-tts").displayName} 作为高拟真方案，${getTtsProviderProfile("melotts").displayName} 作为低成本备用方案。</div>
                </div>

                <div class="field full">
                  <label class="tip-label" for="customVoiceReference">录入你自己的声音 <span class="tip-icon" data-tip="上传或录入你自己的声音参考后，可以直接应用为本次任务的自定义音色，并通过试听先确认效果。">?</span></label>
                  <input id="customVoiceReference" placeholder="上传或录音后自动回填文件名" readonly />
                  <div class="voice-reference-actions">
                    <label class="secondary upload-button" for="customVoiceFile">上传声音文件</label>
                    <input id="customVoiceFile" type="file" accept="audio/*" hidden />
                    <button type="button" class="secondary" id="recordVoiceBtn">开始录音</button>
                    <button type="button" class="secondary" id="stopRecordVoiceBtn" disabled>停止录音</button>
                    <button type="button" class="primary" id="applyCustomVoiceBtn">应用我的声音</button>
                    <button type="button" class="secondary" id="previewCustomVoiceBtn">试听我的声音</button>
                  </div>
                  <div class="inline-status" id="customVoiceStatus">上传或录音后，可应用为本次任务音色。</div>
                  <div class="hint">${customVoiceAuthorizationNotice}</div>
                </div>
              </div>
                    `
                    : `
              <div class="field-grid workbench">
                <div class="field compact">
                  <label for="title">标题</label>
                  <input id="title" placeholder="例如：AI 如何让研发效率提升 3 倍" />
                </div>
                <div class="field compact">
                  <label for="author">作者</label>
                  <input id="author" value="John" />
                </div>
                <div class="field compact">
                  <label for="renderProfile">渲染档位</label>
                  <select id="renderProfile">
                    <option value="draft">草稿</option>
                    <option value="standard" selected>标准</option>
                    <option value="high_quality">高质量</option>
                  </select>
                </div>
                <div class="field compact">
                  <label for="stylePreset">画面风格</label>
                  <select id="stylePreset">
                    <option value="john_vertical_comic" selected>John 竖屏讲解风格</option>
                  </select>
                </div>
                <div class="field compact">
                  <label for="personaPreset">主角形象</label>
                  <select id="personaPreset">
                    <option value="john_persona_v1" selected>John 专属人物形象</option>
                  </select>
                </div>
                <div class="field compact">
                  <label for="ownerToken">任务归属标签</label>
                  <input id="ownerToken" placeholder="例如：john-content-studio" />
                </div>
                <div class="field full">
                  <label for="scriptText">脚本文本</label>
                  <textarea id="scriptText" placeholder="在这里输入你的脚本、Markdown 场景或者段落文本。"></textarea>
                </div>
              </div>
                  `
              }

              <div class="editor-tools">
                <div class="workflow-actions">
                  <section class="action-stage primary">
                    <div class="action-stage-head">
                      <div>
                        <div class="action-stage-kicker">第 1 步</div>
                        <div class="action-stage-title">先校验脚本草稿</div>
                      </div>
                      <span class="stage-chip warn" id="validateStageChip">等待校验</span>
                    </div>
                    <div class="action-stage-hint">先让系统确认脚本结构完整、分段可读、可以进入分镜预览。校验通过后，再进入创建任务。</div>
                    <div class="actions">
                      <button class="primary" id="validateBtn">开始校验</button>
                    </div>
                  </section>
                  <section class="action-stage">
                    <div class="action-stage-head">
                      <div>
                        <div class="action-stage-kicker">第 2 步</div>
                        <div class="action-stage-title">再创建视频任务</div>
                      </div>
                      <span class="stage-chip warn" id="createStageChip">等待校验通过</span>
                    </div>
                    <div class="action-stage-hint">只有脚本通过校验后，才建议创建任务并开始 SSE 进度追踪与视频产物生成。</div>
                    <div class="actions">
                      <button class="secondary" id="createJobBtn" disabled>创建任务</button>
                    </div>
                  </section>
                </div>
                <div class="support-actions">
                  <div class="support-copy">想快速看完整流程时，可先载入演示内容，再按“先校验、后创建”的顺序走一遍。</div>
                  <div class="actions">
                    <button class="secondary" id="loadDemoBtn">载入演示内容</button>
                  </div>
                </div>
                <div class="workflow-status">
                  <span id="status" class="workflow-status-line">等待输入脚本</span>
                  <span id="statusHint" class="workflow-status-hint">先粘贴脚本或载入演示内容，再执行第 1 步校验。</span>
                </div>
              </div>
          </section>

          <section class="card storyboard-card" style="margin-top:14px">
              <div class="panel-title">分镜预览</div>
              <p>这里显示脚本拆分后的场景预览，帮助你在创建任务前先理解节奏和镜头意图。先完成校验，就能即时看到结构化分镜结果。</p>
              <div class="storyboard-grid" id="storyboardGrid">
                <div class="summary-item empty">先校验草稿，再生成分镜预览。</div>
              </div>
          </section>
        </main>

        <aside class="wizard-gate">
          <div class="gate-panel">
            <section class="gate-card">
              <div class="panel-title" id="overviewPanelTitle">当前草稿概览</div>
              <div class="gate-score">
                <strong><span id="qualityScore">--</span> <small id="qualityScoreSuffix" style="font-size:13px;color:var(--muted)">/100</small></strong>
                <span class="gate-badge" id="gateBadge">待提交</span>
              </div>
              <div class="progress-track"><div class="progress-value" id="progressValue" style="width:0%"></div></div>
              <div class="status-pair" style="margin-top:12px">
                <div class="status-box"><b id="estimatedScenesLabel">预估场景数</b><span id="estimatedScenes">0</span></div>
                <div class="status-box"><b id="scriptCharactersLabel">字数</b><span id="scriptCharacters">0</span></div>
              </div>
            </section>

            <section class="gate-card">
              <div class="panel-title" id="focusPanelTitle">当前这一步重点</div>
              <div class="gate-note" id="focusPanelNote">素材收集阶段先关注：脚本是否完整、场景拆分是否顺、声音方案是否选对。任务创建后，右侧才重点显示进度、预览和产物质量。</div>
              <div class="mini-section-title">当前门槛</div>
              <div class="gate-checklist" id="gateChecklist"></div>
              <div class="mini-section-title">当前已完成</div>
              <div class="quality-list" id="summaryList"></div>
              <div class="error-list" id="errorList"></div>
            </section>

            <section class="gate-card">
              <div class="panel-title" id="selectedPlanPanelTitle">当前已选方案</div>
              <div class="asset-list">
                <div class="asset-item">
                  <strong>当前声音方案</strong>
                  <p id="activeVoiceModeLabel">男声教练沉稳</p>
                </div>
                <div class="asset-item">
                  <strong>当前声音引擎</strong>
                  <p id="activeVoiceProviderLabel">${defaultVoiceProvider.displayName} · ${defaultVoiceProvider.deploymentMode === "hybrid" ? "本地与云端都可落地" : defaultVoiceProvider.deploymentMode === "cloud_ready" ? "适合云端 SaaS" : "更适合本地工作站"}</p>
                </div>
                <div class="asset-item">
                  <strong>当前路线定位</strong>
                  <p id="activeVoiceRoleLabel">${defaultVoiceProvider.recommendedRoleLabel}</p>
                </div>
                <div class="asset-item">
                  <strong>当前 TTS 路线</strong>
                  <p id="activeTtsRouteLabel">默认推荐路线</p>
                </div>
                <div class="asset-item">
                  <strong>当前试听体验</strong>
                  <p id="activeVoicePreviewCapabilityLabel">${defaultVoiceProvider.previewExperienceLabel}</p>
                </div>
                <div class="asset-item">
                  <strong>当前 SaaS 适配</strong>
                  <p id="activeVoiceSaasFitLabel">${defaultVoiceProvider.saasFitLabel}</p>
                </div>
                <div class="asset-item">
                  <strong>当前声音参考</strong>
                  <p id="activeVoiceReferenceLabel">未使用自定义参考</p>
                </div>
                <div class="asset-item">
                  <strong>当前画面风格</strong>
                  <p>John 竖屏讲解风格</p>
                </div>
              </div>
            </section>

            <section class="gate-card">
              <div class="panel-title" id="nextGatePanelTitle">下一步 Gate 要求</div>
              <div class="gate-list" id="nextGateList">
                <div class="gate-item"><strong>内容已保存</strong><p>草稿通过基础校验，字段完整。</p></div>
                <div class="gate-item"><strong>结构评分 &gt; 70</strong><p>场景拆分合理，文案足以进入分镜确认。</p></div>
                <div class="gate-item"><strong>产物可继续生成</strong><p>创建任务后可跟踪 SSE，并最终看到 MP4 预览。</p></div>
              </div>
            </section>

            <section class="gate-card status-card">
              <div class="panel-title">任务进度</div>
              <div class="status-pair">
                <div class="status-box"><b>任务状态</b><span id="jobStateChip" style="font-size:14px">空闲</span></div>
                <div class="status-box"><b>当前步骤</b><span id="jobStepChip" style="font-size:14px">暂无步骤</span></div>
              </div>
              <div class="job-events" id="jobEvents">
                <div class="event-item-compact">这里只保留最新几条关键进度，不再堆满所有试听和录音操作。</div>
              </div>
              <div class="summary-item">
                <b style="display:block;margin-bottom:8px">当前任务摘要</b>
                <div class="quality-list" id="jobReadableSnapshot">
                  <div class="summary-item empty">创建任务后，这里会用大白话展示当前阶段、TTS 引擎、声音模式和关键进度。</div>
                </div>
              </div>
              <div class="summary-item">
                <b style="display:block;margin-bottom:8px">原始任务快照</b>
                <pre id="jobStatus" class="mono-box empty">尚未创建任务。</pre>
              </div>
            </section>

            <section class="gate-card">
              <div class="panel-title">预览面板</div>
              <div class="preview-shell">
                <div class="preview-stage" id="previewStage">
                  <div class="preview-placeholder">当前还没有完成的 MP4。渲染结束后，这里会出现播放器和下载链接。</div>
                </div>
                <div class="preview-links" id="previewLinks"></div>
                <div class="summary-item">
                  <div class="mini-section-title" id="artifactSupportNote">当前还没进入产物验收阶段，等任务创建后再看质量、成本和预览结果。</div>
                </div>
                <div class="summary-item artifact-section" id="jobQualitySection">
                  <b style="display:block;margin-bottom:8px">产物质量摘要</b>
                  <div class="quality-list" id="jobQualitySummary">
                  <div class="summary-item empty">任务完成后，这里会显示文件大小、时长、分辨率、音频、字幕、备用渲染与合规状态。</div>
                  </div>
                </div>
                <div class="summary-item artifact-section" id="jobCostSection">
                  <b style="display:block;margin-bottom:8px">成本估算</b>
                  <div class="quality-list" id="jobCostSummary">
                    <div class="summary-item empty">创建任务后，这里会显示图像、TTS 和总成本估算。</div>
                  </div>
                </div>
                <div class="summary-item artifact-section" id="jobTtsStrategySection">
                  <b style="display:block;margin-bottom:8px">声音策略摘要</b>
                  <div class="quality-list" id="jobTtsStrategySummary">
                    <div class="summary-item empty">创建任务后，这里会显示当前任务使用的声音模式、TTS 引擎、克隆方式和部署策略。</div>
                  </div>
                </div>
                <div class="summary-item artifact-section" id="jobRouteOutcomeSection">
                  <b style="display:block;margin-bottom:8px">结果解读建议</b>
                  <div class="quality-list" id="jobRouteOutcomeSummary">
                    <div class="summary-item empty">任务完成后，这里会按当前 TTS 路线解释质量重点、成本理解方式和验收优先级。</div>
                  </div>
                </div>
                <div class="summary-item artifact-section" id="jobResilienceSection">
                  <b style="display:block;margin-bottom:8px">兜底与重跑建议</b>
                  <div class="quality-list" id="jobResilienceSummary">
                    <div class="summary-item empty">任务完成后，这里会解释当前产物是否来自 fallback、该如何判断是否需要重跑。</div>
                  </div>
                </div>
                <div class="summary-item">
                  <b style="display:block;margin-bottom:8px">标准化草稿 JSON</b>
                  <pre id="draftJson" class="mono-box empty">当前还没有有效草稿。</pre>
                </div>
              </div>
            </section>
          </div>
        </aside>
      </section>

      <script>
        const ids = ["title", "author", "platform", "renderProfile", "scriptMode", "stylePreset", "personaPreset", "voiceMode", "ttsProviderId", "ownerToken", "customVoiceReference", "scriptText"];
        const statusEl = document.getElementById("status");
        const statusHintEl = document.getElementById("statusHint");
        const summaryList = document.getElementById("summaryList");
        const errorList = document.getElementById("errorList");
        const draftJson = document.getElementById("draftJson");
        const jobStatus = document.getElementById("jobStatus");
        const jobReadableSnapshot = document.getElementById("jobReadableSnapshot");
        const estimatedScenes = document.getElementById("estimatedScenes");
        const scriptCharacters = document.getElementById("scriptCharacters");
        const qualityScore = document.getElementById("qualityScore");
        const storyboardGrid = document.getElementById("storyboardGrid");
        const derivedTitle = document.getElementById("derivedTitle");
        const derivedHook = document.getElementById("derivedHook");
        const derivedSummary = document.getElementById("derivedSummary");
        const derivedDuration = document.getElementById("derivedDuration");
        const sceneOutline = document.getElementById("sceneOutline");
        const platformWechat = document.getElementById("platformWechat");
        const platformXiaohongshu = document.getElementById("platformXiaohongshu");
        const platformDouyin = document.getElementById("platformDouyin");
        const platformBilibili = document.getElementById("platformBilibili");
        const previewStage = document.getElementById("previewStage");
        const previewLinks = document.getElementById("previewLinks");
        const jobQualitySummary = document.getElementById("jobQualitySummary");
        const jobCostSummary = document.getElementById("jobCostSummary");
        const jobTtsStrategySummary = document.getElementById("jobTtsStrategySummary");
        const jobRouteOutcomeSummary = document.getElementById("jobRouteOutcomeSummary");
        const jobResilienceSummary = document.getElementById("jobResilienceSummary");
        const progressValue = document.getElementById("progressValue");
        const jobStateChip = document.getElementById("jobStateChip");
        const jobStepChip = document.getElementById("jobStepChip");
        const jobEvents = document.getElementById("jobEvents");
        const currentTaskChip = document.getElementById("currentTaskChip");
        const currentModeChip = document.getElementById("currentModeChip");
        const currentProfileChip = document.getElementById("currentProfileChip");
        const heroStatus = document.getElementById("heroStatus");
        const ttsProviderSelect = document.getElementById("ttsProviderIdVisible");
        const customVoiceReferenceInput = document.getElementById("customVoiceReference");
        const customVoiceFileInput = document.getElementById("customVoiceFile");
        const recordVoiceBtn = document.getElementById("recordVoiceBtn");
        const stopRecordVoiceBtn = document.getElementById("stopRecordVoiceBtn");
        const applyCustomVoiceBtn = document.getElementById("applyCustomVoiceBtn");
        const previewCustomVoiceBtn = document.getElementById("previewCustomVoiceBtn");
        const presetVoiceStatus = document.getElementById("presetVoiceStatus");
        const customVoiceStatus = document.getElementById("customVoiceStatus");
        const routeBehaviorTitle = document.getElementById("routeBehaviorTitle");
        const routeBehaviorNote = document.getElementById("routeBehaviorNote");
        const routeBehaviorList = document.getElementById("routeBehaviorList");
        const validateBtn = document.getElementById("validateBtn");
        const createJobBtn = document.getElementById("createJobBtn");
        const loadDemoBtn = document.getElementById("loadDemoBtn");
        const validateStageChip = document.getElementById("validateStageChip");
        const createStageChip = document.getElementById("createStageChip");
        const advancedConfig = document.querySelector(".advanced-config");
        const activeVoiceModeLabel = document.getElementById("activeVoiceModeLabel");
        const activeVoiceProviderLabel = document.getElementById("activeVoiceProviderLabel");
        const activeVoiceRoleLabel = document.getElementById("activeVoiceRoleLabel");
        const assetVoiceRouteLabel = document.getElementById("assetVoiceRouteLabel");
        const activeTtsRouteLabel = document.getElementById("activeTtsRouteLabel");
        const activeVoicePreviewCapabilityLabel = document.getElementById("activeVoicePreviewCapabilityLabel");
        const activeVoiceSaasFitLabel = document.getElementById("activeVoiceSaasFitLabel");
        const activeVoiceReferenceLabel = document.getElementById("activeVoiceReferenceLabel");
        const overviewPanelTitle = document.getElementById("overviewPanelTitle");
        const qualityScoreSuffix = document.getElementById("qualityScoreSuffix");
        const gateBadge = document.getElementById("gateBadge");
        const estimatedScenesLabel = document.getElementById("estimatedScenesLabel");
        const scriptCharactersLabel = document.getElementById("scriptCharactersLabel");
        const focusPanelTitle = document.getElementById("focusPanelTitle");
        const focusPanelNote = document.getElementById("focusPanelNote");
        const gateChecklist = document.getElementById("gateChecklist");
        const artifactSupportNote = document.getElementById("artifactSupportNote");
        const jobQualitySection = document.getElementById("jobQualitySection");
        const jobCostSection = document.getElementById("jobCostSection");
        const jobTtsStrategySection = document.getElementById("jobTtsStrategySection");
        const jobRouteOutcomeSection = document.getElementById("jobRouteOutcomeSection");
        const jobResilienceSection = document.getElementById("jobResilienceSection");
        const selectedPlanPanelTitle = document.getElementById("selectedPlanPanelTitle");
        const nextGatePanelTitle = document.getElementById("nextGatePanelTitle");
        const nextGateList = document.getElementById("nextGateList");
        const voicePreviewPlayer = new Audio();
        const DRAFT_STORAGE_KEY = "video_ops_wizard_draft_v1";
        const CURRENT_STEP_ID = ${JSON.stringify(currentStepId)};
        let activeRecorder = null;
        let recorderStream = null;
        let recorderChunks = [];
        let activeEventSource = null;
        let currentJobId = "";

        function syncAdvancedConfigLabel() {
          if (!advancedConfig) return;
          const caret = advancedConfig.querySelector(".advanced-config-caret");
          if (!caret) return;
          caret.textContent = advancedConfig.hasAttribute("open") ? "收起设置" : "展开查看";
        }

        advancedConfig?.addEventListener("toggle", syncAdvancedConfigLabel);
        syncAdvancedConfigLabel();
        setCreateJobAvailability(false);
        syncGateAssistant("waiting_input");
        syncArtifactPanels();

        function clientProfileLabel(value) {
          if (value === "draft") return "草稿";
          if (value === "high_quality") return "高质量";
          return "标准";
        }

        function clientScriptModeLabel(value) {
          return value === "markdown" ? "Markdown" : "纯文本";
        }

        function clientVoiceModeLabel(value) {
          if (value === "male_coach_deep") return "男声教练沉稳";
          if (value === "male_clear_teacher") return "男声老师清晰";
          if (value === "female_warm_narrator") return "女声旁白温和";
          if (value === "female_energetic_creator") return "女声创作者活力";
          if (value === "male_storytelling_soft") return "男声叙事柔和";
          if (value === "custom_reference") return "自定义声音";
          return "未选择";
        }

        function clientVoiceProviderLabel(value) {
          const providerMap = {
            male_coach_deep: "CosyVoice MLX · 本地与云端都可落地",
            male_clear_teacher: "CosyVoice MLX · 本地与云端都可落地",
            female_warm_narrator: "CosyVoice MLX · 本地与云端都可落地",
            female_energetic_creator: "F5-TTS · 适合云端 SaaS",
            male_storytelling_soft: "MeloTTS · 适合作为低成本 fallback",
            custom_reference: "CosyVoice MLX · 支持参考音频克隆",
          };

          return providerMap[value] || "未设置";
        }

        function clientTtsProviderDisplay(value) {
          const providerMap = {
            "cosyvoice-mlx": "CosyVoice MLX · 本地与云端都可落地",
            "f5-tts": "F5-TTS · 适合云端 SaaS",
            melotts: "MeloTTS · 适合作为低成本 fallback",
          };

          return providerMap[value] || "未设置";
        }

        function clientTtsProviderRole(value) {
          const roleMap = {
            "cosyvoice-mlx": "第一阶段默认主链路",
            "f5-tts": "高拟真正式产线",
            melotts: "低成本兜底路线",
          };

          return roleMap[value] || "未设置";
        }

        function clientTtsPreviewCapability(value) {
          const capabilityMap = {
            "cosyvoice-mlx": "支持边调边试听，适合当前本地工作台快速确认声音",
            "f5-tts": "更适合批量生成后再听结果，不以实时试听为强项",
            melotts: "更适合快速出结果，不适合作为最终高拟真试听标准",
          };

          return capabilityMap[value] || "未设置";
        }

        function clientTtsSaasFit(value) {
          const fitMap = {
            "cosyvoice-mlx": "适合作为云端异步 TTS worker，也适合当前本地生产",
            "f5-tts": "适合独立 GPU / 容器部署，优先面向云端 SaaS 重度生产",
            melotts: "适合成本敏感型 SaaS 场景或 fallback 节点",
          };

          return fitMap[value] || "未设置";
        }

        function getRouteBehaviorConfig(providerId, voiceMode) {
          if (voiceMode === "custom_reference") {
            return {
              title: "当前路线：自定义声音克隆路线",
              note: "当前会优先保证参考音频可用和音色一致性。先上传并确认你的声音，再进入任务创建。",
              items: [
                "试听策略：优先试听你上传的参考声音，确认音色方向是否正确。",
                "产线定位：适合需要保留本人辨识度的视频，不建议在参考音频不稳定时直接量产。",
                "部署建议：当前默认走 CosyVoice MLX，自定义音色确认后再进入正式生产最稳。 ",
              ],
              previewAllowed: true,
              previewButtonText: "试听我的声音",
            };
          }

          if (providerId === "f5-tts") {
            return {
              title: "当前路线：高拟真正式产线",
              note: "这条路线更适合正式生产和后续云端 SaaS，而不是当前页面里的高频即时试听。建议先应用方案，再通过任务结果做整体验收。",
              items: [
                "试听策略：不强调即时试听，重点是生成后听最终产物表现。",
                "产线定位：适合高拟真正式发布视频，优先保证成品自然度。",
                "部署建议：更适合独立 GPU / 容器生产环境，适合作为后续 SaaS 主引擎。",
              ],
              previewAllowed: false,
              previewButtonText: "正式产线不建议直接试听",
            };
          }

          if (providerId === "melotts") {
            return {
              title: "当前路线：低成本兜底路线",
              note: "这条路线适合快速预览、fallback 或成本敏感场景，不建议作为最终高拟真验收标准。",
              items: [
                "试听策略：可以试听，但主要用于快速判断节奏，不代表最终自然度上限。",
                "产线定位：适合低成本批量出样或主链路失败时兜底。",
                "部署建议：适合作为成本敏感型 SaaS 节点，不建议承担高拟真主产线。",
              ],
              previewAllowed: true,
              previewButtonText: "试听",
            };
          }

          return {
            title: "当前路线：第一阶段默认主链路",
            note: "这条路线适合当前本地工作台：可以边试听边确认，确认自然度后再进入任务创建。",
            items: [
              "试听策略：当前可以直接在页面里试听，适合快速判断声音风格。",
              "产线定位：适合第一阶段默认生产主链路，也支持自定义参考音频克隆。",
              "部署建议：既适合本地，也能作为云端异步 worker。",
            ],
            previewAllowed: true,
            previewButtonText: "试听",
          };
        }

        function clientTtsRouteLabel(providerId, voiceMode) {
          if (voiceMode === "custom_reference") {
            return "自定义声音克隆路线";
          }
          if (providerId === "f5-tts") {
            return "高拟真 SaaS 生产路线";
          }
          if (providerId === "melotts") {
            return "低成本批量兜底路线";
          }
          if (providerId === "cosyvoice-mlx") {
            return "默认中文解说路线";
          }
          return "未设置";
        }

        function inferProviderIdByVoiceMode(voiceMode) {
          const providerMap = {
            male_coach_deep: "cosyvoice-mlx",
            male_clear_teacher: "cosyvoice-mlx",
            female_warm_narrator: "cosyvoice-mlx",
            female_energetic_creator: "f5-tts",
            male_storytelling_soft: "melotts",
            custom_reference: "cosyvoice-mlx",
          };

          return providerMap[voiceMode] || "cosyvoice-mlx";
        }

        function renderStepGate() {
          if (!overviewPanelTitle || !qualityScoreSuffix || !gateBadge || !estimatedScenesLabel || !scriptCharactersLabel || !focusPanelTitle || !focusPanelNote || !selectedPlanPanelTitle || !nextGatePanelTitle || !nextGateList) {
            return;
          }

          const gateConfig = {
            asset_intake: {
              overviewTitle: "脚本就绪概览",
              focusTitle: "素材收集这一步看什么",
              focusNote: "这里只看三件事：脚本是否完整、自动拆出的场景是否顺、是否已经知道要用哪类声音。先把输入搞清楚，比过早盯渲染结果更重要。",
              selectedPlanTitle: "当前已选输入方案",
              nextGateTitle: "进入分镜确认前必须满足",
              gateBadgeText: "待校验",
              scoreSuffix: "/100",
              estimatedLabel: "预估场景数",
              scriptLabel: "脚本字数",
              gates: [
                { title: "脚本能读懂", text: "至少能提取出标题、核心观点和 CTA，不要让后续步骤猜你的意思。" },
                { title: "场景拆分顺", text: "每一段都要能回答“这一段说什么、画面拍什么、预计几秒”。" },
                { title: "声音方向已定", text: "现在只需要知道用预设声音还是你自己的声音，试听动作放到第 4 步。" },
              ],
            },
            storyboard_generation: {
              overviewTitle: "分镜确认概览",
              focusTitle: "分镜确认这一步看什么",
              focusNote: "这里不是继续写文案，而是确认每个 scene 是否真的能拍、能讲、能让后面的图像和配音环节少返工。",
              selectedPlanTitle: "当前分镜输入",
              nextGateTitle: "进入图像生成前必须满足",
              gateBadgeText: "待确认",
              scoreSuffix: "/100",
              estimatedLabel: "分镜段数",
              scriptLabel: "脚本字数",
              gates: [
                { title: "镜头逻辑顺", text: "开场、展开、收束、CTA 的顺序要自然，不要中间跳话题。" },
                { title: "每段画面可执行", text: "visualSuggestion 要足够具体，避免后面只能出抽象图。" },
                { title: "节奏合理", text: "每段建议时长要和内容重量匹配，避免 30 秒脚本拆出过多场景。" },
              ],
            },
            image_generation: {
              overviewTitle: "画面准备概览",
              focusTitle: "图像生成这一步看什么",
              focusNote: "这里关注的是风格一致、人物连续和平台可用，不是追求单张图极致精修。",
              selectedPlanTitle: "当前视觉方案",
              nextGateTitle: "进入声音应用前必须满足",
              gateBadgeText: "待生成",
              scoreSuffix: "/100",
              estimatedLabel: "待生成场景",
              scriptLabel: "脚本字数",
              gates: [
                { title: "人物稳定", text: "John 形象在不同场景里要保持一致，不能每段都像不同人。" },
                { title: "构图适合竖屏", text: "文字安全区、主体位置和裁切都要适配多平台短视频。" },
                { title: "场景覆盖完整", text: "关键 scene 都要有可用图，不能只生成封面图。" },
              ],
            },
            voice_generation: {
              overviewTitle: "声音应用概览",
              focusTitle: "声音应用这一步看什么",
              focusNote: "这一关只做一件事：把整条视频的声音方案定下来。先试听再应用，确认自然度、清晰度和可信感，再去合成。",
              selectedPlanTitle: "当前声音方案",
              nextGateTitle: "进入合成预览前必须满足",
              gateBadgeText: "待应用",
              scoreSuffix: "/5",
              estimatedLabel: "可用声音组",
              scriptLabel: "自定义参考",
              gates: [
                { title: "声音听起来自然", text: "不要有明显机器人味、吞字或发音飘的问题。" },
                { title: "音色和内容匹配", text: "知识拆解、动作纠错和成长复盘，适合的语气并不一样。" },
                { title: "如用本人声音已授权", text: "上传或录音前确认你有权使用这个声音参考。" },
              ],
            },
            video_assembly: {
              overviewTitle: "合成任务概览",
              focusTitle: "合成预览这一步看什么",
              focusNote: "这里开始真正看任务进度、SSE 事件和视频预览。脚本和声音都定下后，右侧应该更多反映生产状态，而不是草稿解释。",
              selectedPlanTitle: "当前产线方案",
              nextGateTitle: "进入合规发布前必须满足",
              gateBadgeText: "处理中",
              scoreSuffix: "/100",
              estimatedLabel: "任务进度",
              scriptLabel: "最新状态",
              gates: [
                { title: "SSE 持续推进", text: "至少能看到 PARSING 到 RENDERING 的过程，不是卡在创建成功一行。" },
                { title: "可打开预览", text: "产物出来后，用户必须能直接预览或下载，而不是只看 JSON。" },
                { title: "时间线无明显错位", text: "字幕、语音、画面至少要基本对齐，不能完全错拍。" },
              ],
            },
            preview_publish: {
              overviewTitle: "发布前概览",
              focusTitle: "合规发布这一步看什么",
              focusNote: "最后一关看的是交付，而不是内部状态。你要拿到的是能继续发布、能复用、能回查的成品资产。",
              selectedPlanTitle: "当前交付包",
              nextGateTitle: "标记完成前必须满足",
              gateBadgeText: "待交付",
              scoreSuffix: "/100",
              estimatedLabel: "产物数量",
              scriptLabel: "脚本字数",
              gates: [
                { title: "MP4 可打开", text: "用户要能在页面里直接播放，不是只有一个路径字符串。" },
                { title: "元数据齐全", text: "至少包含任务信息、输出信息和后续复盘需要的关键信息。" },
                { title: "多平台可继续分发", text: "尺寸、字幕和合规状态不能阻塞下一步发布。" },
              ],
            },
          };

          const config = gateConfig[CURRENT_STEP_ID] || gateConfig.asset_intake;
          overviewPanelTitle.textContent = config.overviewTitle;
          qualityScoreSuffix.textContent = config.scoreSuffix;
          gateBadge.textContent = config.gateBadgeText;
          estimatedScenesLabel.textContent = config.estimatedLabel;
          scriptCharactersLabel.textContent = config.scriptLabel;
          focusPanelTitle.textContent = config.focusTitle;
          focusPanelNote.textContent = config.focusNote;
          selectedPlanPanelTitle.textContent = config.selectedPlanTitle;
          nextGatePanelTitle.textContent = config.nextGateTitle;
          nextGateList.innerHTML = config.gates.map((item) => (
            '<div class="gate-item"><strong>' + item.title + '</strong><p>' + item.text + '</p></div>'
          )).join("");
        }

        function saveDraftToStorage() {
          try {
            const snapshot = {};
            ids.forEach((id) => {
              const element = document.getElementById(id);
              if (!element) return;
              snapshot[id] = element.value ?? "";
            });
            snapshot.platformWechat = Boolean(platformWechat?.checked);
            snapshot.platformXiaohongshu = Boolean(platformXiaohongshu?.checked);
            snapshot.platformDouyin = Boolean(platformDouyin?.checked);
            snapshot.platformBilibili = Boolean(platformBilibili?.checked);
            localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(snapshot));
          } catch {}
        }

        function restoreDraftFromStorage() {
          try {
            const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
            if (!raw) return;
            const snapshot = JSON.parse(raw);
            ids.forEach((id) => {
              const element = document.getElementById(id);
              if (!element) return;
              const value = snapshot[id];
              if (typeof value === "string") {
                element.value = value;
              }
            });
            if (platformWechat && typeof snapshot.platformWechat === "boolean") platformWechat.checked = snapshot.platformWechat;
            if (platformXiaohongshu && typeof snapshot.platformXiaohongshu === "boolean") platformXiaohongshu.checked = snapshot.platformXiaohongshu;
            if (platformDouyin && typeof snapshot.platformDouyin === "boolean") platformDouyin.checked = snapshot.platformDouyin;
            if (platformBilibili && typeof snapshot.platformBilibili === "boolean") platformBilibili.checked = snapshot.platformBilibili;
          } catch {}
        }

        function syncVoiceStatus() {
          const voiceModeValue = document.getElementById("voiceMode").value;
          const ttsProviderIdValue = document.getElementById("ttsProviderId").value;
          const customReferenceValue = customVoiceReferenceInput?.value?.trim() || "";
          const routeBehavior = getRouteBehaviorConfig(ttsProviderIdValue, voiceModeValue);
          if (activeVoiceModeLabel) {
            activeVoiceModeLabel.textContent = clientVoiceModeLabel(voiceModeValue);
          }
          if (activeVoiceProviderLabel) {
            activeVoiceProviderLabel.textContent = clientTtsProviderDisplay(ttsProviderIdValue) || clientVoiceProviderLabel(voiceModeValue);
          }
          if (activeVoiceRoleLabel) {
            activeVoiceRoleLabel.textContent = clientTtsProviderRole(ttsProviderIdValue);
          }
          if (assetVoiceRouteLabel) {
            assetVoiceRouteLabel.textContent = clientTtsRouteLabel(ttsProviderIdValue, voiceModeValue);
          }
          if (activeTtsRouteLabel) {
            activeTtsRouteLabel.textContent = clientTtsRouteLabel(ttsProviderIdValue, voiceModeValue);
          }
          if (activeVoicePreviewCapabilityLabel) {
            activeVoicePreviewCapabilityLabel.textContent = clientTtsPreviewCapability(ttsProviderIdValue);
          }
          if (activeVoiceSaasFitLabel) {
            activeVoiceSaasFitLabel.textContent = clientTtsSaasFit(ttsProviderIdValue);
          }
          if (activeVoiceReferenceLabel) {
            activeVoiceReferenceLabel.textContent = customReferenceValue || "未使用自定义参考";
          }
          if (ttsProviderSelect) {
            ttsProviderSelect.value = ttsProviderIdValue || "${defaultVoiceProvider.id}";
          }
          document.querySelectorAll(".provider-strategy-card").forEach((item) => {
            const providerId = item.getAttribute("data-provider-id");
            item.classList.toggle("active", providerId === ttsProviderIdValue);
          });
          if (routeBehaviorTitle) {
            routeBehaviorTitle.textContent = routeBehavior.title;
          }
          if (routeBehaviorNote) {
            routeBehaviorNote.textContent = routeBehavior.note;
          }
          if (routeBehaviorList) {
            routeBehaviorList.innerHTML = routeBehavior.items
              .map((item) => '<div class="route-behavior-item">' + item + '</div>')
              .join("");
          }
          document.querySelectorAll(".voice-preview-btn").forEach((button) => {
            const card = button.closest(".voice-card");
            const voiceMode = card?.getAttribute("data-voice-mode");
            const providerId = inferProviderIdByVoiceMode(voiceMode || "");
            const config = getRouteBehaviorConfig(providerId, voiceMode || "");
            button.textContent = config.previewButtonText;
            button.disabled = !config.previewAllowed;
            button.classList.toggle("secondary", true);
          });
        }

        function setInlineStatus(element, text, tone) {
          if (!element) return;
          element.textContent = text;
          element.className = "inline-status" + (tone ? " " + tone : "");
        }

        function setButtonState(button, text, disabled) {
          if (!button) return;
          if (!button.dataset.defaultText) {
            button.dataset.defaultText = button.textContent || "";
          }
          button.textContent = text;
          button.disabled = Boolean(disabled);
        }

        function resetButtonState(button) {
          if (!button) return;
          button.textContent = button.dataset.defaultText || button.textContent;
          button.disabled = false;
        }

        function setStageChip(element, text, tone) {
          if (!element) return;
          element.textContent = text;
          element.className = "stage-chip" + (tone ? " " + tone : "");
        }

        function setCreateJobAvailability(enabled) {
          if (!createJobBtn) return;
          createJobBtn.disabled = !enabled;
          if (enabled) {
            createJobBtn.classList.remove("secondary");
            createJobBtn.classList.add("primary");
          } else {
            createJobBtn.classList.remove("primary");
            createJobBtn.classList.add("secondary");
          }
        }

        function setHeroStatus(text, tone) {
          if (!heroStatus) return;
          heroStatus.textContent = text;
          heroStatus.className = "tiny-chip" + (tone ? " " + tone : "");
        }

        function setWorkflowStatus(line, hint) {
          if (statusEl) statusEl.textContent = line;
          if (statusHintEl) statusHintEl.textContent = hint;
        }

        function syncGateAssistant(statusKey) {
          if (!gateBadge || !focusPanelNote || !nextGateList || !gateChecklist) return;

          const assistantMap = {
            waiting_input: {
              badge: "先准备脚本",
              note: "先把脚本贴进来或载入演示内容，然后完成第 1 步校验。右侧现在只需要帮你确认输入是否完整。",
              checklist: [
                { title: "脚本已输入", text: "先把可用脚本贴进来，系统才知道要处理什么。", done: false },
                { title: "平台已确认", text: "至少明确这条内容准备发到哪些平台。", done: false },
                { title: "进入校验阶段", text: "下一步应该先跑脚本校验，而不是直接创建任务。", done: false },
              ],
              gates: [
                { title: "先有完整脚本", text: "至少要有主题、核心观点和基本结构，系统才能开始拆分。" },
                { title: "知道发到哪些平台", text: "勾选平台后，后面才能更准确地做比例和发布适配。" },
                { title: "不用急着创建任务", text: "现在先别盯产物，先把输入和结构理顺。" },
              ],
            },
            validating: {
              badge: "正在校验",
              note: "系统正在检查脚本结构、分段可读性和进入分镜预览的准备情况。先等校验结论，再决定是否创建任务。",
              checklist: [
                { title: "脚本已输入", text: "草稿已经进入系统校验流程。", done: true },
                { title: "结构检查进行中", text: "系统正在确认标题、分段和关键字段是否足够清晰。", done: false },
                { title: "等待校验结论", text: "通过后再进入任务创建，未通过就先修正。", done: false },
              ],
              gates: [
                { title: "等待结构检查完成", text: "系统会确认标题、开场抓手、摘要、行动引导和分段是否可读。" },
                { title: "优先看是否通过", text: "通过后再创建任务，不通过就先修复问题。" },
                { title: "不用提前切步骤", text: "这一刻最重要的是等出可执行的分镜输入。" },
              ],
            },
            ready_to_create: {
              badge: "可创建任务",
              note: "草稿已经通过校验。现在重点不再是补字段，而是决定是否直接进入任务创建和 SSE 进度追踪。",
              checklist: [
                { title: "脚本校验通过", text: "结构和分段已经达到可继续生产的标准。", done: true },
                { title: "分镜预览可读", text: "现在可以先快速扫一眼分镜节奏再决定是否创建任务。", done: true },
                { title: "下一步创建任务", text: "创建任务后，系统才会真正进入视频生产流程。", done: false },
              ],
              gates: [
                { title: "校验已通过", text: "脚本结构和分段已经达到可以继续生产的标准。" },
                { title: "先看分镜是否顺", text: "确认预览节奏合理后，再点创建任务最稳妥。" },
                { title: "可以进入第 2 步", text: "现在创建任务，系统就会开始真正的视频生成流程。" },
              ],
            },
            creating_job: {
              badge: "正在建任务",
              note: "任务已经提交给系统。接下来右侧重点从草稿解释，切换为任务阶段、预览和产物反馈。",
              checklist: [
                { title: "脚本已通过校验", text: "现在不再回头看输入是否完整。", done: true },
                { title: "任务创建中", text: "系统正在初始化任务并建立 SSE 进度通道。", done: false },
                { title: "即将进入生产阶段", text: "创建成功后会进入解析、处理、装配和渲染流程。", done: false },
              ],
              gates: [
                { title: "任务正在初始化", text: "系统会先创建任务，再建立 SSE 进度订阅。" },
                { title: "马上切到生产视角", text: "接下来更重要的是阶段推进，而不是继续改脚本解释。" },
                { title: "准备看进度和预览", text: "创建成功后，右侧会逐步出现任务摘要、质量和预览信息。" },
              ],
            },
            processing_job: {
              badge: "任务处理中",
              note: "当前已经进入实际生产过程。右侧最重要的是任务阶段、产物状态和预览是否持续推进。",
              checklist: [
                { title: "任务已创建", text: "系统已经正式进入视频生产流程。", done: true },
                { title: "阶段持续推进", text: "至少要看到解析、AI 处理、装配和渲染在前进。", done: false },
                { title: "等待最终产物", text: "视频完成后，这里应该出现预览、质量和成本摘要。", done: false },
              ],
              gates: [
                { title: "阶段要持续推进", text: "不能一直停在同一个阶段，至少要看到解析、处理、装配和渲染在前进。" },
                { title: "预览要逐步可见", text: "任务完成后，页面里要能直接看到 MP4 预览和下载入口。" },
                { title: "异常要能定位", text: "如果中断，右侧要能看出卡在哪一步，而不是只剩一个失败词。" },
              ],
            },
            completed_job: {
              badge: "可进入验收",
              note: "任务已经完成。现在右侧的重点应该是预览、产物质量、成本和是否满足你的人工验收标准。",
              checklist: [
                { title: "任务已完成", text: "视频生产流程已经完整跑通。", done: true },
                { title: "产物已可预览", text: "页面里应该能直接打开或下载 MP4。", done: true },
                { title: "进入人工验收", text: "现在重点是你来确认最终观感和交付质量。", done: false },
              ],
              gates: [
                { title: "MP4 可直接预览", text: "你应该能在页面里直接打开或下载视频，而不是只看到路径。" },
                { title: "质量摘要可读", text: "时长、分辨率、音频、字幕和合规状态都要清楚可见。" },
                { title: "可以进入人工验收", text: "确认产物没问题后，就可以进入你的人工验收环节。" },
              ],
            },
            failed_job: {
              badge: "等待修复",
              note: "任务执行中断了。右侧现在最重要的是帮助你定位问题，而不是继续展示理想流程。",
              checklist: [
                { title: "任务已中断", text: "系统没有顺利跑完整个视频生产流程。", done: true },
                { title: "先定位问题", text: "当前最关键的是确认卡在哪一步、为什么失败。", done: false },
                { title: "修复后再重试", text: "解决输入、声音或环境问题后，再重新创建任务。", done: false },
              ],
              gates: [
                { title: "先看卡在哪一步", text: "明确是解析、AI 处理、装配还是渲染阶段中断。" },
                { title: "确认是否能重试", text: "修复脚本、声音或环境问题后，再决定是否重新创建任务。" },
                { title: "别忽略右侧错误信息", text: "当前最关键的是错误定位，而不是继续改版式。" },
              ],
            },
          };

          const config = assistantMap[statusKey];
          if (!config) return;
          gateBadge.textContent = config.badge;
          focusPanelNote.textContent = config.note;
          gateChecklist.innerHTML = (config.checklist || []).map((item) => (
            '<div class="gate-check ' + (item.done ? "done" : "pending") + '">' +
              '<div class="gate-check-icon">' + (item.done ? "✓" : "•") + '</div>' +
              '<div><strong>' + item.title + '</strong><p>' + item.text + '</p></div>' +
            '</div>'
          )).join("");
          nextGateList.innerHTML = config.gates.map((item) => (
            '<div class="gate-item"><strong>' + item.title + '</strong><p>' + item.text + '</p></div>'
          )).join("");
        }

        function markActiveVoiceCard(selectedCard) {
          document.querySelectorAll(".voice-card").forEach((item) => {
            item.classList.toggle("active", item === selectedCard);
            const applyBtn = item.querySelector(".voice-apply-btn");
            if (!applyBtn) return;
            applyBtn.classList.toggle("primary", item === selectedCard);
            applyBtn.classList.toggle("secondary", item !== selectedCard);
            applyBtn.textContent = item === selectedCard ? "已应用" : (applyBtn.dataset.defaultText || "应用该声音");
          });
        }

        function detectScriptMode(text) {
          const normalized = (text || "").trim();
          if (!normalized) return "plain_text";
          if (/^#{1,6}\\s+/m.test(normalized) || /visual_hint:/i.test(normalized) || /tts_voice:/i.test(normalized)) {
            return "markdown";
          }
          return "plain_text";
        }

        function collect() {
          const payload = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)?.value ?? ""]));
          const scriptText = payload.scriptText || "";
          const derived = deriveScriptStructure(scriptText);
          payload.title = (payload.title || "").trim() || derived.title || "";
          payload.scriptMode = detectScriptMode(scriptText);

          if (platformWechat?.checked) {
            payload.platform = "videox";
          } else if (platformXiaohongshu?.checked) {
            payload.platform = "xiaohongshu";
          } else if (platformDouyin?.checked) {
            payload.platform = "douyin";
          } else if (platformBilibili?.checked) {
            payload.platform = "videox";
          }

          return payload;
        }

        function appendEvent(text) {
          const repeatedPrefixes = ["正在试听", "已应用声音方案", "已应用自定义声音参考", "开始录音", "录音结束", "已保存自定义声音参考"];
          if (repeatedPrefixes.some((prefix) => text.startsWith(prefix))) {
            const recent = Array.from(jobEvents.querySelectorAll(".event-item-compact")).slice(0, 4);
            const duplicated = recent.find((item) => item.textContent === text);
            if (duplicated) {
              return;
            }
          }
          const item = document.createElement("div");
          item.className = "event-item-compact";
          item.textContent = text;
          jobEvents.prepend(item);
          while (jobEvents.children.length > 8) {
            jobEvents.removeChild(jobEvents.lastElementChild);
          }
        }

        function deriveScriptStructure(text) {
          const normalized = (text || "").trim();
          if (!normalized) {
            return {
              title: "",
              hook: "",
              summary: "",
              durationSec: 0,
              cta: "",
              scenes: [],
            };
          }

          const lines = normalized.split("\\n").map((line) => line.trim()).filter(Boolean);
          const fieldValue = (prefix) => {
            const line = lines.find((item) => item.toLowerCase().startsWith(prefix + ":"));
            return line ? line.slice(prefix.length + 1).trim() : "";
          };

          const title = fieldValue("title");
          const hook = fieldValue("hook");
          const summary = fieldValue("summary");
          const durationSecRaw = Number(fieldValue("durationSec"));
          const cta = fieldValue("cta");

          if (/^#{1,6}\\s+/m.test(normalized)) {
            const markdownLines = normalized.split("\\n");
            const sections = [];
            let current = null;

            const flushSection = () => {
              if (!current) return;
              const body = current.lines.join("\\n").trim();
              if (!body) return;
              sections.push({
                heading: current.heading,
                body,
              });
            };

            markdownLines.forEach((line) => {
              const match = line.match(/^(#{1,6})\\s+(.+)$/);
              if (match) {
                flushSection();
                current = { heading: match[2].trim(), lines: [] };
                return;
              }
              if (!current) return;
              current.lines.push(line.trim());
            });
            flushSection();

            const semanticSections = sections.filter((section) =>
              /(开场|钩子|正文|结尾|cta|总结|步骤|场景|镜头)/i.test(section.heading),
            );

            if (semanticSections.length) {
              const titleSection = sections.find((section) => section.heading === "标题");
              const summarySection = sections.find((section) => section.heading === "正文");
              const ctaSection = sections.find((section) => /cta/i.test(section.heading));
              const markdownScenes = [];
              const pushScene = (titleText, voiceoverText, visualHintText) => {
                const compactVoiceover = (voiceoverText || "")
                  .replace(/^- /gm, "")
                  .replace(new RegExp("\\n+", "g"), " ")
                  .replace(new RegExp("\\s+", "g"), " ")
                  .trim();
                if (!compactVoiceover) return;
                markdownScenes.push({
                  index: markdownScenes.length + 1,
                  title: titleText,
                  voiceover: compactVoiceover,
                  visualSuggestion: visualHintText,
                  durationSec: Math.max(4, Math.min(12, Math.round(Math.max(compactVoiceover.length, 18) / 11))),
                });
              };

              semanticSections.forEach((section) => {
                if (section.heading === "开场钩子") {
                  pushScene("开场钩子", section.body, "用强对比的 John 讲解画面快速抛出问题，让用户 3 秒内知道这条视频在说什么。");
                  return;
                }

                if (section.heading === "正文") {
                  const bodyBlocks = section.body
                    .split(/\\n{2,}/)
                    .map((item) => item.replace(/^- /gm, "").replace(new RegExp("\\s+", "g"), " ").trim())
                    .filter(Boolean);
                  bodyBlocks.forEach((block, blockIndex) => {
                    pushScene(
                      bodyBlocks.length > 1 ? "核心观点 " + (blockIndex + 1) : "核心表达",
                      block,
                      "围绕这一段核心观点，生成 John 风格竖屏讲解画面，并突出关键词、逻辑关系和节奏变化。",
                    );
                  });
                  return;
                }

                if (section.heading === "结尾") {
                  pushScene("结尾收束", section.body, "画面从讲解过渡到总结收束，突出结论和主张，让用户明确记住这条视频的核心价值。");
                  return;
                }

                if (/cta/i.test(section.heading)) {
                  pushScene("行动引导", section.body, "用明确的关注或互动提示收尾，画面上保留清晰的 CTA 信息和 John 的人物统一性。");
                  return;
                }

                pushScene(section.heading, section.body, "围绕这一段内容生成 John 风格竖屏讲解画面，并突出该段的主要信息。");
              });

              return {
                title: title || titleSection?.body || sections[0]?.heading || normalized.slice(0, 28),
                hook: hook || semanticSections.find((section) => /开场|钩子/i.test(section.heading))?.body?.replace(new RegExp("\\n+", "g"), " ").trim() || markdownScenes[0]?.voiceover || "",
                summary: summary || summarySection?.body?.replace(/^- /gm, "").replace(new RegExp("\\n+", "g"), " ").trim().slice(0, 80) || markdownScenes[1]?.voiceover?.slice(0, 80) || "",
                durationSec: Number.isFinite(durationSecRaw) && durationSecRaw > 0 ? durationSecRaw : markdownScenes.reduce((sum, scene) => sum + scene.durationSec, 0),
                cta: cta || ctaSection?.body?.replace(new RegExp("\\n+", "g"), " ").trim() || "",
                scenes: markdownScenes,
              };
            }
          }

          const sceneBlocks = normalized
            .split(/\\n\\s*\\n/)
            .map((item) => item.trim())
            .filter((item) => /^scene\\s+\\d+/i.test(item));

          const scenes = sceneBlocks.map((block, index) => {
            const blockLines = block.split("\\n").map((line) => line.trim()).filter(Boolean);
            const readSceneField = (name) => {
              const line = blockLines.find((item) => item.toLowerCase().startsWith(name.toLowerCase() + ":"));
              return line ? line.slice(name.length + 1).trim() : "";
            };
            const voiceover = readSceneField("voiceover") || blockLines.slice(1).join(" ");
            const visualSuggestion = readSceneField("visualSuggestion") || "根据这段口播生成 John 风格竖屏讲解画面";
            const durationSec = Number(readSceneField("durationSec")) || Math.max(4, Math.min(12, Math.round(Math.max(voiceover.length, 18) / 9)));
            return {
              index: index + 1,
              title: "场景片段",
              voiceover,
              visualSuggestion,
              durationSec,
            };
          });

          if (!scenes.length) {
            const blocks = normalized.split(/\\n\\s*\\n/).map((item) => item.trim()).filter(Boolean);
            blocks.forEach((block, index) => {
              const voiceover = block.replace(/^(title|hook|summary|durationSec|cta):.*$/gim, "").trim();
              if (!voiceover) return;
              scenes.push({
                index: index + 1,
                title: "场景片段",
                voiceover,
                visualSuggestion: "根据这段口播生成 John 风格竖屏讲解画面",
                durationSec: Math.max(4, Math.min(12, Math.round(Math.max(voiceover.length, 18) / 9))),
              });
            });
          }

          return {
            title: title || scenes[0]?.voiceover?.slice(0, 28) || normalized.slice(0, 28),
            hook: hook || scenes[0]?.voiceover?.slice(0, 60) || normalized.slice(0, 60),
            summary: summary || scenes[1]?.voiceover?.slice(0, 80) || normalized.slice(0, 80),
            durationSec: Number.isFinite(durationSecRaw) && durationSecRaw > 0 ? durationSecRaw : scenes.reduce((sum, scene) => sum + scene.durationSec, 0),
            cta,
            scenes,
          };
        }

        function renderDerivedStructure(text) {
          if (!derivedTitle || !derivedHook || !derivedSummary || !derivedDuration || !sceneOutline) {
            return;
          }

          const derived = deriveScriptStructure(text);
          const fallbackTitleInput = document.getElementById("title");
          const scriptModeInput = document.getElementById("scriptMode");
          if (fallbackTitleInput && !fallbackTitleInput.value.trim() && derived.title) {
            fallbackTitleInput.value = derived.title;
          }
          if (scriptModeInput) {
            scriptModeInput.value = detectScriptMode(text);
          }
          derivedTitle.textContent = derived.title || "等待脚本解析";
          derivedHook.textContent = derived.hook || "等待脚本解析";
          derivedSummary.textContent = derived.summary || "等待脚本解析";
          derivedDuration.textContent = derived.durationSec ? derived.durationSec + " 秒" : "等待脚本解析";

          if (!derived.scenes.length) {
            sceneOutline.innerHTML = '<div class="summary-item empty">粘贴脚本后，这里会自动生成分段草稿。</div>';
            return;
          }

          sceneOutline.innerHTML = derived.scenes.map((scene) => [
            '<article class="scene-row">',
            '  <strong>第 ' + scene.index + ' 段 · ' + (scene.title || "场景片段") + '</strong>',
            '  <div><div class="scene-row-label">这一段要说什么</div><div class="scene-row-value">' + scene.voiceover + '</div></div>',
            '  <div><div class="scene-row-label">建议画面</div><div class="scene-row-value">' + scene.visualSuggestion + '</div></div>',
            '  <div><div class="scene-row-label">建议时长</div><div class="scene-row-value">' + scene.durationSec + ' 秒</div></div>',
            '</article>'
          ].join("")).join("");
        }

        function renderPreview(detail) {
          const previewUrl = detail?.previewUrl;
          if (!previewUrl) {
            previewStage.innerHTML = '<div class="preview-placeholder">当前还没有完成的 MP4。渲染结束后，这里会出现播放器和下载链接。</div>';
            previewLinks.innerHTML = "";
            return;
          }

          previewStage.innerHTML = '<video controls preload="metadata" src="' + previewUrl + '"></video>';
          previewLinks.innerHTML = [
            '<a href="' + previewUrl + '" target="_blank" rel="noreferrer">打开 MP4</a>',
            '<a href="' + previewUrl + '" download>下载 MP4</a>',
            detail.outputPaths?.metadataPath ? '<a href="/' + detail.outputPaths.metadataPath + '" target="_blank" rel="noreferrer">元数据 JSON</a>' : ''
          ].filter(Boolean).join("");
        }

        function renderJobQuality(detail) {
          const quality = detail?.qualitySummary;
          const cost = detail?.costSummary;
          const ttsStrategy = detail?.ttsStrategySummary;

          if (!quality) {
            jobQualitySummary.innerHTML = '<div class="summary-item empty">任务完成后，这里会显示文件大小、时长、分辨率、音频、字幕、备用渲染与合规状态。</div>';
          } else {
            jobQualitySummary.innerHTML = [
              '<div class="quality-item pass">文件大小：' + (detail.qualitySummary.fileSizeLabel || "未生成") + '</div>',
              '<div class="quality-item pass">时长：' + (detail.qualitySummary.durationLabel || "未探测") + '</div>',
              '<div class="quality-item pass">分辨率：' + (detail.qualitySummary.resolutionLabel || "未探测") + '</div>',
              '<div class="quality-item ' + ((detail.qualitySummary.audioPresenceLabel || "").includes("无") ? 'warn' : 'pass') + '">音频：' + (detail.qualitySummary.audioPresenceLabel || "未探测") + '</div>',
              '<div class="quality-item ' + ((detail.qualitySummary.subtitleStatusLabel || "").includes("缺失") ? 'warn' : 'pass') + '">字幕：' + (detail.qualitySummary.subtitleStatusLabel || "未知") + '</div>',
              '<div class="quality-item ' + ((detail.qualitySummary.fallbackStatusLabel || "").includes("fallback") ? 'warn' : 'pass') + '">渲染模式：' + (detail.qualitySummary.fallbackStatusLabel || "未知") + '</div>',
              '<div class="quality-item ' + ((detail.qualitySummary.complianceStatusLabel || "").includes("拦截") ? 'warn' : 'pass') + '">合规：' + (detail.qualitySummary.complianceStatusLabel || "未知") + '</div>',
            ].join("");
          }

          if (!cost) {
            jobCostSummary.innerHTML = '<div class="summary-item empty">创建任务后，这里会显示图像、TTS 和总成本估算。</div>';
            return;
          }

          jobCostSummary.innerHTML = [
            '<div class="quality-item pass">GPT Image：' + detail.costSummary.gptImageUsd + '</div>',
            '<div class="quality-item pass">Wanx：' + detail.costSummary.wanxUsd + '</div>',
            '<div class="quality-item pass">TTS：' + detail.costSummary.ttsUsd + '</div>',
            '<div class="quality-item pass">总成本：' + detail.costSummary.totalUsd + '</div>',
          ].join("");

          if (!ttsStrategy) {
            jobTtsStrategySummary.innerHTML = '<div class="summary-item empty">创建任务后，这里会显示当前任务使用的声音模式、TTS 引擎、克隆方式和部署策略。</div>';
            return;
          }

          jobTtsStrategySummary.innerHTML = [
            '<div class="quality-item pass">声音模式：' + (ttsStrategy.voiceModeLabel || "未设置") + '</div>',
            '<div class="quality-item pass">TTS 引擎：' + (ttsStrategy.providerLabel || "未设置") + '</div>',
            '<div class="quality-item pass">音色策略：' + (ttsStrategy.cloningLabel || "未设置") + '</div>',
            '<div class="quality-item pass">路线定位：' + (ttsStrategy.routeRoleLabel || "未设置") + '</div>',
            '<div class="quality-item pass">部署策略：' + (ttsStrategy.deploymentLabel || "未设置") + '</div>',
            '<div class="quality-item pass">验收提示：' + (ttsStrategy.acceptanceHint || "未设置") + '</div>',
          ].join("");

          if (!detail?.routeOutcomeSummary) {
            jobRouteOutcomeSummary.innerHTML = '<div class="summary-item empty">任务完成后，这里会按当前 TTS 路线解释质量重点、成本理解方式和验收优先级。</div>';
            return;
          }

          jobRouteOutcomeSummary.innerHTML = [
            '<div class="quality-item pass">质量重点：' + (detail.routeOutcomeSummary.qualityFocusLabel || "未设置") + '</div>',
            '<div class="quality-item pass">成本解读：' + (detail.routeOutcomeSummary.costInterpretationLabel || "未设置") + '</div>',
            '<div class="quality-item pass">验收优先级：' + (detail.routeOutcomeSummary.acceptancePriorityLabel || "未设置") + '</div>',
          ].join("");

          if (!detail?.resilienceSummary) {
            jobResilienceSummary.innerHTML = '<div class="summary-item empty">任务完成后，这里会解释当前产物是否来自 fallback、该如何判断是否需要重跑。</div>';
            return;
          }

          jobResilienceSummary.innerHTML = [
            '<div class="quality-item pass">渲染来源：' + (detail.resilienceSummary.renderSourceLabel || "未设置") + '</div>',
            '<div class="quality-item pass">兜底解读：' + (detail.resilienceSummary.fallbackInterpretationLabel || "未设置") + '</div>',
            '<div class="quality-item pass">重跑建议：' + (detail.resilienceSummary.rerunRecommendationLabel || "未设置") + '</div>',
          ].join("");
        }

        function renderJobSnapshot(snapshot) {
          if (snapshot?.jobId) {
            currentJobId = snapshot.jobId;
          }
          syncArtifactPanels();
          jobStatus.textContent = JSON.stringify(snapshot, null, 2);
          jobStatus.className = "";
          if (jobReadableSnapshot) {
            const readableItems = Array.isArray(snapshot.checkpointReadableSummary) && snapshot.checkpointReadableSummary.length
              ? snapshot.checkpointReadableSummary
              : [
                  snapshot.currentStep ? "当前阶段：" + snapshot.currentStep : "当前阶段：暂无",
                  snapshot.state ? "任务状态：" + snapshot.state : "任务状态：暂无",
                ];
            jobReadableSnapshot.innerHTML = readableItems
              .map((item) => '<div class="quality-item pass">' + item + '</div>')
              .join("");
          }
          if (typeof snapshot.progress === "number") {
            progressValue.style.width = snapshot.progress + "%";
          }
          if (snapshot.state) {
            jobStateChip.textContent = snapshot.state;
          }
          if (snapshot.currentStep) {
            jobStepChip.textContent = snapshot.currentStep;
          }
        }

        function formatEventStateLabel(state) {
          const stateMap = {
            PARSING: "解析脚本",
            AI_PROCESSING: "整理分镜",
            ASSEMBLING: "组装时间线",
            RENDERING: "输出成片",
            COMPLETED: "任务完成",
            FAILED: "任务失败",
            INTERRUPTED: "任务中断",
          };
          return stateMap[state] || state || "任务更新";
        }

        function formatEventNarration(payload) {
          const label = formatEventStateLabel(payload.state);
          const message = (payload.message || "").trim();
          if (!message) {
            return label;
          }
          return label + "： " + message;
        }

        function getWizardStepStatuses(jobState) {
          const statuses = ["active", "locked", "locked", "locked", "locked", "locked"];
          const unlockedIndexByState = {
            QUEUED: 1,
            PARSING: 1,
            AI_PROCESSING: 2,
            ASSEMBLING: 4,
            RENDERING: 4,
            POST_PROCESSING: 5,
            COMPLETED: 6,
          };

          const unlockedCount = unlockedIndexByState[jobState] || 1;
          return statuses.map((_, index) => {
            if (index + 1 < unlockedCount) return "done";
            if (index + 1 === unlockedCount) return "active";
            return "locked";
          });
        }

        function updateWizardRail(jobState) {
          const statuses = getWizardStepStatuses(jobState);
          document.querySelectorAll(".step-item").forEach((item, index) => {
            const status = statuses[index] || "locked";
            item.classList.toggle("active", status === "active");
            item.classList.toggle("locked", status === "locked");
            const statusLabel = item.querySelector(".step-status-label");
            if (statusLabel) {
              statusLabel.textContent = status === "done" ? "已通过" : status === "active" ? "当前步骤" : "未解锁";
            }
          });
        }

        function renderErrors(errors) {
          errorList.innerHTML = "";
          if (!errors.length) return;
          errors.forEach((text) => {
            const item = document.createElement("div");
            item.className = "error-item";
            item.textContent = text;
            errorList.appendChild(item);
          });
        }

        function renderSummary(summary) {
          summaryList.innerHTML = "";
          const completedItems =
            CURRENT_STEP_ID === "asset_intake"
              ? [
                  "脚本已能自动提取标题、开场抓手、摘要和行动引导。",
                  "自动识别分段会直接生成“这一段说什么、建议画面、建议时长”的大白话预览。",
                  "素材页只保留声音方向摘要，试听和应用动作已经集中到第 4 步。",
                ]
              : CURRENT_STEP_ID === "voice_generation"
                ? [
                    "脚本内容已稳定，可以专注确认声音，而不是继续补脚本字段。",
                    "试听、应用、上传参考音频和录音都集中在这一页完成。",
                    "当前选中的引擎路线会同步到任务创建与后续渲染链路。",
                  ]
                : CURRENT_STEP_ID === "video_assembly"
                  ? [
                      "已经从脚本视角切换到任务视角，右侧重点开始变成进度、预览和产物状态。",
                      "SSE 事件会持续写入最近关键进度，避免被无关交互刷屏。",
                      "任务完成后会在当前页直接出现 MP4 预览和标准化产物摘要。",
                    ]
                  : CURRENT_STEP_ID === "preview_publish"
                    ? [
                        "当前页以最终交付为中心，不再强调脚本解释，而是强调成品是否可验收。",
                        "质量、成本、声音策略和预览已经归并到同一块产物信息区。",
                        "你可以直接用这里的信息做人工验收与发布前检查。",
                      ]
                    : summary.checklist;

          completedItems.forEach((text, index) => {
            const item = document.createElement("div");
            item.className = "quality-item " + (index < 4 ? "pass" : "warn");
            item.textContent = text;
            summaryList.appendChild(item);
          });
          if (CURRENT_STEP_ID === "voice_generation") {
            estimatedScenes.textContent = "5";
            scriptCharacters.textContent = customVoiceReferenceInput?.value?.trim() ? "已上传" : "未上传";
          } else {
            estimatedScenes.textContent = String(summary.estimatedScenes);
            scriptCharacters.textContent = String(summary.scriptCharacters);
          }
          const score =
            CURRENT_STEP_ID === "voice_generation"
              ? (customVoiceReferenceInput?.value?.trim() ? 5 : 4)
              : Math.max(42, Math.min(96, 58 + summary.estimatedScenes * 6 + Math.min(14, Math.floor(summary.scriptCharacters / 80))));
          qualityScore.textContent = String(score);
        }

        function syncArtifactPanels() {
          const showArtifactSections = CURRENT_STEP_ID === "video_assembly" || CURRENT_STEP_ID === "preview_publish" || Boolean(currentJobId);
          if (artifactSupportNote) {
            artifactSupportNote.textContent = showArtifactSections
              ? "这里开始以真实任务与产物为主：看进度、预览、质量、成本和声音策略。"
              : "当前还没进入产物验收阶段。先把脚本、分镜或声音方案确认好，等任务创建后再看质量、成本和预览结果。";
          }
          if (jobQualitySection) jobQualitySection.hidden = !showArtifactSections;
          if (jobCostSection) jobCostSection.hidden = !showArtifactSections;
          if (jobTtsStrategySection) jobTtsStrategySection.hidden = !showArtifactSections;
          if (jobRouteOutcomeSection) jobRouteOutcomeSection.hidden = !showArtifactSections;
          if (jobResilienceSection) jobResilienceSection.hidden = !showArtifactSections;
        }

        function splitScenes(text, mode) {
          const derived = deriveScriptStructure(text);
          return derived.scenes.map((scene, index) => ({
            id: "scene-" + String(index + 1).padStart(3, "0"),
            narration: scene.voiceover,
            visualHint: scene.visualSuggestion,
            durationMs: (scene.durationSec || 4) * 1000,
            transition: "crossfade",
          }));
        }

        async function renderStoryboardFromDraft(payload) {
          const scenes = splitScenes(payload.scriptText, payload.scriptMode);
          if (!scenes.length) {
            storyboardGrid.innerHTML = '<div class="summary-item empty">先校验草稿，再生成分镜预览。</div>';
            return;
          }

          const response = await fetch("/api/storyboard/preview", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              scenes,
              controls: {
                textMode: "original",
                subtitleStyle: "minimal",
                transitionStyle: "crossfade"
              }
            }),
          });
          const result = await response.json();
          renderStoryboard(result);
        }

        function renderStoryboard(preview) {
          if (!preview?.cards?.length) {
            storyboardGrid.innerHTML = '<div class="summary-item empty">当前还没有分镜卡片。</div>';
            return;
          }

          storyboardGrid.innerHTML = preview.cards.map((card) => [
            '<article class="story-scene">',
            '  <div class="scene-top">',
            '    <span class="scene-title">' + card.title + '</span>',
            '    <span class="scene-duration">' + card.durationLabel + '</span>',
            '  </div>',
            '  <div class="scene-visual">' + (card.visualHint || "暂时还没有画面建议") + '</div>',
            '  <div>' + card.narration + '</div>',
            '  <div class="scene-caption">字幕：' + card.subtitleStyle + ' · 转场：' + card.transition + '</div>',
            '</article>'
          ].join("")).join("");
        }

        async function sync() {
          const payload = collect();
          syncArtifactPanels();
          currentModeChip.textContent = clientScriptModeLabel(payload.scriptMode || "plain_text");
          currentProfileChip.textContent = clientProfileLabel(payload.renderProfile || "standard");
          renderDerivedStructure(payload.scriptText || "");
          const response = await fetch("/api/wizard/validate", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });
          const result = await response.json();
          renderErrors(result.errors ?? []);

          if (result.valid && result.summary && result.draft) {
            setWorkflowStatus("草稿校验通过", "现在可以进入第 2 步，直接创建视频任务。");
            setHeroStatus("可创建任务", "ok");
            setStageChip(validateStageChip, "已校验通过", "ready");
            setStageChip(createStageChip, "可以创建任务", "ready");
            setCreateJobAvailability(true);
            syncGateAssistant("ready_to_create");
            renderSummary(result.summary);
            draftJson.textContent = JSON.stringify(result.draft, null, 2);
            draftJson.className = "";
            await renderStoryboardFromDraft(payload);
          } else {
            setWorkflowStatus("草稿还需要修正", "先补齐必填项并修复问题，再重新执行第 1 步校验。");
            setHeroStatus("待修正", "warn");
            setStageChip(validateStageChip, "需要修正", "warn");
            setStageChip(createStageChip, "等待校验通过", "warn");
            setCreateJobAvailability(false);
            syncGateAssistant((payload.scriptText || "").trim() ? "validating" : "waiting_input");
            summaryList.innerHTML = '<div class="summary-item empty">必填项通过后，这里会显示质量摘要。</div>';
            if (CURRENT_STEP_ID === "voice_generation") {
              estimatedScenes.textContent = "5";
              scriptCharacters.textContent = customVoiceReferenceInput?.value?.trim() ? "已上传" : "未上传";
            } else {
              estimatedScenes.textContent = "0";
              scriptCharacters.textContent = String((payload.scriptText || "").trim().length);
            }
            qualityScore.textContent = "--";
            draftJson.textContent = "当前还没有有效草稿。";
            draftJson.className = "empty";
            storyboardGrid.innerHTML = '<div class="summary-item empty">先修复校验问题，再刷新分镜预览。</div>';
          }
        }

        ids.forEach((id) => {
          const element = document.getElementById(id);
          if (!element) return;
          element.addEventListener("input", sync);
          element.addEventListener("change", sync);
          element.addEventListener("input", saveDraftToStorage);
          element.addEventListener("change", saveDraftToStorage);
        });

        platformWechat?.addEventListener("change", saveDraftToStorage);
        platformXiaohongshu?.addEventListener("change", saveDraftToStorage);
        platformDouyin?.addEventListener("change", saveDraftToStorage);
        platformBilibili?.addEventListener("change", saveDraftToStorage);

        validateBtn?.addEventListener("click", async () => {
          setButtonState(validateBtn, "校验中...", true);
          setHeroStatus("校验中", "busy");
          setWorkflowStatus("正在校验脚本草稿", "系统正在检查结构完整性、分段可读性和进入分镜的准备情况。");
          setStageChip(validateStageChip, "校验中...", "warn");
          syncGateAssistant("validating");
          try {
            await sync();
          } finally {
            resetButtonState(validateBtn);
          }
        });
        document.querySelectorAll(".voice-apply-btn").forEach((button) => {
          button.addEventListener("click", async (event) => {
            const card = event.currentTarget.closest(".voice-card");
            const selectedVoiceMode = card?.getAttribute("data-voice-mode");
            if (!selectedVoiceMode) return;
            const voiceName = card?.querySelector("strong")?.textContent?.trim() || "当前声音";
            const inferredProviderId = inferProviderIdByVoiceMode(selectedVoiceMode);
            setButtonState(event.currentTarget, "应用中...", true);
            setInlineStatus(presetVoiceStatus, "正在应用：" + voiceName, "busy");
            document.getElementById("voiceMode").value = selectedVoiceMode;
            document.getElementById("ttsProviderId").value = inferredProviderId;
            markActiveVoiceCard(card);
            setHeroStatus("应用声音中", "busy");
            syncVoiceStatus();
            await sync();
            const routeConfig = getRouteBehaviorConfig(inferredProviderId, selectedVoiceMode);
            setInlineStatus(
              presetVoiceStatus,
              routeConfig.previewAllowed
                ? "已应用：" + voiceName
                : "已应用：" + voiceName + "。这条路线更适合创建任务后验收最终声音。",
              "success",
            );
            setHeroStatus("声音已应用", "ok");
            resetButtonState(event.currentTarget);
            event.currentTarget.textContent = "已应用";
          appendEvent("已应用声音方案：" + voiceName);
          saveDraftToStorage();
        });
        });
        async function uploadCustomVoiceBlob(blob, filename) {
          setInlineStatus(customVoiceStatus, "正在上传声音参考...", "busy");
          setButtonState(recordVoiceBtn, "处理中...", true);
          setButtonState(stopRecordVoiceBtn, "停止录音", true);
          customVoiceFileInput.disabled = true;
          const arrayBuffer = await blob.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = "";
          for (const value of bytes) {
            binary += String.fromCharCode(value);
          }

          const response = await fetch("/api/custom-voice-reference", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              filename,
              mimeType: blob.type || "audio/webm",
              base64: btoa(binary),
            }),
          });
          const result = await response.json();
          if (!response.ok || !result.ok) {
            appendEvent("自定义声音上传失败");
            setInlineStatus(customVoiceStatus, "上传失败，请重试。", "warn");
            resetButtonState(recordVoiceBtn);
            resetButtonState(stopRecordVoiceBtn);
            stopRecordVoiceBtn.disabled = true;
            customVoiceFileInput.disabled = false;
            return null;
          }
          customVoiceReferenceInput.value = result.filename;
          appendEvent("已保存自定义声音参考：" + result.filename);
          setInlineStatus(customVoiceStatus, "已上传：" + result.filename + "，现在可以应用或试听。", "success");
          syncVoiceStatus();
          saveDraftToStorage();
          resetButtonState(recordVoiceBtn);
          resetButtonState(stopRecordVoiceBtn);
          stopRecordVoiceBtn.disabled = true;
          customVoiceFileInput.disabled = false;
          return result;
        }

        customVoiceFileInput?.addEventListener("change", async (event) => {
          const file = event.currentTarget.files?.[0];
          if (!file) return;
          setInlineStatus(customVoiceStatus, "正在上传：" + file.name, "busy");
          await uploadCustomVoiceBlob(file, file.name);
          event.currentTarget.value = "";
        });

        recordVoiceBtn?.addEventListener("click", async () => {
          if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
            appendEvent("当前浏览器不支持录音");
            setInlineStatus(customVoiceStatus, "当前浏览器不支持录音。", "warn");
            return;
          }
          recorderStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          recorderChunks = [];
          activeRecorder = new MediaRecorder(recorderStream);
          activeRecorder.ondataavailable = (event) => {
            if (event.data?.size) recorderChunks.push(event.data);
          };
          activeRecorder.onstop = async () => {
            const blob = new Blob(recorderChunks, { type: activeRecorder.mimeType || "audio/webm" });
            await uploadCustomVoiceBlob(blob, "custom-voice-recording.webm");
            recorderStream?.getTracks().forEach((track) => track.stop());
            recorderStream = null;
            activeRecorder = null;
            resetButtonState(recordVoiceBtn);
            stopRecordVoiceBtn.disabled = true;
          };
          activeRecorder.start();
          setButtonState(recordVoiceBtn, "录音中...", true);
          setButtonState(stopRecordVoiceBtn, "结束并保存", false);
          setInlineStatus(customVoiceStatus, "录音中，请说出一段你的标准口播。", "busy");
          appendEvent("开始录音，请说出一段你的标准口播。");
        });

        stopRecordVoiceBtn?.addEventListener("click", () => {
          if (!activeRecorder) return;
          setButtonState(stopRecordVoiceBtn, "保存中...", true);
          setInlineStatus(customVoiceStatus, "录音结束，正在保存声音参考...", "busy");
          activeRecorder.stop();
          appendEvent("录音结束，正在保存自定义声音参考。");
        });

        applyCustomVoiceBtn?.addEventListener("click", async () => {
          if (!customVoiceReferenceInput.value.trim()) {
            appendEvent("请先上传或录入你的声音参考。");
            setInlineStatus(customVoiceStatus, "请先上传或录入你的声音参考。", "warn");
            return;
          }
          setButtonState(applyCustomVoiceBtn, "应用中...", true);
          setInlineStatus(customVoiceStatus, "正在应用你的声音...", "busy");
          document.getElementById("voiceMode").value = "custom_reference";
          document.getElementById("ttsProviderId").value = "cosyvoice-mlx";
          markActiveVoiceCard(null);
          setHeroStatus("应用自定义声音中", "busy");
          await sync();
          setHeroStatus("已应用自定义声音", "ok");
          appendEvent("已应用自定义声音参考。");
          setInlineStatus(customVoiceStatus, "已应用你的声音。", "success");
          resetButtonState(applyCustomVoiceBtn);
          applyCustomVoiceBtn.textContent = "已应用";
          syncVoiceStatus();
          saveDraftToStorage();
        });

        previewCustomVoiceBtn?.addEventListener("click", async () => {
          const referenceName = customVoiceReferenceInput.value.trim();
          if (!referenceName) {
            appendEvent("请先上传或录入你的声音参考。");
            setInlineStatus(customVoiceStatus, "请先上传或录入你的声音参考。", "warn");
            return;
          }

          setButtonState(previewCustomVoiceBtn, "试听中...", true);
          setInlineStatus(customVoiceStatus, "正在加载你的声音试听...", "busy");
          const response = await fetch("/api/voice-preview?voiceMode=custom_reference&customVoiceReference=" + encodeURIComponent(referenceName));
          const result = await response.json();
          if (!response.ok || !result.ok || !result.previewUrl) {
            appendEvent("自定义声音试听加载失败");
            setInlineStatus(customVoiceStatus, "自定义声音试听加载失败。", "warn");
            resetButtonState(previewCustomVoiceBtn);
            return;
          }

          voicePreviewPlayer.pause();
          voicePreviewPlayer.src = result.previewUrl;
          voicePreviewPlayer.currentTime = 0;
          await voicePreviewPlayer.play();
          appendEvent("正在试听：自定义声音");
          setInlineStatus(customVoiceStatus, "正在试听你的声音。", "success");
          resetButtonState(previewCustomVoiceBtn);
        });
        document.querySelectorAll(".voice-preview-btn").forEach((button) => {
          button.addEventListener("click", async (event) => {
            const card = event.currentTarget.closest(".voice-card");
            const name = card?.querySelector("strong")?.textContent?.trim() || "当前声音";
            const voiceMode = card?.getAttribute("data-voice-mode");
            if (!voiceMode) return;
            const providerId = inferProviderIdByVoiceMode(voiceMode);
            const routeConfig = getRouteBehaviorConfig(providerId, voiceMode);
            if (!routeConfig.previewAllowed) {
              appendEvent("当前路线不建议直接试听：" + name);
              setInlineStatus(presetVoiceStatus, "这条路线更适合创建任务后听最终结果。", "warn");
              return;
            }

            setButtonState(event.currentTarget, "试听中...", true);
            setInlineStatus(presetVoiceStatus, "正在加载试听：" + name, "busy");
            const response = await fetch("/api/voice-preview?voiceMode=" + encodeURIComponent(voiceMode));
            const result = await response.json();

            if (!response.ok || !result.ok || !result.previewUrl) {
              appendEvent("试听加载失败：" + name);
              setInlineStatus(presetVoiceStatus, "试听失败：" + name, "warn");
              resetButtonState(event.currentTarget);
              return;
            }

            voicePreviewPlayer.pause();
            voicePreviewPlayer.src = result.previewUrl;
            voicePreviewPlayer.currentTime = 0;
            await voicePreviewPlayer.play();
            appendEvent("正在试听：" + name);
            setInlineStatus(presetVoiceStatus, "正在试听：" + name, "success");
            resetButtonState(event.currentTarget);
          });
        });
        document.querySelectorAll(".provider-strategy-card").forEach((card) => {
          card.addEventListener("click", async () => {
            const providerId = card.getAttribute("data-provider-id");
            if (!providerId) return;
            document.getElementById("ttsProviderId").value = providerId;
            if (ttsProviderSelect) {
              ttsProviderSelect.value = providerId;
            }
            syncVoiceStatus();
            saveDraftToStorage();
            appendEvent("已切换 TTS 路线：" + providerId);
            await sync();
          });
        });
        createJobBtn?.addEventListener("click", async () => {
          const payload = collect();
          setButtonState(createJobBtn, "创建中...", true);
          setHeroStatus("创建任务中", "busy");
          setWorkflowStatus("正在创建视频任务", "任务创建后会自动开始 SSE 进度追踪，并驱动后续视频生成。");
          setStageChip(createStageChip, "创建中...", "warn");
          syncGateAssistant("creating_job");
          const response = await fetch("/api/jobs", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });
          const result = await response.json();

          if (!response.ok || !result.ok) {
            renderErrors([result.error || "创建任务失败。"]);
            resetButtonState(createJobBtn);
            setHeroStatus("创建失败", "warn");
            setWorkflowStatus("创建任务失败", "请先检查脚本或配置问题，修复后再次创建任务。");
            setStageChip(createStageChip, "创建失败，请重试", "warn");
            syncGateAssistant("failed_job");
            return;
          }

          renderErrors([]);
          currentJobId = result.job.id;
          syncArtifactPanels();
          currentTaskChip.textContent = result.job.id;
          renderJobSnapshot({
            jobId: result.job.id,
            state: "PARSING",
            progress: 1,
            currentStep: "subscribe_progress",
            storyboardScenes: result.storyboard.summary.totalScenes,
          });
          updateWizardRail("PARSING");
          renderStoryboard(result.storyboard);
          setHeroStatus("解析中", "busy");
          setWorkflowStatus("任务已创建，正在解析内容", "系统已经开始建立进度订阅，接下来会依次进入 AI 处理、装配和渲染阶段。");
          syncGateAssistant("processing_job");
          appendEvent("解析中 • 任务已创建，正在建立进度订阅。");
          appendEvent("已创建任务 " + result.job.id + "，并开始订阅 SSE 进度。");
          setButtonState(createJobBtn, "任务已创建", true);
          setStageChip(createStageChip, "任务已创建", "ready");

          if (activeEventSource) {
            activeEventSource.close();
          }

          activeEventSource = new EventSource("/events?jobId=" + result.job.id);
          activeEventSource.addEventListener("job-progress", async (event) => {
            const payload = JSON.parse(event.data);
            const detailResponse = await fetch("/api/jobs/" + payload.jobId);
            const detail = await detailResponse.json();
            renderJobSnapshot({
              jobId: payload.jobId,
              state: payload.state,
              progress: payload.progress,
              currentStep: payload.step,
              message: payload.message,
              outputs: detail.outputsSummary,
              previewUrl: detail.previewUrl,
            });
            updateWizardRail(payload.state);
            renderPreview(detail);
            renderJobQuality(detail);
            if (payload.state === "COMPLETED") {
              setHeroStatus("任务已完成", "ok");
              setWorkflowStatus("视频任务已完成", "现在可以预览 MP4、查看产物质量，并继续进入后续验收。");
              syncGateAssistant("completed_job");
            } else if (payload.state === "FAILED" || payload.state === "INTERRUPTED") {
              setHeroStatus("任务异常", "warn");
              setWorkflowStatus("任务执行中断", "请查看右侧任务进度和错误信息，确认问题后重新创建或继续修复。");
              syncGateAssistant("failed_job");
            } else {
              setHeroStatus("处理中", "busy");
              setWorkflowStatus("任务处理中", "系统正在持续推进当前任务，可在右侧查看阶段、预览和产物状态。");
              syncGateAssistant("processing_job");
            }
            appendEvent(formatEventNarration(payload));
            if (payload.state === "COMPLETED" || payload.state === "FAILED" || payload.state === "INTERRUPTED") {
              resetButtonState(createJobBtn);
              if (payload.state === "COMPLETED") {
                setStageChip(createStageChip, "任务已完成", "ready");
              } else {
                setStageChip(createStageChip, "任务中断，请重试", "warn");
              }
            }
          });
        });
        loadDemoBtn?.addEventListener("click", async () => {
          setButtonState(loadDemoBtn, "载入中...", true);
          document.getElementById("title").value = "AI 工具如何让研发效率提升 3 倍";
          document.getElementById("author").value = "John";
          document.getElementById("renderProfile").value = "standard";
          document.getElementById("stylePreset").value = "john_vertical_comic";
          document.getElementById("personaPreset").value = "john_persona_v1";
          document.getElementById("ttsProviderId").value = "cosyvoice-mlx";
          if (ttsProviderSelect) ttsProviderSelect.value = "cosyvoice-mlx";
          document.getElementById("ownerToken").value = "john-ai-lab";
          document.getElementById("customVoiceReference").value = "";
          document.getElementById("scriptText").value = "title: 卧推肩疼？先看手肘角度\\nhook: 你卧推一发力肩膀就疼，问题可能不在肩，而在手肘开太大。\\nsummary: 用 45 到 60 度的手肘夹角，让肩更稳、胸更容易发力。\\ndurationSec: 32\\n\\nscene 1\\nvoiceover: 卧推肩疼，很多人第一反应是肩有问题，其实常见原因是手肘开得太平。\\nvisualSuggestion: John 在卧推凳上示范错误动作，手肘外展接近 90 度。\\ndurationSec: 8\\n\\nscene 2\\nvoiceover: 更稳的做法是让上臂和躯干保持大约 45 到 60 度，这样肩膀压力会小很多。\\nvisualSuggestion: John 用线条标出手肘夹角，展示正确角度区间。\\ndurationSec: 12\\n\\nscene 3\\nvoiceover: 下次训练前先录一组侧面视频，对照这个角度检查自己，再决定要不要加重量。\\nvisualSuggestion: John 看回放纠正动作，画面叠加角度参考线。\\ndurationSec: 12\\n\\ncta: 如果你想继续看这种动作纠错短视频，评论区告诉我你最想修哪个动作。";
          syncVoiceStatus();
          saveDraftToStorage();
          await sync();
          resetButtonState(loadDemoBtn);
          setInlineStatus(customVoiceStatus, "演示脚本已载入，可继续试听和创建任务。", "success");
        });

        ttsProviderSelect?.addEventListener("change", async (event) => {
          const selectedProvider = event.currentTarget.value;
          document.getElementById("ttsProviderId").value = selectedProvider;
          syncVoiceStatus();
          saveDraftToStorage();
          appendEvent("已切换 TTS 引擎：" + selectedProvider);
          await sync();
        });

        restoreDraftFromStorage();
        syncVoiceStatus();
        sync();
      </script>
    `,
  });
}

function renderDemoPage() {
  return renderZenPageShell({
    title: "SSE Demo Console",
    eyebrow: "Video-Ops / Progress Stream",
    navItems: pageNav("/demo"),
    extraStyles: sharedPageStyles,
    body: `
      <section class="hero">
        <article class="card">
          <p>保留之前的进度流验收页，用于验证任务状态推送。这里后续也可以接到真正的任务面板里。</p>
          <div class="actions">
            <button class="primary" id="run">Run Demo</button>
            <button class="secondary" id="complete">Complete</button>
            <button class="secondary" id="reset">Reset Log</button>
          </div>
          <div class="event-log" id="log"></div>
        </article>
        <aside class="card">
          <div class="hero-grid">
            <div class="stat"><b>UI</b><span>http://localhost:${port}/demo</span></div>
            <div class="stat"><b>SSE</b><span>/events?jobId=job-1</span></div>
            <div class="stat"><b>Demo Job</b><span>job-1</span></div>
            <div class="stat"><b>Status</b><span id="demoStatus">Disconnected</span></div>
          </div>
        </aside>
      </section>
      <script>
        const log = document.getElementById("log");
        const status = document.getElementById("demoStatus");
        const add = (text) => {
          const el = document.createElement("div");
          el.className = "event-item";
          el.textContent = text;
          log.prepend(el);
        };
        const es = new EventSource("/events?jobId=job-1");
        es.onopen = () => { status.textContent = "Connected"; add("connected"); };
        es.onerror = () => { status.textContent = "Disconnected"; };
        es.addEventListener("job-progress", (evt) => {
          const payload = JSON.parse(evt.data);
          add(payload.timestamp + " | " + payload.jobId + " | " + payload.state + " | " + payload.progress + "%");
        });
        document.getElementById("run").onclick = async () => {
          await fetch("/demo/run", { method: "POST" });
        };
        document.getElementById("complete").onclick = async () => {
          await fetch("/demo/complete", { method: "POST" });
        };
        document.getElementById("reset").onclick = () => { log.innerHTML = ""; };
      </script>
    `,
  });
}

function renderJobDashboardPage() {
  const jobRecords = [...createdJobs.values()].map((item) => item.record);
  const list = buildJobListView(jobRecords.length ? jobRecords : demoJobs);
  const detail = buildJobDetailView(jobRecords[0] ?? demoJobs[0]);

  return renderZenPageShell({
    title: "任务总控台",
    eyebrow: "Video-Ops / 任务面板",
    navItems: pageNav("/jobs"),
    extraStyles: `
${sharedPageStyles}
      .jobs-layout { display: grid; gap: 18px; grid-template-columns: 0.95fr 1.05fr; margin-top: 20px; }
      .job-list { display: grid; gap: 12px; margin-top: 14px; }
      .job-row {
        border: 1px solid rgba(20, 33, 61, 0.08);
        background: rgba(255,255,255,0.62);
        border-radius: 18px;
        padding: 14px;
        cursor: pointer;
        transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
      }
      .job-row:hover { transform: translateY(-1px); box-shadow: 0 10px 30px rgba(20,33,61,.08); }
      .job-row.active { border-color: rgba(255,122,89,.42); box-shadow: 0 12px 32px rgba(255,122,89,.12); }
      .job-row-top, .job-meta, .detail-grid { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
      .job-row-top { justify-content: space-between; margin-bottom: 10px; }
      .job-title { font-family: "Avenir Next", "Trebuchet MS", sans-serif; font-weight: 800; }
      .badge {
        display: inline-flex;
        align-items: center;
        padding: 6px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: .04em;
        text-transform: uppercase;
      }
      .tone-queued { background: rgba(31, 122, 140, 0.12); color: #1f7a8c; }
      .tone-running { background: rgba(255, 184, 77, 0.18); color: #9c5b00; }
      .tone-success { background: rgba(47, 133, 90, 0.14); color: #2f855a; }
      .tone-error { background: rgba(255, 122, 89, 0.14); color: #b94825; }
      .tone-neutral { background: rgba(20, 33, 61, 0.08); color: #51606f; }
      .progress-bar {
        margin-top: 10px;
        height: 10px;
        background: rgba(20,33,61,.08);
        border-radius: 999px;
        overflow: hidden;
      }
      .progress-fill {
        height: 100%;
        border-radius: 999px;
        background: linear-gradient(90deg, #ff7a59, #1f7a8c);
      }
      .job-summary-grid {
        display: grid;
        gap: 8px;
        margin-top: 10px;
      }
      .job-summary-chip {
        display: block;
        border-radius: 12px;
        background: rgba(20,33,61,.05);
        border: 1px solid rgba(20,33,61,.08);
        padding: 8px 10px;
        font-size: 12px;
        color: var(--muted);
        text-align: left;
      }
      .detail-card { display: grid; gap: 14px; }
      .detail-grid { margin-top: 6px; }
      .detail-kv {
        min-width: 160px;
        background: rgba(255,255,255,.58);
        border: 1px solid rgba(20,33,61,.08);
        border-radius: 16px;
        padding: 12px 14px;
      }
      .detail-kv b { display: block; margin-bottom: 6px; color: var(--accent-2); font-size: 12px; text-transform: uppercase; letter-spacing: .05em; }
      .detail-section { display: grid; gap: 10px; }
      .detail-list { display: grid; gap: 8px; }
      @media (max-width: 900px) { .jobs-layout { grid-template-columns: 1fr; } }
    `,
    body: `
      <section class="hero">
        <article class="card">
          <p>这里是 Video-Ops 的任务总控台。你可以直接看到每条视频当前卡在哪一步、用了哪套 TTS 引擎、走的是哪条声音路线，以及最终有没有真正生成可交付产物。</p>
          <div class="hero-grid">
            <div class="stat"><b>任务总数</b><span>${list.length}</span></div>
            <div class="stat"><b>处理中</b><span>${list.filter((item) => item.statusTone === "running").length}</span></div>
            <div class="stat"><b>已完成</b><span>${list.filter((item) => item.statusTone === "success").length}</span></div>
            <div class="stat"><b>需要关注</b><span>${list.filter((item) => item.statusTone === "error").length}</span></div>
          </div>
        </article>
        <aside class="card">
          <p>手动验收重点：</p>
          <div class="summary-list">
            <div class="summary-item">1. 左侧能直接看出任务状态、TTS 引擎和声音路线。</div>
            <div class="summary-item">2. 点击不同任务后，右侧详情会切换到对应的视频生产上下文。</div>
            <div class="summary-item">3. 详情区不只显示原始 checkpoint，还要能让你用大白话读懂任务当前配置。</div>
          </div>
        </aside>
      </section>

      <section class="jobs-layout">
        <section class="card">
          <p>任务列表</p>
          <div class="job-list" id="jobList"></div>
        </section>
        <aside class="card detail-card">
          <p><span id="detailStatus" class="ok">已选任务</span></p>
          <div class="detail-grid" id="detailGrid"></div>
          <div class="detail-section">
            <div class="summary-item">
              <b style="display:block;margin-bottom:8px">任务摘要</b>
              <div class="detail-list" id="checkpointReadableSummary"></div>
            </div>
            <div class="summary-item">
              <b style="display:block;margin-bottom:8px">质量摘要</b>
              <div class="detail-list" id="qualitySummary"></div>
            </div>
            <div class="summary-item">
              <b style="display:block;margin-bottom:8px">成本估算</b>
              <div class="detail-list" id="costSummary"></div>
            </div>
            <div class="summary-item">
              <b style="display:block;margin-bottom:8px">声音策略</b>
              <div class="detail-list" id="ttsStrategySummary"></div>
            </div>
            <div class="summary-item">
              <b style="display:block;margin-bottom:8px">结果解读建议</b>
              <div class="detail-list" id="routeOutcomeSummary"></div>
            </div>
            <div class="summary-item">
              <b style="display:block;margin-bottom:8px">兜底与重跑建议</b>
              <div class="detail-list" id="resilienceSummary"></div>
            </div>
            <div class="summary-item">
              <b style="display:block;margin-bottom:8px">原始检查点</b>
              <pre id="checkpointSummary"></pre>
            </div>
            <div class="summary-item">
              <b style="display:block;margin-bottom:8px">错误信息</b>
              <div class="detail-list" id="errorSummary"></div>
            </div>
            <div class="summary-item">
              <b style="display:block;margin-bottom:8px">产物输出</b>
              <div class="detail-list" id="outputsSummary"></div>
            </div>
          </div>
        </aside>
      </section>

      <script>
        const jobs = ${JSON.stringify(list)};
        const initialDetail = ${JSON.stringify(detail)};

        async function fetchDetail(jobId) {
          const response = await fetch("/api/jobs/" + jobId);
          return response.json();
        }

        function toneClass(tone) {
          return "tone-" + tone;
        }

        function renderList(selectedId) {
          const root = document.getElementById("jobList");
          root.innerHTML = "";
          jobs.forEach((job) => {
            const row = document.createElement("button");
            row.type = "button";
            row.className = "job-row" + (job.id === selectedId ? " active" : "");
            row.innerHTML = [
              '<div class="job-row-top">',
              '  <span class="job-title">' + job.title + '</span>',
              '  <span class="badge ' + toneClass(job.statusTone) + '">' + job.stateLabel + '</span>',
              '</div>',
              '<div class="job-meta">' +
                '<span>' + job.platformLabel + '</span>' +
                '<span>•</span>' +
                '<span>' + job.renderProfileLabel + '</span>' +
                '<span>•</span>' +
                '<span>' + job.updatedLabel + '</span>' +
              '</div>',
              '<div class="job-meta" style="margin-top:8px">' +
                '<span>TTS：' + job.ttsProviderLabel + '</span>' +
                '<span>•</span>' +
                '<span>路线：' + job.ttsRouteLabel + '</span>' +
              '</div>',
              '<div class="job-summary-grid">' +
                '<div class="job-summary-chip">路线定位：' + job.routeRoleLabel + '</div>' +
                '<div class="job-summary-chip">渲染来源：' + job.renderSourceLabel + '</div>' +
                '<div class="job-summary-chip">当前建议：' + job.rerunRecommendationLabel + '</div>' +
              '</div>',
              '<div class="progress-bar"><div class="progress-fill" style="width:' + job.progressLabel + ';"></div></div>',
              '<div class="hint" style="margin-top:8px">任务进度 ' + job.progressLabel + '</div>'
            ].join("");
            row.addEventListener("click", async () => {
              const detail = await fetchDetail(job.id);
              renderDetail(detail);
              renderList(job.id);
            });
            root.appendChild(row);
          });
        }

        function renderDetail(detail) {
          document.getElementById("detailStatus").textContent = detail.stateLabel + " • " + detail.currentStep;
          document.getElementById("detailStatus").className =
            detail.state === "COMPLETED" ? "ok" : (detail.state === "FAILED" || detail.state === "INTERRUPTED" ? "warn" : "ok");

          const grid = document.getElementById("detailGrid");
          const items = [
            ["标题", detail.title],
            ["平台", detail.platform],
            ["档位", detail.renderProfile],
            ["进度", detail.progress + "%"],
            ["TTS 引擎", detail.ttsStrategySummary.providerLabel],
            ["TTS 路线", detail.ttsStrategySummary.routeLabel],
            ["更新时间", detail.updatedLabel],
            ["创建时间", detail.createdLabel],
          ];
          grid.innerHTML = items.map(([k, v]) =>
            '<div class="detail-kv"><b>' + k + '</b><span>' + v + '</span></div>'
          ).join("");

          document.getElementById("checkpointReadableSummary").innerHTML = detail.checkpointReadableSummary
            .map((item) => '<div class="summary-item">' + item + '</div>')
            .join("");
          document.getElementById("qualitySummary").innerHTML = [
            '文件大小：' + detail.qualitySummary.fileSizeLabel,
            '视频时长：' + detail.qualitySummary.durationLabel,
            '分辨率：' + detail.qualitySummary.resolutionLabel,
            '音频状态：' + detail.qualitySummary.audioPresenceLabel,
            '字幕状态：' + detail.qualitySummary.subtitleStatusLabel,
            '产物来源：' + detail.qualitySummary.fallbackStatusLabel,
            '合规状态：' + detail.qualitySummary.complianceStatusLabel,
          ].map((item) => '<div class="summary-item">' + item + '</div>').join("");
          document.getElementById("costSummary").innerHTML = [
            '主图成本：' + detail.costSummary.gptImageUsd,
            '补画面成本：' + detail.costSummary.wanxUsd,
            '语音成本：' + detail.costSummary.ttsUsd,
            '总成本：' + detail.costSummary.totalUsd,
          ].map((item) => '<div class="summary-item">' + item + '</div>').join("");
          document.getElementById("ttsStrategySummary").innerHTML = [
            '声音模式：' + detail.ttsStrategySummary.voiceModeLabel,
            'TTS 引擎：' + detail.ttsStrategySummary.providerLabel,
            '声音路线：' + detail.ttsStrategySummary.routeLabel,
            '路线定位：' + detail.ttsStrategySummary.routeRoleLabel,
            '声音应用方式：' + detail.ttsStrategySummary.cloningLabel,
            '部署策略：' + detail.ttsStrategySummary.deploymentLabel,
            '验收提示：' + detail.ttsStrategySummary.acceptanceHint,
          ].map((item) => '<div class="summary-item">' + item + '</div>').join("");
          document.getElementById("routeOutcomeSummary").innerHTML = [
            '质量重点：' + detail.routeOutcomeSummary.qualityFocusLabel,
            '成本解读：' + detail.routeOutcomeSummary.costInterpretationLabel,
            '验收优先级：' + detail.routeOutcomeSummary.acceptancePriorityLabel,
          ].map((item) => '<div class="summary-item">' + item + '</div>').join("");
          document.getElementById("resilienceSummary").innerHTML = [
            '渲染来源：' + detail.resilienceSummary.renderSourceLabel,
            '兜底解读：' + detail.resilienceSummary.fallbackInterpretationLabel,
            '重跑建议：' + detail.resilienceSummary.rerunRecommendationLabel,
          ].map((item) => '<div class="summary-item">' + item + '</div>').join("");
          document.getElementById("checkpointSummary").textContent = detail.checkpointSummary;
          document.getElementById("errorSummary").innerHTML = detail.errorSummary
            .map((item) => '<div class="summary-item">' + item + '</div>')
            .join("");
          document.getElementById("outputsSummary").innerHTML = detail.outputsSummary
            .map((item) => '<div class="summary-item">' + item + '</div>')
            .join("");
        }

        renderList(initialDetail.id);
        renderDetail(initialDetail);
      </script>
    `,
  });
}

function renderStoryboardPage() {
  const initialPreview = buildStoryboardPreview({
    scenes: storyboardScenes,
    controls: {
      textMode: "original",
      subtitleStyle: SUBTITLE_STYLES[0],
      transitionStyle: TRANSITION_STYLES[1],
    },
  });

  return renderZenPageShell({
    title: "Storyboard Preview",
    eyebrow: "Video-Ops / Sprint 3 / JOH-34",
    navItems: pageNav("/storyboard"),
    extraStyles: `
${sharedPageStyles}
      .story-layout { display: grid; gap: 18px; grid-template-columns: 0.9fr 1.1fr; margin-top: 20px; }
      .control-stack, .story-grid { display: grid; gap: 12px; margin-top: 14px; }
      .story-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .scene-card {
        border-radius: 18px;
        border: 1px solid rgba(20, 33, 61, 0.08);
        background: rgba(255,255,255,0.62);
        padding: 16px;
        display: grid;
        gap: 10px;
      }
      .scene-card h3 { margin: 0; font-size: 18px; }
      .scene-note { color: var(--muted); font-size: 14px; }
      .caption-preview {
        border-radius: 16px;
        padding: 12px 14px;
        font-family: "Avenir Next", "Trebuchet MS", sans-serif;
      }
      .subtitle-minimal { background: rgba(20,33,61,.08); color: var(--ink); }
      .subtitle-bold { background: rgba(255,184,77,.18); color: #7a4700; font-weight: 800; }
      .subtitle-caption-card { background: linear-gradient(135deg, rgba(255,122,89,.2), rgba(31,122,140,.16)); color: #173042; box-shadow: inset 0 0 0 1px rgba(20,33,61,.08); }
      .chip-row { display: flex; gap: 8px; flex-wrap: wrap; }
      .chip {
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(20,33,61,.08);
        font-size: 12px;
        font-weight: 700;
      }
      @media (max-width: 900px) {
        .story-layout, .story-grid { grid-template-columns: 1fr; }
      }
    `,
    body: `
      <section class="hero">
        <article class="card">
          <p>这里是生成前的最后一次人工把关。你可以调整文字表现、字幕样式和转场风格，先看 Storyboard 感觉，再决定是否继续执行渲染。</p>
          <div class="hero-grid">
            <div class="stat"><b>Total Scenes</b><span>${initialPreview.summary.totalScenes}</span></div>
            <div class="stat"><b>Text Mode</b><span id="summaryTextMode">${initialPreview.summary.textMode}</span></div>
            <div class="stat"><b>Subtitle Style</b><span id="summarySubtitle">${initialPreview.summary.subtitleStyle}</span></div>
            <div class="stat"><b>Transition</b><span id="summaryTransition">${initialPreview.summary.transitionStyle}</span></div>
          </div>
        </article>
        <aside class="card">
          <p>手动验收重点：</p>
          <div class="summary-list">
            <div class="summary-item">1. 左侧三个参数都可以切换。</div>
            <div class="summary-item">2. 右侧 Scene 卡片会实时变化，不需要刷新页面。</div>
            <div class="summary-item">3. 每个 Scene 都能看到 narration、视觉提示、时长和转场信息。</div>
          </div>
        </aside>
      </section>

      <section class="story-layout">
        <section class="card">
          <p>Preview Controls</p>
          <div class="control-stack">
            <div class="field">
              <label for="textMode">文字模式 Text Mode</label>
              <select id="textMode">
                <option value="original">original</option>
                <option value="shorten">shorten</option>
                <option value="headline">headline</option>
              </select>
            </div>
            <div class="field">
              <label for="subtitleStyle">字幕样式 Subtitle Style</label>
              <select id="subtitleStyle">
                ${SUBTITLE_STYLES.map((style) => `<option value="${style}">${style}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="transitionStyle">转场风格 Transition Style</label>
              <select id="transitionStyle">
                ${TRANSITION_STYLES.map((style) => `<option value="${style}"${style === "crossfade" ? " selected" : ""}>${style}</option>`).join("")}
              </select>
            </div>
          </div>
        </section>

        <aside class="card">
          <p>Scene Preview</p>
          <div class="story-grid" id="storyGrid"></div>
        </aside>
      </section>

      <script>
        const scenes = ${JSON.stringify(storyboardScenes)};

        function subtitleClass(style) {
          return "subtitle-" + style.replace(/_/g, "-");
        }

        function renderPreview(preview) {
          document.getElementById("summaryTextMode").textContent = preview.summary.textMode;
          document.getElementById("summarySubtitle").textContent = preview.summary.subtitleStyle;
          document.getElementById("summaryTransition").textContent = preview.summary.transitionStyle;

          document.getElementById("storyGrid").innerHTML = preview.cards.map((card) => [
            '<article class="scene-card">',
            '  <h3>' + card.title + '</h3>',
            '  <div class="chip-row">',
            '    <span class="chip">' + card.durationLabel + '</span>',
            '    <span class="chip">' + card.transition + '</span>',
            '    <span class="chip">' + card.subtitleStyle + '</span>',
            '  </div>',
            '  <div class="caption-preview ' + subtitleClass(card.subtitleStyle) + '">' + card.previewCaption + '</div>',
            '  <div><b>Narration</b><p class="scene-note">' + card.narration + '</p></div>',
            '  <div><b>Visual Hint</b><p class="scene-note">' + card.visualHint + '</p></div>',
            '</article>'
          ].join("")).join("");
        }

        async function syncPreview() {
          const payload = {
            scenes,
            controls: {
              textMode: document.getElementById("textMode").value,
              subtitleStyle: document.getElementById("subtitleStyle").value,
              transitionStyle: document.getElementById("transitionStyle").value,
            },
          };

          const response = await fetch("/api/storyboard/preview", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });
          const result = await response.json();
          renderPreview(result);
        }

        ["textMode", "subtitleStyle", "transitionStyle"].forEach((id) => {
          document.getElementById(id).addEventListener("change", syncPreview);
        });

        renderStepGate();
        renderPreview(${JSON.stringify(initialPreview)});
      </script>
    `,
  });
}

function buildDemoComplianceReport() {
  return buildComplianceReport({
    job: {
      id: demoJobs[2].id,
      title: demoJobs[2].title,
      state: demoJobs[2].state,
      platform: demoJobs[2].platform,
      renderProfile: demoJobs[2].renderProfile,
      updatedAt: demoJobs[2].updatedAt,
    },
    compliance: {
      allowed: false,
      violations: [
        {
          type: "keyword",
          rule: "违禁词",
          excerpt: "脚本片段中包含违禁词提示",
        },
      ],
    },
    errors: demoJobs[2].errors,
    outputs: demoJobs[2].outputs,
  });
}

function renderComplianceReportPage() {
  const report = buildDemoComplianceReport();

  return renderZenPageShell({
    title: "Compliance Report Export",
    eyebrow: "Video-Ops / Sprint 3 / JOH-36",
    navItems: pageNav("/compliance-report"),
    extraStyles: `
${sharedPageStyles}
      .report-layout { display: grid; gap: 18px; grid-template-columns: 0.95fr 1.05fr; margin-top: 20px; }
      .report-list { display: grid; gap: 10px; margin-top: 14px; }
      @media (max-width: 900px) { .report-layout { grid-template-columns: 1fr; } }
    `,
    body: `
      <section class="hero">
        <article class="card">
          <p>合规报告页把任务状态、合规检查、错误摘要和产物信息打包成最终可交付物，支持 JSON 和 PDF 两种格式导出。</p>
          <div class="hero-grid">
            <div class="stat"><b>Job</b><span>${report.job.id}</span></div>
            <div class="stat"><b>Allowed</b><span>${report.compliance.allowed ? "YES" : "NO"}</span></div>
            <div class="stat"><b>Violations</b><span>${report.compliance.violationCount}</span></div>
            <div class="stat"><b>Outputs</b><span>${report.outputs.length}</span></div>
          </div>
        </article>
        <aside class="card">
          <p>手动验收重点：</p>
          <div class="summary-list">
            <div class="summary-item">1. 页面能看到任务、合规、错误和输出摘要。</div>
            <div class="summary-item">2. Download JSON 和 Download PDF 两个入口都可用。</div>
            <div class="summary-item">3. 缺字段时也能生成可读报告。</div>
          </div>
        </aside>
      </section>

      <section class="report-layout">
        <section class="card">
          <p>Report Summary</p>
          <div class="report-list">
            <div class="summary-item">Job Title: ${report.job.title}</div>
            <div class="summary-item">State: ${report.job.state}</div>
            <div class="summary-item">Platform: ${report.job.platform}</div>
            <div class="summary-item">Render Profile: ${report.job.renderProfile}</div>
            <div class="summary-item">Updated At: ${report.job.updatedAt}</div>
          </div>
          <div class="actions">
            <button class="primary" id="downloadJson">Download JSON</button>
            <button class="secondary" id="downloadPdf">Download PDF</button>
          </div>
        </section>

        <aside class="card">
          <div class="summary-item">
            <b style="display:block;margin-bottom:8px">Violations</b>
            <div class="report-list">
              ${report.compliance.violations.map((item) => `<div class="summary-item">${item.rule}: ${item.excerpt}</div>`).join("")}
            </div>
          </div>
          <div class="summary-item" style="margin-top:14px">
            <b style="display:block;margin-bottom:8px">Errors</b>
            <div class="report-list">
              ${report.errors.map((item) => `<div class="summary-item">${item.stepName}: ${item.errorMessage} (retry ${item.retryCount})</div>`).join("")}
            </div>
          </div>
          <div class="summary-item" style="margin-top:14px">
            <b style="display:block;margin-bottom:8px">Outputs</b>
            <div class="report-list">
              ${report.outputs.map((item) => `<div class="summary-item">${item.kind}: ${item.path}</div>`).join("")}
            </div>
          </div>
        </aside>
      </section>

      <script>
        async function triggerDownload(path, filename) {
          const response = await fetch(path);
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = filename;
          link.click();
          URL.revokeObjectURL(url);
        }

        document.getElementById("downloadJson").addEventListener("click", async () => {
          await triggerDownload("/api/compliance-report.json", "compliance-report.json");
        });

        document.getElementById("downloadPdf").addEventListener("click", async () => {
          await triggerDownload("/api/compliance-report.pdf", "compliance-report.pdf");
        });
      </script>
    `,
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) {
    return {};
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function pushDemoSequence(sequence) {
  for (const item of sequence) {
    channel.emit(
      createJobProgressPayload({
        jobId: "job-1",
        state: item.state,
        progress: item.progress,
        step: item.step,
        message: item.message,
        meta: item.meta,
        timestamp: new Date().toISOString(),
      }),
    );
  }
}

function storeCreatedJob(job) {
  createdJobs.set(job.record.id, job);
  return job;
}

function getCreatedJob(jobId) {
  return createdJobs.get(jobId);
}

function updateCreatedJob(jobId, updater) {
  const existing = createdJobs.get(jobId);
  if (!existing) {
    return undefined;
  }

  const next = updater(existing);
  createdJobs.set(jobId, next);
  return next;
}

function absoluteFromWorkspace(relativePath) {
  return path.join(workspaceRoot, relativePath);
}

function pickMimeType(filePath) {
  if (filePath.endsWith(".mp4")) return "video/mp4";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".wav")) return "audio/wav";
  return "application/octet-stream";
}

async function readFileSizeSafe(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.size;
  } catch {
    return null;
  }
}

function getComplianceSummaryFromManifest(manifest) {
  const text = manifest?.scenes?.map((scene) => scene.narration).join("\n") ?? "";
  const compliance = runComplianceGuard(text);
  return {
    complianceStatus: compliance.allowed ? "allowed" : "blocked",
    complianceViolations: compliance.violations.length,
  };
}

function getRenderResolution(rendered) {
  const width = rendered?.renderPlan?.spec?.width;
  const height = rendered?.renderPlan?.spec?.height;
  if (!width || !height) {
    return null;
  }
  return `${width}x${height}`;
}

function emitJobProgress(jobId, state, progress, step, message, meta = {}) {
  return channel.emit(
    createJobProgressPayload({
      jobId,
      state,
      progress,
      step,
      message,
      meta,
      timestamp: new Date().toISOString(),
    }),
  );
}

function mergeCheckpoint(base, patch) {
  const baseValue = base && typeof base === "object" ? base : {};
  const patchValue = patch && typeof patch === "object" ? patch : {};
  return {
    ...baseValue,
    ...patchValue,
  };
}

function getLifecycleStepNarration(job) {
  const routeRole = job?.record?.lastCheckpoint && typeof job.record.lastCheckpoint === "object"
    ? job.record.lastCheckpoint.ttsRouteRoleLabel
    : undefined;

  return [
    {
      state: "PARSING",
      progress: 12,
      step: "parse_manifest",
      message:
        routeRole === "高拟真正式产线"
          ? "正在校对正式产线输入，准备后续高拟真渲染链路。"
          : routeRole === "自定义声音保真路线"
            ? "正在解析脚本并检查自定义声音任务所需的基础输入。"
            : "正在读取脚本和任务配置，准备进入视频生产流程。",
    },
    {
      state: "AI_PROCESSING",
      progress: 34,
      step: "storyboard_ready",
      message:
        routeRole === "高拟真正式产线"
          ? "正在整理分镜与正式产线素材包，优先保证最终成片质量。"
          : routeRole === "低成本兜底路线"
            ? "正在准备轻量化素材包，优先保证可交付和生成速度。"
            : "正在整理分镜和素材计划，准备后续画面与声音生产。",
    },
    {
      state: "ASSEMBLING",
      progress: 58,
      step: "build_timeline",
      message:
        routeRole === "自定义声音保真路线"
          ? "正在组装时间线并对齐自定义声音参考，优先保证音色一致性。"
          : "正在组装时间线、画面和本地资产，准备进入最终渲染。",
    },
    {
      state: "RENDERING",
      progress: 82,
      step: "ffmpeg_render",
      message:
        routeRole === "高拟真正式产线"
          ? "正在输出正式成片，请重点等待最终视频而不是中间试听结论。"
          : routeRole === "低成本兜底路线"
            ? "正在输出当前兜底成片，稍后请优先确认是否可继续交付。"
            : "正在输出 MP4 成片，稍后可以直接预览并进入人工验收。",
    },
  ];
}

async function runCreatedJobLifecycle(jobId) {
  const job = getCreatedJob(jobId);
  if (!job) {
    return;
  }

  const steps = getLifecycleStepNarration(job);

  for (const item of steps) {
    updateCreatedJob(jobId, (current) => ({
      ...current,
      record: {
        ...current.record,
        state: item.state,
        progress: item.progress,
        currentStep: item.step,
        updatedAt: new Date().toISOString(),
        lastCheckpoint: mergeCheckpoint(current.record.lastCheckpoint, {
          step: item.step,
          progress: item.progress,
          storyboardScenes: current.storyboard.summary.totalScenes,
          stageNarration: item.message,
        }),
      },
    }));

    emitJobProgress(jobId, item.state, item.progress, item.step, item.message, {
      storyboardScenes: getCreatedJob(jobId)?.storyboard.summary.totalScenes ?? 0,
    });

    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  try {
    const rendered = await renderJobArtifacts({
      jobId,
      manifest: job.manifest,
      mode: "auto",
    });

    const complianceSummary = getComplianceSummaryFromManifest(job.manifest);

    updateCreatedJob(jobId, (current) => ({
      ...current,
      outputPaths: {
        ...current.outputPaths,
        ...{
          videoPath: rendered.outputPackage.video.path,
          coverPath: rendered.outputPackage.cover.path,
          metadataPath: rendered.outputPackage.metadataFile.path,
        },
      },
      record: {
        ...current.record,
        state: "COMPLETED",
        progress: 100,
        currentStep: "done",
        updatedAt: new Date().toISOString(),
        lastCheckpoint: mergeCheckpoint(current.record.lastCheckpoint, {
          step: "done",
          progress: 100,
          previewUrl: rendered.previewUrl,
          provider: rendered.providerMetadata.provider,
          stageNarration:
            rendered.providerMetadata.mode === "fallback"
              ? "任务已完成，但当前成片来自 fallback 渲染链路，请结合路线目标判断是否需要重跑。"
              : "任务已完成，当前成片来自正式主链路，可以进入人工验收。",
          probe: rendered.probe ?? null,
        }),
        qualitySummary: {
          ...(current.record.qualitySummary ?? {}),
          durationSec: rendered.probe?.durationSec ?? null,
          resolution: getRenderResolution(rendered),
          audioPresence: rendered.probe?.streamTypes?.includes("audio") ?? true,
          subtitleStatus: "planned",
          fallbackStatus: rendered.providerMetadata.mode,
          fallbackReason: rendered.providerMetadata.fallbackReason ?? null,
          ...complianceSummary,
        },
        outputs: [
          { kind: "video", path: rendered.outputPackage.video.path, url: rendered.outputPackage.video.url },
          { kind: "cover", path: rendered.outputPackage.cover.path, url: rendered.outputPackage.cover.url },
          {
            kind: "metadata",
            path: rendered.outputPackage.metadataFile.path,
            url: rendered.outputPackage.metadataFile.url,
          },
        ],
      },
      renderResult: rendered,
    }));

    emitJobProgress(jobId, "COMPLETED", 100, "done", "Video render completed", {
      previewUrl: rendered.previewUrl,
      provider: rendered.providerMetadata.provider,
      streamTypes: rendered.probe?.streamTypes ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Renderer failed";
    updateCreatedJob(jobId, (current) => ({
      ...current,
      record: {
        ...current.record,
        state: "FAILED",
        progress: current.record.progress ?? 0,
        currentStep: "render_failed",
        updatedAt: new Date().toISOString(),
        lastCheckpoint: mergeCheckpoint(current.record.lastCheckpoint, {
          step: "render_failed",
          error: message,
        }),
        errors: [
          ...(current.record.errors ?? []),
          { stepName: "render", errorMessage: message, retryCount: 0 },
        ],
      },
    }));

    emitJobProgress(jobId, "FAILED", 100, "render_failed", message);
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(renderWizardPage(url.searchParams.get("step") ?? undefined));
    return;
  }

  if (req.method === "GET" && url.pathname === "/demo") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(renderDemoPage());
    return;
  }

  if (req.method === "GET" && url.pathname === "/jobs") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(renderJobDashboardPage());
    return;
  }

  if ((req.method === "GET" || req.method === "HEAD") && url.pathname.startsWith("/output/")) {
    const relativePath = url.pathname.replace(/^\/+/, "");
    const absolutePath = absoluteFromWorkspace(relativePath);

    if (!existsSync(absolutePath)) {
      sendJson(res, 404, { ok: false, error: "Output file not found" });
      return;
    }

    res.writeHead(200, { "content-type": pickMimeType(absolutePath) });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    createReadStream(absolutePath).pipe(res);
    return;
  }

  if ((req.method === "GET" || req.method === "HEAD") && url.pathname.startsWith("/api/voice-preview/file/")) {
    const relativePath = url.pathname.replace(/^\/api\/voice-preview\/file\//, "");
    const absolutePath = path.join(voicePreviewRoot, relativePath);

    if (!existsSync(absolutePath)) {
      sendJson(res, 404, { ok: false, error: "Voice preview file not found" });
      return;
    }

    res.writeHead(200, {
      "content-type": "audio/wav",
      "cache-control": "public, max-age=86400",
    });
    createReadStream(absolutePath).pipe(res);
    return;
  }

  if ((req.method === "GET" || req.method === "HEAD") && url.pathname.startsWith("/api/custom-voice-reference/file/")) {
    const relativePath = url.pathname.replace(/^\/api\/custom-voice-reference\/file\//, "");
    const absolutePath = buildCustomVoiceReferenceAbsolutePath(decodeURIComponent(relativePath));

    if (!existsSync(absolutePath)) {
      sendJson(res, 404, { ok: false, error: "Custom voice reference file not found" });
      return;
    }

    res.writeHead(200, {
      "content-type": pickMimeType(absolutePath),
      "cache-control": "public, max-age=86400",
    });
    createReadStream(absolutePath).pipe(res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/storyboard") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(renderStoryboardPage());
    return;
  }

  if (req.method === "GET" && url.pathname === "/compliance-report") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(renderComplianceReportPage());
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/wizard/validate") {
    try {
      const payload = await readJsonBody(req);
      const validation = validateWizardConfig(payload);
      if (!validation.valid) {
        sendJson(res, 200, { valid: false, errors: validation.errors });
        return;
      }
      const draft = normalizeWizardConfig(payload);
      const summary = summarizeWizardConfig(draft);
      sendJson(res, 200, { valid: true, errors: [], draft, summary });
    } catch (error) {
      sendJson(res, 400, {
        valid: false,
        errors: [error instanceof Error ? error.message : "Invalid request body."],
      });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/jobs") {
    try {
      const payload = await readJsonBody(req);
      const validation = validateWizardConfig(payload);
      if (!validation.valid) {
        sendJson(res, 400, { ok: false, error: validation.errors.join(" | ") });
        return;
      }

      const draft = normalizeWizardConfig(payload);
      const created = storeCreatedJob(createVideoJobFromDraft(draft));

      const responsePayload = {
        ok: true,
        job: {
          id: created.record.id,
          state: created.record.state,
          progress: created.record.progress,
          currentStep: created.record.currentStep,
        },
        storyboard: created.storyboard,
        manifest: created.manifest,
      };
      sendJson(res, 201, responsePayload);
      setTimeout(() => {
        void runCreatedJobLifecycle(created.record.id);
      }, 0);
    } catch (error) {
      sendJson(res, 400, {
        ok: false,
        error: error instanceof Error ? error.message : "Invalid job payload",
      });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/custom-voice-reference") {
    try {
      const payload = await readJsonBody(req);
      const saved = await saveCustomVoiceReference(payload);
      sendJson(res, 201, {
        ok: true,
        filename: saved.filename,
        previewUrl: saved.relativeUrl,
        mimeType: saved.mimeType,
      });
    } catch (error) {
      sendJson(res, 400, {
        ok: false,
        error: error instanceof Error ? error.message : "Custom voice upload failed",
      });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/voice-preview") {
    try {
      const voiceMode = (url.searchParams.get("voiceMode") ?? "").trim();
      const customVoiceReference = (url.searchParams.get("customVoiceReference") ?? "").trim();
      if (!voiceMode) {
        sendJson(res, 400, { ok: false, error: "voiceMode is required" });
        return;
      }

      const asset = await ensureVoicePreviewAsset({ voiceMode, customVoiceReference });
      const meta = getVoicePreviewMeta(voiceMode);
      sendJson(res, 200, {
        ok: true,
        voiceMode,
        label: meta.label,
        sampleText: meta.sampleText,
        isPreviewPlaceholder: meta.isPreviewPlaceholder,
        previewUrl: asset.relativeUrl,
        usedFallback: asset.usedFallback,
        customVoiceReference: customVoiceReference || undefined,
      });
    } catch (error) {
      sendJson(res, 400, {
        ok: false,
        error: error instanceof Error ? error.message : "Voice preview failed",
      });
    }
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/api/jobs/")) {
    const jobId = url.pathname.replace("/api/jobs/", "");
    const created = getCreatedJob(jobId);
    if (created) {
      const videoPath = created.record.outputs?.find((item) => item.kind === "video")?.path ?? null;
      const fileSizeBytes = videoPath ? await readFileSizeSafe(videoPath) : null;
      const previewUrl =
        created.record.outputs?.find((item) => item.kind === "video")?.url ?? null;
      const hydratedRecord = {
        ...created.record,
        qualitySummary: {
          ...(created.record.qualitySummary ?? {}),
          fileSizeBytes,
        },
      };
      sendJson(res, 200, {
        ...buildJobDetailView(hydratedRecord),
        storyboard: created.storyboard,
        manifest: created.manifest,
        outputPaths: created.outputPaths,
        previewUrl,
        probe: created.renderResult?.probe ?? null,
        rawQualitySummary: hydratedRecord.qualitySummary ?? null,
        rawCostSummary: hydratedRecord.costSummary ?? null,
      });
      return;
    }
    const record = demoJobs.find((job) => job.id === jobId);
    if (!record) {
      sendJson(res, 404, { ok: false, error: "Job not found" });
      return;
    }
    sendJson(res, 200, {
      ...buildJobDetailView(record),
      storyboard: null,
      manifest: null,
      outputPaths: null,
      previewUrl: record.outputs?.find((item) => item.kind === "video")?.url ?? null,
      probe: null,
      rawQualitySummary: record.qualitySummary ?? null,
      rawCostSummary: record.costSummary ?? null,
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/storyboard/preview") {
    try {
      const payload = await readJsonBody(req);
      sendJson(res, 200, buildStoryboardPreview(payload));
    } catch (error) {
      sendJson(res, 400, {
        ok: false,
        error: error instanceof Error ? error.message : "Invalid storyboard payload",
      });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/compliance-report.json") {
    const report = buildDemoComplianceReport();
    res.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="compliance-report.json"',
    });
    res.end(exportComplianceReportJson(report));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/compliance-report.pdf") {
    try {
      const report = buildDemoComplianceReport();
      const pdf = exportComplianceReportPdf(report);
      res.writeHead(200, {
        "content-type": "application/pdf",
        "content-disposition": 'attachment; filename="compliance-report.pdf"',
      });
      res.end(pdf);
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "PDF export failed",
      });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/events") {
    const jobId = url.searchParams.get("jobId") ?? undefined;
    const { stream, close } = createJobProgressStream(channel, jobId);
    res.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    });

    req.on("close", close);
    const reader = stream.getReader();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) res.write(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
      res.end();
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/demo/run") {
    pushDemoSequence([
      { state: "PARSING", progress: 10, step: "parse", message: "Parsing manifest" },
      { state: "AI_PROCESSING", progress: 35, step: "prompt", message: "Generating assets" },
      { state: "ASSEMBLING", progress: 60, step: "timeline", message: "Building timeline" },
    ]);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/demo/complete") {
    pushDemoSequence([
      { state: "RENDERING", progress: 85, step: "ffmpeg", message: "Rendering video" },
      { state: "POST_PROCESSING", progress: 95, step: "verify", message: "Verifying artifacts" },
      { state: "COMPLETED", progress: 100, step: "done", message: "Completed" },
    ]);
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 404, { ok: false, error: "Not found" });
});

server.listen(port, () => {
  console.log(`video-ops UI ready at http://localhost:${port}`);
});

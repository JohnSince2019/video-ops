import { JOB_STATES, type JobState } from "../domain/job-state.js";

export type JobDashboardRecord = {
  id: string;
  title?: string | null;
  state?: string | null;
  platform?: string | null;
  renderProfile?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  progress?: number | null;
  currentStep?: string | null;
  manifestId?: string | null;
  ownerTokenHash?: string | null;
  lastCheckpoint?: unknown;
  qualitySummary?: {
    fileSizeBytes?: number | null;
    durationSec?: number | null;
    resolution?: string | null;
    audioPresence?: boolean | null;
    subtitleStatus?: "embedded" | "planned" | "missing" | null;
    fallbackStatus?: "primary" | "fallback" | null;
    fallbackReason?: string | null;
    complianceStatus?: "allowed" | "blocked" | null;
    complianceViolations?: number | null;
  } | null;
  costSummary?: {
    gptImageUsd: number;
    wanxUsd: number;
    ttsUsd: number;
    totalUsd: number;
  } | null;
  outputs?: Array<{ path: string; kind: string; url?: string }>;
  errors?: Array<{ stepName: string; errorMessage: string; retryCount: number }>;
};

export type JobListItem = {
  id: string;
  title: string;
  state: JobState | "UNKNOWN";
  stateLabel: string;
  platform: string;
  platformLabel: string;
  renderProfile: string;
  renderProfileLabel: string;
  updatedLabel: string;
  progressLabel: string;
  statusTone: "queued" | "running" | "success" | "error" | "neutral";
  ttsProviderLabel: string;
  ttsRouteLabel: string;
  routeRoleLabel: string;
  renderSourceLabel: string;
  rerunRecommendationLabel: string;
  acceptanceFocusLabel: string;
  priorityBucket: "attention" | "running" | "ready" | "queued" | "other";
  priorityBucketLabel: string;
  readyLane: "priority_review" | "standard_review" | null;
  readyLaneLabel: string | null;
  prioritySignals: string[];
  reviewModeLabel: string;
  firstCheckLabel: string;
  reviewPriorityLabel: string;
  reviewRank: number | null;
  reviewRankLabel: string;
};

export type JobDetailView = {
  id: string;
  title: string;
  state: JobState | "UNKNOWN";
  stateLabel: string;
  progress: number;
  currentStep: string;
  platform: string;
  renderProfile: string;
  updatedLabel: string;
  createdLabel: string;
  checkpointSummary: string;
  checkpointReadableSummary: string[];
  errorSummary: string[];
  outputsSummary: string[];
  ttsStrategySummary: {
    providerLabel: string;
    routeLabel: string;
    routeRoleLabel: string;
    acceptanceHint: string;
    voiceModeLabel: string;
    cloningLabel: string;
    deploymentLabel: string;
  };
  qualitySummary: {
    fileSizeLabel: string;
    durationLabel: string;
    resolutionLabel: string;
    audioPresenceLabel: string;
    subtitleStatusLabel: string;
    fallbackStatusLabel: string;
    complianceStatusLabel: string;
  };
  costSummary: {
    gptImageUsd: string;
    wanxUsd: string;
    ttsUsd: string;
    totalUsd: string;
  };
  routeOutcomeSummary: {
    qualityFocusLabel: string;
    costInterpretationLabel: string;
    acceptancePriorityLabel: string;
  };
  resilienceSummary: {
    renderSourceLabel: string;
    fallbackInterpretationLabel: string;
    rerunRecommendationLabel: string;
  };
  reviewContext: {
    bucketLabel: string;
    laneLabel: string;
    firstCheckLabel: string;
    reviewPriorityLabel: string;
    reviewModeLabel: string;
    reviewRankLabel: string;
  };
  acceptanceAssistant: {
    heroLabel: string;
    readinessLabel: string;
    reviewModeLabel: string;
    primaryActionLabel: string;
    secondaryActionLabel: string;
    primaryChecks: string[];
    blockerLabel: string;
    nextActionLabel: string;
  };
};

type JobDetailContext = {
  reviewRank?: number | null;
};

export type JobAcceptanceLead = {
  jobId: string;
  title: string;
  reviewRankLabel: string;
  firstCheckLabel: string;
  reviewPriorityLabel: string;
  reviewModeLabel: string;
  reasonLabel: string;
};

function normalizeState(state?: string | null): JobState | "UNKNOWN" {
  if (state && JOB_STATES.includes(state as JobState)) {
    return state as JobState;
  }

  return "UNKNOWN";
}

function formatDateLabel(value?: string | null) {
  if (!value) {
    return "未知时间";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "未知时间";
  }

  return date.toISOString().replace("T", " ").slice(0, 16);
}

function getStatusTone(state: JobState | "UNKNOWN"): JobListItem["statusTone"] {
  if (state === "QUEUED") return "queued";
  if (state === "COMPLETED") return "success";
  if (state === "FAILED" || state === "INTERRUPTED") return "error";
  if (
    state === "PARSING" ||
    state === "AI_PROCESSING" ||
    state === "ASSEMBLING" ||
    state === "RENDERING" ||
    state === "POST_PROCESSING"
  ) {
    return "running";
  }

  return "neutral";
}

function stringifyCheckpoint(checkpoint: unknown) {
  if (!checkpoint) {
    return "当前还没有记录到任务检查点。";
  }

  if (typeof checkpoint === "string") {
    return checkpoint;
  }

  try {
    return JSON.stringify(checkpoint, null, 2);
  } catch {
    return "检查点数据暂时不可读。";
  }
}

function buildCheckpointReadableSummary(checkpoint: unknown) {
  if (!checkpoint || typeof checkpoint !== "object") {
    return ["当前还没有任务检查点。"];
  }

  const data = checkpoint as Record<string, unknown>;
  const lines: string[] = [];
  if (typeof data.step === "string") {
    lines.push(`当前阶段：${formatWorkflowStepLabel(data.step)}`);
  }
  if (typeof data.voiceMode === "string") {
    lines.push(`声音模式：${formatVoiceModeLabel(data.voiceMode)}`);
  }
  if (typeof data.ttsProviderId === "string") {
    lines.push(`TTS 引擎：${formatTtsProviderLabel(data.ttsProviderId)}`);
  }
  if (typeof data.ttsRouteLabel === "string") {
    lines.push(`TTS 路线：${data.ttsRouteLabel}`);
  }
  if (typeof data.ttsRouteRoleLabel === "string") {
    lines.push(`路线定位：${data.ttsRouteRoleLabel}`);
  }
  if (typeof data.ttsAcceptanceHint === "string") {
    lines.push(`验收提示：${data.ttsAcceptanceHint}`);
  }
  if (typeof data.customVoiceReference === "string" && data.customVoiceReference) {
    lines.push(`声音参考：${data.customVoiceReference}`);
  }
  if (typeof data.stylePreset === "string") {
    lines.push(`视觉风格：${formatStylePresetLabel(data.stylePreset)}`);
  }
  if (typeof data.personaPreset === "string") {
    lines.push(`人物预设：${formatPersonaPresetLabel(data.personaPreset)}`);
  }
  if (typeof data.progress === "number") {
    lines.push(`任务进度：${data.progress}%`);
  }
  if (typeof data.storyboardScenes === "number") {
    lines.push(`分镜数量：${data.storyboardScenes}`);
  }
  if (typeof data.stageNarration === "string") {
    lines.push(`当前说明：${data.stageNarration}`);
  }
  if (typeof data.previewUrl === "string") {
    lines.push("预览视频已生成。");
  }

  return lines.length ? lines : ["当前检查点包含底层数据，但还没有可读摘要。"];
}

function formatUsd(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "$0.0000";
  }

  return `$${value.toFixed(4)}`;
}

function formatFileSize(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "未生成";
  }

  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(2)} MB`;
  }

  if (value >= 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${value} B`;
}

function readCheckpointField(checkpoint: unknown, key: string) {
  if (!checkpoint || typeof checkpoint !== "object") {
    return undefined;
  }

  const value = (checkpoint as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function formatVoiceModeLabel(value?: string) {
  const labels: Record<string, string> = {
    male_coach_deep: "男声教练沉稳",
    male_clear_teacher: "男声老师清晰",
    female_warm_narrator: "女声旁白温和",
    female_energetic_creator: "女声创作者活力",
    male_storytelling_soft: "男声叙事柔和",
    custom_reference: "自定义声音",
  };

  return labels[value || ""] || "未设置";
}

function formatTtsProviderLabel(value?: string) {
  const labels: Record<string, string> = {
    "cosyvoice-mlx": "CosyVoice MLX",
    "f5-tts": "F5-TTS",
    melotts: "MeloTTS",
  };

  return labels[value || ""] || "未设置";
}

function formatTtsCloningLabel(value?: string) {
  if (value === "custom_reference") {
    return "使用参考音频克隆";
  }

  if (value) {
    return "使用预设音色";
  }

  return "未设置";
}

function formatTtsDeploymentLabel(providerId?: string) {
  if (providerId === "cosyvoice-mlx") {
    return "本地与云端都可落地";
  }
  if (providerId === "f5-tts") {
    return "适合云端 SaaS";
  }
  if (providerId === "melotts") {
    return "适合作为低成本 fallback";
  }
  return "未设置";
}

function formatTtsRouteRoleLabel(value?: string) {
  return value?.trim() || "未设置";
}

function formatTtsAcceptanceHint(value?: string) {
  return value?.trim() || "未设置";
}

function formatRouteQualityFocus(routeRole?: string) {
  if (routeRole === "高拟真正式产线") {
    return "优先关注最终成片自然度与整体观感，不用过度依赖即时试听。";
  }
  if (routeRole === "低成本兜底路线") {
    return "优先关注结果可用性、节奏是否完整，以及是否满足兜底交付。";
  }
  if (routeRole === "自定义声音保真路线") {
    return "优先关注音色一致性、辨识度和参考音频复现程度。";
  }
  return "优先关注自然度、清晰度和是否符合当前工作台预期。";
}

function formatRouteCostInterpretation(routeRole?: string) {
  if (routeRole === "高拟真正式产线") {
    return "这类路线通常接受更高语音成本，重点换取更稳定的正式发布质量。";
  }
  if (routeRole === "低成本兜底路线") {
    return "这类路线更强调成本可控，适合批量出样或主链路失败时兜底。";
  }
  if (routeRole === "自定义声音保真路线") {
    return "这类路线的成本解释要结合音色保真价值，而不只看单次语音价格。";
  }
  return "这类路线适合在试听效率和生产成本之间保持平衡。";
}

function formatRouteAcceptancePriority(routeRole?: string) {
  if (routeRole === "高拟真正式产线") {
    return "先看最终成片效果，再决定是否通过人工验收。";
  }
  if (routeRole === "低成本兜底路线") {
    return "先看是否可交付、可继续生产，再决定是否升级到更高质量路线。";
  }
  if (routeRole === "自定义声音保真路线") {
    return "先确认声音像不像本人，再看整体视频节奏和画面是否匹配。";
  }
  return "可以先听工作台试听，再结合成片做最终验收。";
}

function formatRenderSourceLabel(record: JobDashboardRecord) {
  if (record.qualitySummary?.fallbackStatus === "fallback") {
    return "当前产物来自 fallback 渲染链路";
  }
  if (record.qualitySummary?.fallbackStatus === "primary") {
    return "当前产物来自正式主渲染链路";
  }
  return "当前还没有明确的渲染来源结论";
}

function formatFallbackInterpretation(record: JobDashboardRecord) {
  const fallbackReason = record.qualitySummary?.fallbackReason?.trim();
  const routeRole = readCheckpointField(record.lastCheckpoint, "ttsRouteRoleLabel");

  if (record.qualitySummary?.fallbackStatus === "fallback") {
    if (routeRole === "高拟真正式产线") {
      return `这条任务原本追求正式产线质量，但本次已退回 fallback${fallbackReason ? `：${fallbackReason}` : ""}，建议谨慎验收最终自然度。`;
    }
    if (routeRole === "低成本兜底路线") {
      return `这条任务本来就允许兜底交付${fallbackReason ? `：${fallbackReason}` : ""}，重点确认结果是否仍可继续使用。`;
    }
    return `这条任务本次走了 fallback${fallbackReason ? `：${fallbackReason}` : ""}，需要结合路线目标判断是否接受。`;
  }

  if (record.qualitySummary?.fallbackStatus === "primary") {
    return "这条任务仍然保持在正式主链路产出，当前不需要因为渲染来源而降级判断。";
  }

  return "当前还没有足够信息解释渲染来源是否发生了降级。";
}

function formatRerunRecommendation(record: JobDashboardRecord) {
  const routeRole = readCheckpointField(record.lastCheckpoint, "ttsRouteRoleLabel");
  const isFallback = record.qualitySummary?.fallbackStatus === "fallback";
  const isFailed = normalizeState(record.state) === "FAILED" || normalizeState(record.state) === "INTERRUPTED";

  if (isFailed && routeRole === "高拟真正式产线") {
    return "建议优先排查正式产线依赖并重跑，不要直接接受降级结果。";
  }
  if (isFallback && routeRole === "高拟真正式产线") {
    return "如果这条内容要正式发布，建议修复主链路后重跑，避免长期接受 fallback 成片。";
  }
  if (isFallback && routeRole === "低成本兜底路线") {
    return "如果当前成片可用，可以先交付；如果观感不够，再升级到更高质量路线重跑。";
  }
  if (routeRole === "自定义声音保真路线" && (isFallback || isFailed)) {
    return "建议先确认参考音频和音色克隆链路是否稳定，再决定是否重跑。";
  }
  return "当前没有强制重跑信号，可以先按路线目标做人工验收。";
}

function formatListAcceptanceFocus(record: JobDashboardRecord) {
  const state = normalizeState(record.state);
  const routeRole = readCheckpointField(record.lastCheckpoint, "ttsRouteRoleLabel");
  const voiceMode = readCheckpointField(record.lastCheckpoint, "voiceMode");
  const audioPresence = record.qualitySummary?.audioPresence;
  const subtitleStatus = record.qualitySummary?.subtitleStatus;
  const fallbackStatus = record.qualitySummary?.fallbackStatus;

  if (state === "FAILED" || state === "INTERRUPTED") {
    return "先查失败步骤和重跑条件，这条任务暂时不适合直接人工验收。";
  }
  if (audioPresence === false) {
    return "先查音频链路，确认配音是否真正写进了成片。";
  }
  if (voiceMode === "custom_reference" || routeRole === "自定义声音保真路线") {
    return "先听音色像不像本人，再决定要不要继续验收画面节奏。";
  }
  if (fallbackStatus === "fallback" && routeRole === "高拟真正式产线") {
    return "先看 fallback 是否影响正式发布质量，必要时优先重跑主链路。";
  }
  if (fallbackStatus === "fallback") {
    return "先判断这份 fallback 成片够不够交付，再决定是否升级重跑。";
  }
  if (subtitleStatus === "missing") {
    return "先查字幕缺失，再看声音和画面节奏是否还值得继续验收。";
  }
  if (state === "COMPLETED") {
    if (routeRole === "高拟真正式产线") {
      return "可直接进人工验收，先看成片自然度和整体完成度。";
    }
    return "可直接进人工验收，先听声音和镜头节奏是否匹配。";
  }
  if (
    state === "PARSING" ||
    state === "AI_PROCESSING" ||
    state === "ASSEMBLING" ||
    state === "RENDERING" ||
    state === "POST_PROCESSING"
  ) {
    return "先看当前处理步骤是否顺畅，等成片落地后再做正式人工验收。";
  }

  return "先确认路线和产物状态，再决定优先验声音还是优先验成片。";
}

function resolvePriorityBucket(record: JobDashboardRecord): JobListItem["priorityBucket"] {
  const state = normalizeState(record.state);
  const audioPresence = record.qualitySummary?.audioPresence;
  const subtitleStatus = record.qualitySummary?.subtitleStatus;
  const fallbackStatus = record.qualitySummary?.fallbackStatus;

  if (state === "FAILED" || state === "INTERRUPTED" || audioPresence === false || subtitleStatus === "missing") {
    return "attention";
  }
  if (
    state === "PARSING" ||
    state === "AI_PROCESSING" ||
    state === "ASSEMBLING" ||
    state === "RENDERING" ||
    state === "POST_PROCESSING"
  ) {
    return "running";
  }
  if (state === "COMPLETED") {
    return fallbackStatus === "fallback" ? "attention" : "ready";
  }
  if (state === "QUEUED") {
    return "queued";
  }
  return "other";
}

function formatPriorityBucketLabel(bucket: JobListItem["priorityBucket"]) {
  const labels: Record<JobListItem["priorityBucket"], string> = {
    attention: "优先关注",
    running: "处理中",
    ready: "可验收",
    queued: "待开始",
    other: "其他任务",
  };

  return labels[bucket];
}

function resolveReadyLane(record: JobDashboardRecord, bucket: JobListItem["priorityBucket"]): JobListItem["readyLane"] {
  if (bucket !== "ready") {
    return null;
  }

  const routeRole = readCheckpointField(record.lastCheckpoint, "ttsRouteRoleLabel");
  const voiceMode = readCheckpointField(record.lastCheckpoint, "voiceMode");
  const renderProfile = record.renderProfile?.trim();

  if (
    voiceMode === "custom_reference" ||
    routeRole === "自定义声音保真路线" ||
    routeRole === "高拟真正式产线" ||
    renderProfile === "high_quality"
  ) {
    return "priority_review";
  }

  return "standard_review";
}

function formatReadyLaneLabel(lane: JobListItem["readyLane"]) {
  const labels: Record<NonNullable<JobListItem["readyLane"]>, string> = {
    priority_review: "优先人工验收",
    standard_review: "普通验收",
  };

  return lane ? labels[lane] : null;
}

function buildPrioritySignals(record: JobDashboardRecord, lane: JobListItem["readyLane"]) {
  if (lane !== "priority_review") {
    return [];
  }

  const routeRole = readCheckpointField(record.lastCheckpoint, "ttsRouteRoleLabel");
  const voiceMode = readCheckpointField(record.lastCheckpoint, "voiceMode");
  const signals: string[] = [];

  if (voiceMode === "custom_reference" || routeRole === "自定义声音保真路线") {
    signals.push("自定义声音");
  }
  if (routeRole === "高拟真正式产线") {
    signals.push("正式产线");
  }
  if (record.renderProfile?.trim() === "high_quality") {
    signals.push("高质量档位");
  }

  return signals;
}

function buildReviewModeLabel(record: JobDashboardRecord) {
  const state = normalizeState(record.state);
  const routeRole = readCheckpointField(record.lastCheckpoint, "ttsRouteRoleLabel");
  const voiceMode = readCheckpointField(record.lastCheckpoint, "voiceMode");
  const audioPresence = record.qualitySummary?.audioPresence;
  const fallbackStatus = record.qualitySummary?.fallbackStatus;

  if (state === "FAILED" || state === "INTERRUPTED") {
    return "故障处理模式";
  }
  if (state !== "COMPLETED") {
    return "进度观察模式";
  }
  if (audioPresence === false) {
    return "音频排查模式";
  }
  if (voiceMode === "custom_reference" || routeRole === "自定义声音保真路线") {
    return "自定义声音验收";
  }
  if (fallbackStatus === "fallback") {
    return "谨慎验收模式";
  }
  if (routeRole === "高拟真正式产线" || record.renderProfile?.trim() === "high_quality") {
    return "正式发布验收";
  }
  return "常规验收模式";
}

function buildFirstCheckLabel(record: JobDashboardRecord) {
  const state = normalizeState(record.state);
  const routeRole = readCheckpointField(record.lastCheckpoint, "ttsRouteRoleLabel");
  const voiceMode = readCheckpointField(record.lastCheckpoint, "voiceMode");
  const audioPresence = record.qualitySummary?.audioPresence;
  const fallbackStatus = record.qualitySummary?.fallbackStatus;

  if (state === "FAILED" || state === "INTERRUPTED") {
    return "先查失败步骤";
  }
  if (state !== "COMPLETED") {
    return "先看进度卡点";
  }
  if (audioPresence === false) {
    return "先修音频链路";
  }
  if (voiceMode === "custom_reference" || routeRole === "自定义声音保真路线") {
    return "先验音色像不像本人";
  }
  if (fallbackStatus === "fallback" && routeRole === "高拟真正式产线") {
    return "先验 fallback 风险";
  }
  if (routeRole === "高拟真正式产线" || record.renderProfile?.trim() === "high_quality") {
    return "先验成片自然度";
  }
  return "先验声音和节奏";
}

function buildReviewPriorityLabel(record: JobDashboardRecord) {
  const state = normalizeState(record.state);
  const routeRole = readCheckpointField(record.lastCheckpoint, "ttsRouteRoleLabel");
  const voiceMode = readCheckpointField(record.lastCheckpoint, "voiceMode");
  const audioPresence = record.qualitySummary?.audioPresence;
  const fallbackStatus = record.qualitySummary?.fallbackStatus;

  if (state === "FAILED" || state === "INTERRUPTED") {
    return "最高优先处理";
  }
  if (audioPresence === false) {
    return "先补关键缺口";
  }
  if (voiceMode === "custom_reference" || routeRole === "自定义声音保真路线") {
    return "优先听声音";
  }
  if (fallbackStatus === "fallback") {
    return "优先看降级风险";
  }
  if (routeRole === "高拟真正式产线" || record.renderProfile?.trim() === "high_quality") {
    return "优先看发布质量";
  }
  if (state === "COMPLETED") {
    return "可以常规验收";
  }
  if (state === "QUEUED") {
    return "等待系统开始";
  }
  return "先看当前进度";
}

function computeReviewPriorityScore(record: JobDashboardRecord) {
  const state = normalizeState(record.state);
  const routeRole = readCheckpointField(record.lastCheckpoint, "ttsRouteRoleLabel");
  const voiceMode = readCheckpointField(record.lastCheckpoint, "voiceMode");
  const audioPresence = record.qualitySummary?.audioPresence;
  const subtitleStatus = record.qualitySummary?.subtitleStatus;
  const fallbackStatus = record.qualitySummary?.fallbackStatus;
  const renderProfile = record.renderProfile?.trim();
  const progress =
    typeof record.progress === "number" && Number.isFinite(record.progress)
      ? Math.max(0, Math.min(100, Math.round(record.progress)))
      : 0;

  let score = 0;

  if (state === "FAILED" || state === "INTERRUPTED") score += 100;
  if (audioPresence === false) score += 95;
  if (subtitleStatus === "missing") score += 85;
  if (voiceMode === "custom_reference" || routeRole === "自定义声音保真路线") score += 82;
  if (routeRole === "高拟真正式产线") score += 78;
  if (renderProfile === "high_quality") score += 74;
  if (fallbackStatus === "fallback") score += 72;
  if (state === "COMPLETED") score += 60;
  if (
    state === "PARSING" ||
    state === "AI_PROCESSING" ||
    state === "ASSEMBLING" ||
    state === "RENDERING" ||
    state === "POST_PROCESSING"
  ) {
    score += 30 + Math.floor(progress / 10);
  }
  if (state === "QUEUED") score += 10;

  return score;
}

function formatReviewRankLabel(rank: number | null, lane: JobListItem["readyLane"]) {
  if (!rank || !lane) {
    return "当前不参与人工验收顺位";
  }

  if (lane === "priority_review") {
    return `优先人工验收第 ${rank} 位`;
  }

  return `普通验收第 ${rank} 位`;
}

function buildLeadReasonLabel(item: JobListItem) {
  if (item.prioritySignals.length) {
    return `因为它带有：${item.prioritySignals.join(" / ")}`;
  }
  if (item.priorityBucket === "attention") {
    return "因为它存在需要先处理的风险或缺口";
  }
  if (item.readyLane === "priority_review") {
    return "因为它属于更值得先人工把关的任务";
  }
  if (item.readyLane === "standard_review") {
    return "因为它已经具备基础验收条件";
  }
  if (item.priorityBucket === "running") {
    return "因为它现在最需要先看进度是否卡住";
  }
  return "因为它当前最值得你优先查看";
}

function buildAcceptanceAssistant(record: JobDashboardRecord) {
  const state = normalizeState(record.state);
  const routeRole = readCheckpointField(record.lastCheckpoint, "ttsRouteRoleLabel");
  const voiceMode = readCheckpointField(record.lastCheckpoint, "voiceMode");
  const audioPresence = record.qualitySummary?.audioPresence;
  const subtitleStatus = record.qualitySummary?.subtitleStatus;
  const fallbackStatus = record.qualitySummary?.fallbackStatus;

  if (state === "FAILED" || state === "INTERRUPTED") {
    return {
      heroLabel: "暂时不建议人工验收",
      readinessLabel: "当前更适合先修复任务问题，再进入人工验收。",
      reviewModeLabel: "故障处理模式",
      primaryActionLabel: "先查错误",
      secondaryActionLabel: "再决定是否重跑",
      primaryChecks: [
        "先看失败步骤和报错信息，确认问题发生在声音、画面还是渲染阶段。",
        "先判断这次失败是否需要直接重跑，还是应该先修配置再重试。",
      ],
      blockerLabel: "当前阻塞：任务还没有产出稳定成片。",
      nextActionLabel: "下一步建议：先处理错误和重跑条件。",
    };
  }

  if (state !== "COMPLETED") {
    return {
      heroLabel: "先关注进度，不急着人工验收",
      readinessLabel: "当前任务还在处理中，先看阶段进展和系统是否顺畅推进。",
      reviewModeLabel: "进度观察模式",
      primaryActionLabel: "先看进度",
      secondaryActionLabel: "再等成片落地",
      primaryChecks: [
        "先看当前步骤是否停滞，确认任务有没有卡在解析、合成或渲染阶段。",
        "先看阶段说明是否符合预期，再决定要不要继续等待或介入处理。",
      ],
      blockerLabel: "当前阻塞：正式成片还没有完全落地。",
      nextActionLabel: "下一步建议：继续观察进度，等成片完成后再进入人工验收。",
    };
  }

  if (audioPresence === false) {
    return {
      heroLabel: "先补音频，再谈人工验收",
      readinessLabel: "成片缺少音频，当前不建议直接通过人工验收。",
      reviewModeLabel: "音频排查模式",
      primaryActionLabel: "先修音频",
      secondaryActionLabel: "再回看成片",
      primaryChecks: [
        "先回看第 4 步声音应用是否成功，确认 TTS 是否真正产出了音轨。",
        "再确认渲染阶段有没有把音频正确合入最终 MP4。",
      ],
      blockerLabel: "当前阻塞：成片无音频。",
      nextActionLabel: "下一步建议：先修声音链路，再重看成片。",
    };
  }

  if (voiceMode === "custom_reference" || routeRole === "自定义声音保真路线") {
    return {
      heroLabel: "建议现在优先人工验收",
      readinessLabel: "这条任务适合你先手动验收，而且第一优先级是听音色像不像本人。",
      reviewModeLabel: "自定义声音验收",
      primaryActionLabel: "先听声音",
      secondaryActionLabel: "再看成片",
      primaryChecks: [
        "先听音色一致性和辨识度，不要先被画面节奏分散注意力。",
        "再看声音和镜头节奏是否匹配，确认不是只有音色像但整体观感不顺。",
      ],
      blockerLabel: "当前风险：参考音频稳定性会直接影响最终验收结果。",
      nextActionLabel: "下一步建议：先听声音，再决定是否继续验收画面与字幕。",
    };
  }

  if (fallbackStatus === "fallback") {
    return {
      heroLabel: "可以人工验收，但要谨慎",
      readinessLabel: "这条成片已经能看，但当前带有 fallback 痕迹，建议带着风险意识验收。",
      reviewModeLabel: "谨慎验收模式",
      primaryActionLabel: "先看成片",
      secondaryActionLabel: "再判断是否重跑",
      primaryChecks: [
        "先看 fallback 是否影响正式发布质量，再决定是否接受当前结果。",
        "再看字幕、画面节奏和声音自然度，确认是不是还能继续交付。",
      ],
      blockerLabel: "当前风险：渲染链路发生过降级。",
      nextActionLabel: "下一步建议：如果观感不够稳定，优先考虑重跑主链路。",
    };
  }

  if (routeRole === "高拟真正式产线" || record.renderProfile?.trim() === "high_quality") {
    return {
      heroLabel: "建议现在优先人工验收",
      readinessLabel: "这条成片已经具备验收条件，而且更值得你优先把关最终发布质量。",
      reviewModeLabel: "正式发布验收",
      primaryActionLabel: "先看成片",
      secondaryActionLabel: "再听细节",
      primaryChecks: [
        "先看整体成片自然度和完成度，而不是只听某一段声音样本。",
        "再看字幕、镜头节奏和画面观感，确认它是否真的达到了正式发布标准。",
      ],
      blockerLabel: "当前风险：高质量路线的验收标准更高，不能只看“能播”。",
      nextActionLabel: "下一步建议：按正式发布标准完整看完一遍成片。",
    };
  }

  return {
    heroLabel: "可以开始人工验收",
    readinessLabel: "这条任务已经具备基本验收条件，适合先听声音，再看成片节奏。",
    reviewModeLabel: "常规验收模式",
    primaryActionLabel: "先听声音",
    secondaryActionLabel: "再看成片",
    primaryChecks: [
      "先听声音自然度和语速是否合适，再确认是否需要回退到声音策略层面。",
      "再看字幕、镜头节奏和整体观感，判断是否可以继续交付。",
    ],
    blockerLabel: subtitleStatus === "missing" ? "当前风险：字幕仍缺失，可能影响最终观感。" : "当前没有明显阻塞，可以进入常规人工验收。",
    nextActionLabel: "下一步建议：按声音、字幕、画面顺序快速验一遍。",
  };
}

function formatWorkflowStepLabel(step?: string) {
  const labels: Record<string, string> = {
    waiting_for_worker: "等待系统开始处理",
    wizard_submission: "已提交创作任务",
    parse_manifest: "解析脚本与任务单",
    parsing: "解析脚本内容",
    storyboard_ready: "分镜已准备完成",
    image_generation: "生成画面素材",
    build_timeline: "组装视频时间线",
    tts_generation: "生成配音音频",
    ffmpeg_render: "渲染 MP4 视频",
    render_failed: "渲染失败待处理",
    post_processing: "整理最终产物",
    done: "任务已完成",
  };

  return labels[step || ""] || step || "当前暂无执行步骤";
}

function formatStylePresetLabel(value?: string) {
  const labels: Record<string, string> = {
    john_vertical_comic: "John 竖屏讲解风格",
  };

  return labels[value || ""] || value || "未设置";
}

function formatPersonaPresetLabel(value?: string) {
  const labels: Record<string, string> = {
    john_persona_v1: "John 专属人物形象",
  };

  return labels[value || ""] || value || "未设置";
}

function formatOutputKindLabel(kind?: string) {
  const labels: Record<string, string> = {
    video: "视频文件",
    cover: "封面图",
    metadata: "元数据文件",
  };

  return labels[kind || ""] || kind || "未知产物";
}

function formatErrorStepLabel(step?: string) {
  return formatWorkflowStepLabel(step);
}

function formatStateLabel(state: JobState | "UNKNOWN") {
  const labels: Record<JobState | "UNKNOWN", string> = {
    QUEUED: "排队中",
    PARSING: "解析中",
    AI_PROCESSING: "AI 处理中",
    ASSEMBLING: "装配中",
    RENDERING: "渲染中",
    POST_PROCESSING: "后处理",
    COMPLETED: "已完成",
    FAILED: "失败",
    INTERRUPTED: "已中断",
    UNKNOWN: "未知",
  };

  return labels[state];
}

function formatPlatformLabel(platform: string) {
  if (!platform || platform === "unknown-platform") {
    return "未知平台";
  }

  const labels: Record<string, string> = {
    douyin: "抖音",
    xiaohongshu: "小红书",
    videox: "微信视频号 / B站",
  };

  return labels[platform] || platform;
}

function formatRenderProfileLabel(profile: string) {
  if (!profile || profile === "unknown-profile") {
    return "未知档位";
  }

  const labels: Record<string, string> = {
    draft: "草稿",
    standard: "标准",
    high_quality: "高质量",
  };

  return labels[profile] || profile;
}

export function buildJobListView(records: JobDashboardRecord[]): JobListItem[] {
  const sorted = records
    .map((record, index) => {
    const state = normalizeState(record.state);
    const priorityBucket = resolvePriorityBucket(record);
    const readyLane = resolveReadyLane(record, priorityBucket);
    const progressValue =
      typeof record.progress === "number" && Number.isFinite(record.progress)
        ? Math.max(0, Math.min(100, Math.round(record.progress)))
        : state === "COMPLETED"
          ? 100
          : 0;

    return {
      id: record.id,
      title: record.title?.trim() || `未命名任务 ${index + 1}`,
      state,
      stateLabel: formatStateLabel(state),
      platform: record.platform?.trim() || "unknown-platform",
      platformLabel: formatPlatformLabel(record.platform?.trim() || "unknown-platform"),
      renderProfile: record.renderProfile?.trim() || "unknown-profile",
      renderProfileLabel: formatRenderProfileLabel(record.renderProfile?.trim() || "unknown-profile"),
      updatedLabel: formatDateLabel(record.updatedAt),
      progressLabel: `${progressValue}%`,
      statusTone: getStatusTone(state),
      ttsProviderLabel: formatTtsProviderLabel(readCheckpointField(record.lastCheckpoint, "ttsProviderId")),
      ttsRouteLabel: readCheckpointField(record.lastCheckpoint, "ttsRouteLabel") || "未设置",
      routeRoleLabel: formatTtsRouteRoleLabel(readCheckpointField(record.lastCheckpoint, "ttsRouteRoleLabel")),
      renderSourceLabel: formatRenderSourceLabel(record),
      rerunRecommendationLabel: formatRerunRecommendation(record),
      acceptanceFocusLabel: formatListAcceptanceFocus(record),
      priorityBucket,
      priorityBucketLabel: formatPriorityBucketLabel(priorityBucket),
      readyLane,
      readyLaneLabel: formatReadyLaneLabel(readyLane),
      prioritySignals: buildPrioritySignals(record, readyLane),
      reviewModeLabel: buildReviewModeLabel(record),
      firstCheckLabel: buildFirstCheckLabel(record),
      reviewPriorityLabel: buildReviewPriorityLabel(record),
      reviewRank: null,
      reviewRankLabel: "当前不参与人工验收顺位",
    };
    })
    .sort((left, right) => {
      const leftRecord = records.find((item) => item.id === left.id);
      const rightRecord = records.find((item) => item.id === right.id);
      const leftScore = leftRecord ? computeReviewPriorityScore(leftRecord) : 0;
      const rightScore = rightRecord ? computeReviewPriorityScore(rightRecord) : 0;
      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }
      return left.title.localeCompare(right.title, "zh-Hans-CN");
    });

  const laneCounters = new Map<NonNullable<JobListItem["readyLane"]>, number>();
  return sorted.map((item) => {
    if (!item.readyLane) {
      return item;
    }

    const nextRank = (laneCounters.get(item.readyLane) || 0) + 1;
    laneCounters.set(item.readyLane, nextRank);

    return {
      ...item,
      reviewRank: nextRank,
      reviewRankLabel: formatReviewRankLabel(nextRank, item.readyLane),
    };
  });
}

export function buildAcceptanceLead(list: JobListItem[]): JobAcceptanceLead | null {
  const lead =
    list.find((item) => item.readyLane === "priority_review") ||
    list.find((item) => item.readyLane === "standard_review") ||
    list.find((item) => item.priorityBucket === "attention") ||
    list[0];

  if (!lead) {
    return null;
  }

  return {
    jobId: lead.id,
    title: lead.title,
    reviewRankLabel: lead.reviewRankLabel,
    firstCheckLabel: lead.firstCheckLabel,
    reviewPriorityLabel: lead.reviewPriorityLabel,
    reviewModeLabel: lead.reviewModeLabel,
    reasonLabel: buildLeadReasonLabel(lead),
  };
}

export function buildJobDetailView(record: JobDashboardRecord, context?: JobDetailContext): JobDetailView {
  const state = normalizeState(record.state);
  const priorityBucket = resolvePriorityBucket(record);
  const readyLane = resolveReadyLane(record, priorityBucket);
  const progress =
    typeof record.progress === "number" && Number.isFinite(record.progress)
      ? Math.max(0, Math.min(100, Math.round(record.progress)))
      : state === "COMPLETED"
        ? 100
        : 0;

  return {
    id: record.id,
    title: record.title?.trim() || "未命名任务",
    state,
    stateLabel: formatStateLabel(state),
    progress,
    currentStep: formatWorkflowStepLabel(record.currentStep?.trim()),
    platform: formatPlatformLabel(record.platform?.trim() || "unknown-platform"),
    renderProfile: formatRenderProfileLabel(record.renderProfile?.trim() || "unknown-profile"),
    updatedLabel: formatDateLabel(record.updatedAt),
    createdLabel: formatDateLabel(record.createdAt),
    checkpointSummary: stringifyCheckpoint(record.lastCheckpoint),
    checkpointReadableSummary: buildCheckpointReadableSummary(record.lastCheckpoint),
    errorSummary:
      record.errors?.length
        ? record.errors.map(
            (item) => `${formatErrorStepLabel(item.stepName)}：${item.errorMessage}（已重试 ${item.retryCount} 次）`,
          )
        : ["当前没有错误记录。"],
    outputsSummary:
      record.outputs?.length
        ? record.outputs.map((item) => `${formatOutputKindLabel(item.kind)}：${item.url ?? item.path}`)
        : ["当前还没有可用产物。"],
    ttsStrategySummary: {
      providerLabel: formatTtsProviderLabel(readCheckpointField(record.lastCheckpoint, "ttsProviderId")),
      routeLabel: readCheckpointField(record.lastCheckpoint, "ttsRouteLabel") || "未设置",
      routeRoleLabel: formatTtsRouteRoleLabel(readCheckpointField(record.lastCheckpoint, "ttsRouteRoleLabel")),
      acceptanceHint: formatTtsAcceptanceHint(readCheckpointField(record.lastCheckpoint, "ttsAcceptanceHint")),
      voiceModeLabel: formatVoiceModeLabel(readCheckpointField(record.lastCheckpoint, "voiceMode")),
      cloningLabel: formatTtsCloningLabel(readCheckpointField(record.lastCheckpoint, "voiceMode")),
      deploymentLabel: formatTtsDeploymentLabel(readCheckpointField(record.lastCheckpoint, "ttsProviderId")),
    },
    qualitySummary: {
      fileSizeLabel: formatFileSize(record.qualitySummary?.fileSizeBytes),
      durationLabel:
        typeof record.qualitySummary?.durationSec === "number" && Number.isFinite(record.qualitySummary.durationSec)
          ? `${record.qualitySummary.durationSec.toFixed(1)}s`
          : "未探测",
      resolutionLabel: record.qualitySummary?.resolution?.trim() || "未探测",
      audioPresenceLabel:
        record.qualitySummary?.audioPresence === true
          ? "有音频"
          : record.qualitySummary?.audioPresence === false
            ? "无音频"
            : "未探测",
      subtitleStatusLabel:
        record.qualitySummary?.subtitleStatus === "embedded"
          ? "已内嵌"
          : record.qualitySummary?.subtitleStatus === "planned"
            ? "规划中"
            : record.qualitySummary?.subtitleStatus === "missing"
              ? "缺失"
              : "未知",
      fallbackStatusLabel:
        record.qualitySummary?.fallbackStatus === "fallback"
          ? `使用 fallback${record.qualitySummary?.fallbackReason ? ` · ${record.qualitySummary.fallbackReason}` : ""}`
          : record.qualitySummary?.fallbackStatus === "primary"
            ? "正式产物"
            : "未知",
      complianceStatusLabel:
        record.qualitySummary?.complianceStatus === "blocked"
          ? `拦截${record.qualitySummary?.complianceViolations ? ` · ${record.qualitySummary.complianceViolations} 项` : ""}`
          : record.qualitySummary?.complianceStatus === "allowed"
            ? "通过"
            : "未知",
    },
    costSummary: {
      gptImageUsd: formatUsd(record.costSummary?.gptImageUsd),
      wanxUsd: formatUsd(record.costSummary?.wanxUsd),
      ttsUsd: formatUsd(record.costSummary?.ttsUsd),
      totalUsd: formatUsd(record.costSummary?.totalUsd),
    },
    routeOutcomeSummary: {
      qualityFocusLabel: formatRouteQualityFocus(readCheckpointField(record.lastCheckpoint, "ttsRouteRoleLabel")),
      costInterpretationLabel: formatRouteCostInterpretation(readCheckpointField(record.lastCheckpoint, "ttsRouteRoleLabel")),
      acceptancePriorityLabel: formatRouteAcceptancePriority(readCheckpointField(record.lastCheckpoint, "ttsRouteRoleLabel")),
    },
    resilienceSummary: {
      renderSourceLabel: formatRenderSourceLabel(record),
      fallbackInterpretationLabel: formatFallbackInterpretation(record),
      rerunRecommendationLabel: formatRerunRecommendation(record),
    },
    reviewContext: {
      bucketLabel: formatPriorityBucketLabel(priorityBucket),
      laneLabel: formatReadyLaneLabel(readyLane) || "当前不在验收分道",
      firstCheckLabel: buildFirstCheckLabel(record),
      reviewPriorityLabel: buildReviewPriorityLabel(record),
      reviewModeLabel: buildReviewModeLabel(record),
      reviewRankLabel: formatReviewRankLabel(
        context?.reviewRank ?? (readyLane ? 1 : null),
        readyLane,
      ),
    },
    acceptanceAssistant: buildAcceptanceAssistant(record),
  };
}

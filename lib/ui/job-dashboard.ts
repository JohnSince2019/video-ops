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
  platform: string;
  renderProfile: string;
  updatedLabel: string;
  progressLabel: string;
  statusTone: "queued" | "running" | "success" | "error" | "neutral";
  ttsProviderLabel: string;
  ttsRouteLabel: string;
};

export type JobDetailView = {
  id: string;
  title: string;
  state: JobState | "UNKNOWN";
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
};

function normalizeState(state?: string | null): JobState | "UNKNOWN" {
  if (state && JOB_STATES.includes(state as JobState)) {
    return state as JobState;
  }

  return "UNKNOWN";
}

function formatDateLabel(value?: string | null) {
  if (!value) {
    return "Unknown time";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
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
    return "No checkpoint captured yet.";
  }

  if (typeof checkpoint === "string") {
    return checkpoint;
  }

  try {
    return JSON.stringify(checkpoint, null, 2);
  } catch {
    return "Checkpoint data unavailable.";
  }
}

function buildCheckpointReadableSummary(checkpoint: unknown) {
  if (!checkpoint || typeof checkpoint !== "object") {
    return ["当前还没有任务检查点。"];
  }

  const data = checkpoint as Record<string, unknown>;
  const lines: string[] = [];
  if (typeof data.step === "string") {
    lines.push(`当前阶段：${data.step}`);
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
  if (typeof data.customVoiceReference === "string" && data.customVoiceReference) {
    lines.push(`声音参考：${data.customVoiceReference}`);
  }
  if (typeof data.stylePreset === "string") {
    lines.push(`视觉风格：${data.stylePreset}`);
  }
  if (typeof data.personaPreset === "string") {
    lines.push(`人物预设：${data.personaPreset}`);
  }
  if (typeof data.progress === "number") {
    lines.push(`任务进度：${data.progress}%`);
  }
  if (typeof data.storyboardScenes === "number") {
    lines.push(`分镜数量：${data.storyboardScenes}`);
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
  const labels: Record<string, string> = {
    douyin: "抖音",
    xiaohongshu: "小红书",
    videox: "微信视频号 / B站",
  };

  return labels[platform] || platform || "未知平台";
}

function formatRenderProfileLabel(profile: string) {
  const labels: Record<string, string> = {
    draft: "草稿",
    standard: "标准",
    high_quality: "高质量",
  };

  return labels[profile] || profile || "未知档位";
}

export function buildJobListView(records: JobDashboardRecord[]): JobListItem[] {
  return records.map((record, index) => {
    const state = normalizeState(record.state);
    const progressValue =
      typeof record.progress === "number" && Number.isFinite(record.progress)
        ? Math.max(0, Math.min(100, Math.round(record.progress)))
        : state === "COMPLETED"
          ? 100
          : 0;

    return {
      id: record.id,
      title: record.title?.trim() || `Untitled Job ${index + 1}`,
      state,
      platform: record.platform?.trim() || "unknown-platform",
      renderProfile: record.renderProfile?.trim() || "unknown-profile",
      updatedLabel: formatDateLabel(record.updatedAt),
      progressLabel: `${progressValue}%`,
      statusTone: getStatusTone(state),
      ttsProviderLabel: formatTtsProviderLabel(readCheckpointField(record.lastCheckpoint, "ttsProviderId")),
      ttsRouteLabel: readCheckpointField(record.lastCheckpoint, "ttsRouteLabel") || "未设置",
    };
  });
}

export function buildJobDetailView(record: JobDashboardRecord): JobDetailView {
  const state = normalizeState(record.state);
  const progress =
    typeof record.progress === "number" && Number.isFinite(record.progress)
      ? Math.max(0, Math.min(100, Math.round(record.progress)))
      : state === "COMPLETED"
        ? 100
        : 0;

  return {
    id: record.id,
    title: record.title?.trim() || "Untitled Job",
    state,
    progress,
    currentStep: record.currentStep?.trim() || "No active step",
    platform: formatPlatformLabel(record.platform?.trim() || "unknown-platform"),
    renderProfile: formatRenderProfileLabel(record.renderProfile?.trim() || "unknown-profile"),
    updatedLabel: formatDateLabel(record.updatedAt),
    createdLabel: formatDateLabel(record.createdAt),
    checkpointSummary: stringifyCheckpoint(record.lastCheckpoint),
    checkpointReadableSummary: buildCheckpointReadableSummary(record.lastCheckpoint),
    errorSummary:
      record.errors?.length
        ? record.errors.map(
            (item) => `${item.stepName}: ${item.errorMessage} (retry ${item.retryCount})`,
          )
        : ["No errors recorded."],
    outputsSummary:
      record.outputs?.length
        ? record.outputs.map((item) => `${item.kind}: ${item.url ?? item.path}`)
        : ["No output bundle available yet."],
    ttsStrategySummary: {
      providerLabel: formatTtsProviderLabel(readCheckpointField(record.lastCheckpoint, "ttsProviderId")),
      routeLabel: readCheckpointField(record.lastCheckpoint, "ttsRouteLabel") || "未设置",
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
          ? `Fallback${record.qualitySummary?.fallbackReason ? ` · ${record.qualitySummary.fallbackReason}` : ""}`
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
  };
}

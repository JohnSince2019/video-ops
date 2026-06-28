export const JOB_MODES = ["script_to_video", "raw_video_edit"] as const;

export type JobMode = (typeof JOB_MODES)[number];

export function isJobMode(value: unknown): value is JobMode {
  return typeof value === "string" && JOB_MODES.includes(value as JobMode);
}

export function formatJobModeLabel(mode?: string | null) {
  if (mode === "raw_video_edit") {
    return "原始视频剪辑";
  }

  if (mode === "script_to_video") {
    return "文案生成视频";
  }

  return "未知模式";
}

import type { JobDashboardRecord } from "./job-dashboard.js";

export type PublishReadinessResult = {
  ready: boolean;
  level: "ready" | "cautious" | "blocked";
  status: string;
  reason: string;
  nextAction: string;
  missingItems: string[];
};

function hasOutput(record: JobDashboardRecord, kind: string) {
  return Boolean(record.outputs?.some((item) => item.kind === kind));
}

function hasSubtitleOutput(record: JobDashboardRecord) {
  return Boolean(record.outputs?.some((item) => item.kind === "subtitle_srt" || item.kind === "subtitle_vtt"));
}

export function evaluatePublishReadiness(record?: JobDashboardRecord | null): PublishReadinessResult {
  if (!record) {
    return {
      ready: false,
      level: "blocked",
      status: "当前还不能判断是否可发布",
      reason: "因为这条任务还没有形成完整产物，系统暂时无法判断最终是否具备发布条件。",
      nextAction: "先把任务跑完，再看 MP4、音频、字幕、封面和元数据是否齐全。",
      missingItems: ["任务详情"],
    };
  }

  const missingItems: string[] = [];
  const hasVideo = hasOutput(record, "video");
  const hasCover = hasOutput(record, "cover");
  const hasMetadata = hasOutput(record, "metadata");
  const hasSubtitles = hasSubtitleOutput(record);
  const audioOk = record.qualitySummary?.audioPresence === true;
  const complianceBlocked = record.qualitySummary?.complianceStatus === "blocked";
  const subtitleStatus = record.qualitySummary?.subtitleStatus ?? null;
  const fallbackUsed = record.qualitySummary?.fallbackStatus === "fallback";

  if (!hasVideo) missingItems.push("MP4 成片");
  if (!audioOk) missingItems.push("音频");
  if (!hasCover) missingItems.push("封面");
  if (!hasMetadata) missingItems.push("元数据");
  if (!hasSubtitles || subtitleStatus === "missing" || subtitleStatus === "planned") missingItems.push("字幕");

  if (!hasVideo) {
    return {
      ready: false,
      level: "blocked",
      status: "当前还不能发",
      reason: "因为最终 MP4 还没有准备好，用户现在拿不到可直接交付的成片。",
      nextAction: "先等成片输出完成，再回来确认交付包。",
      missingItems,
    };
  }

  if (!audioOk) {
    return {
      ready: false,
      level: "blocked",
      status: "当前还不能发",
      reason: "因为这条成片缺少音频，发出去会直接影响观看体验。",
      nextAction: "先修声音链路，再重新确认交付包。",
      missingItems,
    };
  }

  if (complianceBlocked) {
    return {
      ready: false,
      level: "blocked",
      status: "当前还不能发",
      reason: "因为合规检查没有通过，现在更适合先处理风险，而不是直接发布。",
      nextAction: "先解决合规问题，再重新生成或重新验收。",
      missingItems,
    };
  }

  if (missingItems.length) {
    return {
      ready: false,
      level: "blocked",
      status: "当前交付还不完整",
      reason: `因为当前还缺少：${missingItems.join("、")}。现在更适合先补齐交付包，而不是直接发布。`,
      nextAction: `先补齐 ${missingItems.join("、")}，再进入最终发布判断。`,
      missingItems,
    };
  }

  if (fallbackUsed) {
    return {
      ready: true,
      level: "cautious",
      status: "可以发，但建议谨慎",
      reason: "因为交付包已经齐全，但这次走过 fallback 路线，最好再完整看一遍最终观感。",
      nextAction: "先完整看一遍成片，再决定是直接发还是重跑主链路。",
      missingItems: [],
    };
  }

  return {
    ready: true,
    level: "ready",
    status: "这条视频已经具备发布条件",
    reason: "因为 MP4、音频、字幕、封面、元数据和合规状态都已经齐全，现在更像一条可直接进入发布动作的成片。",
    nextAction: "可以继续做平台文案、封面和发布动作；如果你要更稳，再做一轮人工复看。",
    missingItems: [],
  };
}

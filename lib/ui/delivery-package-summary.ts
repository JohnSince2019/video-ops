import type { JobDashboardRecord } from "./job-dashboard.js";
import type { PublishReadinessResult } from "./publish-readiness.js";

export type DeliveryPackageSummaryItem = {
  tone: "pass" | "warn";
  text: string;
};

function hasOutput(record: JobDashboardRecord | null | undefined, kind: string) {
  return Boolean(record?.outputs?.some((item) => item.kind === kind));
}

function getSubtitleKinds(record: JobDashboardRecord | null | undefined) {
  return record?.outputs
    ?.filter((item) => item.kind === "subtitle_srt" || item.kind === "subtitle_vtt")
    .map((item) => item.kind) ?? [];
}

export function buildDeliveryPackageSummary(
  record?: JobDashboardRecord | null,
  publishReadiness?: PublishReadinessResult | null,
): DeliveryPackageSummaryItem[] {
  if (!record) {
    return [
      {
        tone: "warn",
        text: "交付包还没有准备好，等 MP4、元数据和下载入口生成后，这里会集中展示。",
      },
    ];
  }

  const items: DeliveryPackageSummaryItem[] = [];
  const hasVideo = hasOutput(record, "video");
  const hasMetadata = hasOutput(record, "metadata");
  const hasCover = hasOutput(record, "cover");
  const subtitleKinds = getSubtitleKinds(record);
  const hasSubtitles = subtitleKinds.length > 0;
  const audioOk = record.qualitySummary?.audioPresence === true;
  const fallbackUsed = record.qualitySummary?.fallbackStatus === "fallback";
  const complianceBlocked = record.qualitySummary?.complianceStatus === "blocked";

  items.push({
    tone: hasVideo ? "pass" : "warn",
    text: hasVideo ? "主交付物：已生成可直接播放的 MP4 成片" : "主交付物：当前还没有 MP4 成片，暂时不能直接交付",
  });
  items.push({
    tone: audioOk ? "pass" : "warn",
    text: audioOk ? "声音交付：成片已经带声音，可直接进入人工复看" : "声音交付：当前还缺少音频，需要先修复声音链路",
  });

  if (hasSubtitles) {
    const subtitleLabels = subtitleKinds
      .map((kind) => (kind === "subtitle_srt" ? "SRT" : "VTT"))
      .join(" + ");
    items.push({
      tone: "pass",
      text: `字幕交付：已附带 ${subtitleLabels} 字幕文件，可继续发布或二次加工`,
    });
  } else {
    items.push({
      tone: "warn",
      text: "字幕交付：当前还没有字幕文件，发布前建议先补齐",
    });
  }

  items.push({
    tone: hasCover ? "pass" : "warn",
    text: hasCover ? "封面交付：已生成封面图，可继续做平台发布素材" : "封面交付：当前还没有封面图，平台发布素材还不完整",
  });
  items.push({
    tone: hasMetadata ? "pass" : "warn",
    text: hasMetadata ? "元数据：已附带 JSON 产物说明，便于复盘和继续发布" : "元数据：当前还没有附带元数据文件，交付说明还不完整",
  });

  if (complianceBlocked) {
    items.push({
      tone: "warn",
      text: "合规状态：当前命中风险项，应该先处理合规问题，再决定是否发布",
    });
  } else {
    items.push({
      tone: "pass",
      text: "合规状态：当前没有阻塞发布的风险项",
    });
  }

  if (fallbackUsed) {
    items.push({
      tone: "warn",
      text: "渲染路线：本次走过 fallback 兜底链路，建议完整复看后再发布",
    });
  } else {
    items.push({
      tone: "pass",
      text: "渲染路线：本次走主链路输出，适合进入最终验收",
    });
  }

  if (publishReadiness) {
    items.push({
      tone: publishReadiness.ready ? "pass" : "warn",
      text: `发布判断：${publishReadiness.status}`,
    });
    items.push({
      tone: publishReadiness.ready ? "pass" : "warn",
      text: `下一步动作：${publishReadiness.nextAction}`,
    });
  }

  return items;
}

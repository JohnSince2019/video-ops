import assert from "node:assert/strict";
import test from "node:test";

import type { JobDashboardRecord } from "../lib/ui/job-dashboard.js";
import { buildDeliveryPackageSummary } from "../lib/ui/delivery-package-summary.js";
import { evaluatePublishReadiness } from "../lib/ui/publish-readiness.js";

test("delivery package summary reflects complete artifacts with pass labels", () => {
  const record: JobDashboardRecord = {
    id: "job-ready",
    qualitySummary: {
      audioPresence: true,
      subtitleStatus: "generated",
      fallbackStatus: "primary",
      complianceStatus: "allowed",
    },
    outputs: [
      { kind: "video", path: "output/video.mp4" },
      { kind: "cover", path: "output/cover.png" },
      { kind: "metadata", path: "output/metadata.json" },
      { kind: "subtitle_srt", path: "output/subtitles.srt" },
      { kind: "subtitle_vtt", path: "output/subtitles.vtt" },
    ],
  };
  const items = buildDeliveryPackageSummary(record, evaluatePublishReadiness(record));

  assert.ok(items.some((item) => item.text.includes("已生成可直接播放的 MP4 成片") && item.tone === "pass"));
  assert.ok(items.some((item) => item.text.includes("已附带 SRT + VTT 字幕文件") && item.tone === "pass"));
  assert.ok(items.some((item) => item.text.includes("发布判断：这条视频已经具备发布条件") && item.tone === "pass"));
});

test("delivery package summary warns on missing metadata and subtitles", () => {
  const record: JobDashboardRecord = {
    id: "job-missing",
    qualitySummary: {
      audioPresence: true,
      subtitleStatus: "missing",
      fallbackStatus: "primary",
      complianceStatus: "allowed",
    },
    outputs: [{ kind: "video", path: "output/video.mp4" }],
  };
  const items = buildDeliveryPackageSummary(record, evaluatePublishReadiness(record));

  assert.ok(items.some((item) => item.text.includes("当前还没有字幕文件") && item.tone === "warn"));
  assert.ok(items.some((item) => item.text.includes("当前还没有附带元数据文件") && item.tone === "warn"));
  assert.ok(items.some((item) => item.text.includes("当前还没有封面图") && item.tone === "warn"));
});

test("delivery package summary warns when fallback or compliance block is present", () => {
  const record: JobDashboardRecord = {
    id: "job-risky",
    qualitySummary: {
      audioPresence: true,
      subtitleStatus: "generated",
      fallbackStatus: "fallback",
      complianceStatus: "blocked",
    },
    outputs: [
      { kind: "video", path: "output/video.mp4" },
      { kind: "cover", path: "output/cover.png" },
      { kind: "metadata", path: "output/metadata.json" },
      { kind: "subtitle_srt", path: "output/subtitles.srt" },
    ],
  };
  const items = buildDeliveryPackageSummary(record, evaluatePublishReadiness(record));

  assert.ok(items.some((item) => item.text.includes("命中风险项") && item.tone === "warn"));
  assert.ok(items.some((item) => item.text.includes("走过 fallback 兜底链路") && item.tone === "warn"));
});

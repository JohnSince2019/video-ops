import { promises as fs } from "node:fs";
import path from "node:path";

import type { OutputPackage } from "../video/output-package.js";
import { probeSourceVideo } from "./source-video-probe.js";

export type RawVideoQualityGateCheckKey =
  | "playable"
  | "resolution"
  | "audio_track"
  | "subtitle_assets"
  | "subtitle_safe_area"
  | "file_completeness";

export type RawVideoQualityGateCheck = {
  key: RawVideoQualityGateCheckKey;
  passed: boolean;
  details: string;
};

export type RawVideoQualityGateReport = {
  version: "raw-video-quality-gate-v1";
  inspectedPath: string;
  reportPath?: string;
  videoProbe: {
    durationSec: number;
    resolution: string | null;
    width: number | null;
    height: number | null;
    fps: number | null;
    hasAudio: boolean;
    hasVideo: boolean;
    streamTypes: string[];
  };
  subtitleCueCount: number;
  subtitleSafeArea: {
    bottomRatio: number;
    maxLines: number;
    passed: boolean;
  };
  requiredArtifacts: string[];
  missingArtifacts: string[];
  qualityPassed: boolean;
  checks: RawVideoQualityGateCheck[];
};

function hasArtifact(outputPackage: OutputPackage, kind: string) {
  return outputPackage.artifacts.some((item) => item.kind === kind);
}

function countSubtitleCues(text: string) {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean).length;
}

function inferMaxCaptionLines(text: string) {
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  let maxLines = 0;
  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !/^\d+$/.test(line) && !line.includes("-->"));
    maxLines = Math.max(maxLines, lines.length);
  }

  return maxLines;
}

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function inspectRawVideoQualityGate(input: {
  workspaceRoot: string;
  outputPackage: OutputPackage;
  reportPath?: string;
  requiredArtifactKinds?: string[];
  expectedResolution?: { width: number; height: number };
  subtitleSafeArea?: { bottomRatio?: number; maxLines?: number };
}) {
  const expectedResolution = input.expectedResolution ?? { width: 1080, height: 1920 };
  const requiredArtifactKinds = input.requiredArtifactKinds ?? [
    "video",
    "cover",
    "metadata",
    "subtitle_srt",
    "subtitle_vtt",
    "transcript_json",
    "subtitle_timeline",
    "edl",
    "remotion_render_metadata",
  ];
  const safeAreaBottomRatio = input.subtitleSafeArea?.bottomRatio ?? 0.2;
  const safeAreaMaxLines = input.subtitleSafeArea?.maxLines ?? 2;

  const absoluteVideoPath = path.join(input.workspaceRoot, input.outputPackage.video.path);
  const probe = await probeSourceVideo(absoluteVideoPath);
  const stat = await fs.stat(absoluteVideoPath);
  const subtitleSrt = input.outputPackage.subtitles.find((item) => item.format === "srt");
  const absoluteSubtitlePath = subtitleSrt ? path.join(input.workspaceRoot, subtitleSrt.path) : null;
  const subtitleText = absoluteSubtitlePath ? await fs.readFile(absoluteSubtitlePath, "utf8").catch(() => "") : "";
  const subtitleCueCount = subtitleText ? countSubtitleCues(subtitleText) : 0;
  const maxLines = subtitleText ? inferMaxCaptionLines(subtitleText) : 0;
  const subtitleSafeAreaPassed = maxLines > 0 ? maxLines <= safeAreaMaxLines : false;

  const missingArtifacts = requiredArtifactKinds.filter((kind) => !hasArtifact(input.outputPackage, kind));
  const resolutionPassed = probe.width === expectedResolution.width && probe.height === expectedResolution.height;
  const playablePassed = stat.size > 0 && probe.durationSec > 0 && probe.hasVideo;
  const audioPassed = probe.hasAudio;
  const subtitleAssetsPassed = Boolean(subtitleSrt) && subtitleCueCount > 0;
  const fileCompletenessPassed = missingArtifacts.length === 0;

  const checks: RawVideoQualityGateCheck[] = [
    {
      key: "playable",
      passed: playablePassed,
      details: playablePassed ? "成片文件存在，可探测且包含视频轨。" : "成片不可播放、为空文件或缺少视频轨。",
    },
    {
      key: "resolution",
      passed: resolutionPassed,
      details: resolutionPassed
        ? `分辨率符合预期：${expectedResolution.width}x${expectedResolution.height}。`
        : `当前分辨率为 ${probe.resolution ?? "未知"}，预期 ${expectedResolution.width}x${expectedResolution.height}。`,
    },
    {
      key: "audio_track",
      passed: audioPassed,
      details: audioPassed ? "检测到音轨。" : "未检测到音轨。",
    },
    {
      key: "subtitle_assets",
      passed: subtitleAssetsPassed,
      details: subtitleAssetsPassed ? `检测到字幕文件，当前约 ${subtitleCueCount} 条字幕。` : "字幕文件缺失，或字幕内容为空。",
    },
    {
      key: "subtitle_safe_area",
      passed: subtitleSafeAreaPassed,
      details: subtitleSafeAreaPassed
        ? `字幕行数满足安全区约束，当前最多 ${maxLines} 行，底部安全区预设 ${(safeAreaBottomRatio * 100).toFixed(0)}%。`
        : `字幕安全区未通过，当前最多 ${maxLines} 行，超过预设 ${safeAreaMaxLines} 行限制。`,
    },
    {
      key: "file_completeness",
      passed: fileCompletenessPassed,
      details: fileCompletenessPassed
        ? "关键交付文件齐全。"
        : `关键交付文件缺失：${missingArtifacts.join("、")}。`,
    },
  ];

  const report = {
    version: "raw-video-quality-gate-v1",
    inspectedPath: input.outputPackage.video.path,
    reportPath: input.reportPath,
    videoProbe: {
      durationSec: probe.durationSec,
      resolution: probe.resolution,
      width: probe.width,
      height: probe.height,
      fps: probe.fps,
      hasAudio: probe.hasAudio,
      hasVideo: probe.hasVideo,
      streamTypes: probe.streamTypes,
    },
    subtitleCueCount,
    subtitleSafeArea: {
      bottomRatio: safeAreaBottomRatio,
      maxLines: safeAreaMaxLines,
      passed: subtitleSafeAreaPassed,
    },
    requiredArtifacts: requiredArtifactKinds,
    missingArtifacts,
    qualityPassed: checks.every((check) => check.passed),
    checks,
  } satisfies RawVideoQualityGateReport;

  if (input.reportPath) {
    const absoluteReportPath = path.join(input.workspaceRoot, input.reportPath);
    await ensureDir(path.dirname(absoluteReportPath));
    await fs.writeFile(absoluteReportPath, JSON.stringify(report, null, 2), "utf8");
  }

  return report;
}

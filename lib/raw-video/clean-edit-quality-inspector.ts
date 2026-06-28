import { promises as fs } from "node:fs";
import path from "node:path";

import type { RawVideoClipManifest } from "./edl-clip-cutter.js";
import { probeSourceVideo } from "./source-video-probe.js";

export type CleanEditQualityCheck = {
  key: "playable" | "duration_match" | "audio_track" | "video_track" | "loudness_report";
  passed: boolean;
  details: string;
};

export type CleanEditQualityInspection = {
  version: "raw-video-clean-edit-quality-v1";
  inspectedPath: string;
  inspectedUrl: string;
  reportPath?: string;
  expectedDurationSec: number | null;
  actualDurationSec: number;
  durationDeltaSec: number | null;
  durationToleranceSec: number;
  fileSizeBytes: number;
  resolution: string | null;
  streamTypes: string[];
  qualityPassed: boolean;
  checks: CleanEditQualityCheck[];
};

function buildOutputUrl(relativePath: string) {
  return `/${relativePath.replace(/^\/+/, "")}`;
}

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

function buildExpectedDurationSec(clipManifest?: RawVideoClipManifest) {
  if (!clipManifest) {
    return null;
  }

  const approvedClips = clipManifest.clips.filter((clip) => clip.reviewState !== "removed");
  return approvedClips.reduce((sum, clip) => sum + clip.durationMs, 0) / 1000;
}

function buildChecks(input: {
  playable: boolean;
  durationWithinTolerance: boolean;
  hasAudio: boolean;
  hasVideo: boolean;
  loudnessReportAvailable: boolean;
  expectedDurationSec: number | null;
  actualDurationSec: number;
  durationDeltaSec: number | null;
}) {
  return [
    {
      key: "playable" as const,
      passed: input.playable,
      details: input.playable ? "ffprobe 已成功读取成片，文件可被探测。" : "ffprobe 未能成功读取成片。",
    },
    {
      key: "duration_match" as const,
      passed: input.durationWithinTolerance,
      details:
        input.expectedDurationSec === null
          ? "未提供 clip manifest，当前跳过时长比对。"
          : `期望 ${input.expectedDurationSec.toFixed(3)}s，实际 ${input.actualDurationSec.toFixed(3)}s，偏差 ${(
              input.durationDeltaSec ?? 0
            ).toFixed(3)}s。`,
    },
    {
      key: "audio_track" as const,
      passed: input.hasAudio,
      details: input.hasAudio ? "检测到音轨。" : "未检测到音轨。",
    },
    {
      key: "video_track" as const,
      passed: input.hasVideo,
      details: input.hasVideo ? "检测到视频轨。" : "未检测到视频轨。",
    },
    {
      key: "loudness_report" as const,
      passed: input.loudnessReportAvailable,
      details: input.loudnessReportAvailable ? "响度报告已存在。" : "响度报告缺失。",
    },
  ];
}

export async function inspectCleanEditQuality(input: {
  workspaceRoot: string;
  inspectedPath: string;
  clipManifest?: RawVideoClipManifest;
  loudnessReportPath?: string;
  reportPath?: string;
  durationToleranceSec?: number;
}) {
  const absoluteInspectedPath = path.join(input.workspaceRoot, input.inspectedPath);
  const probe = await probeSourceVideo(absoluteInspectedPath);
  const stat = await fs.stat(absoluteInspectedPath);
  const expectedDurationSec = buildExpectedDurationSec(input.clipManifest);
  const durationToleranceSec = input.durationToleranceSec ?? 0.45;
  const durationDeltaSec =
    expectedDurationSec === null ? null : Math.abs(Number((probe.durationSec - expectedDurationSec).toFixed(3)));
  const loudnessReportAvailable = input.loudnessReportPath
    ? await fs
        .access(path.join(input.workspaceRoot, input.loudnessReportPath))
        .then(() => true)
        .catch(() => false)
    : false;
  const playable = probe.durationSec > 0 && stat.size > 0;
  const durationWithinTolerance =
    expectedDurationSec === null ? true : (durationDeltaSec ?? Number.POSITIVE_INFINITY) <= durationToleranceSec;

  const checks = buildChecks({
    playable,
    durationWithinTolerance,
    hasAudio: probe.hasAudio,
    hasVideo: probe.hasVideo,
    loudnessReportAvailable,
    expectedDurationSec,
    actualDurationSec: probe.durationSec,
    durationDeltaSec,
  });
  const inspection = {
    version: "raw-video-clean-edit-quality-v1",
    inspectedPath: input.inspectedPath,
    inspectedUrl: buildOutputUrl(input.inspectedPath),
    reportPath: input.reportPath,
    expectedDurationSec,
    actualDurationSec: probe.durationSec,
    durationDeltaSec,
    durationToleranceSec,
    fileSizeBytes: stat.size,
    resolution: probe.resolution,
    streamTypes: probe.streamTypes,
    qualityPassed: checks.every((check) => check.passed),
    checks,
  } satisfies CleanEditQualityInspection;

  if (input.reportPath) {
    const absoluteReportPath = path.join(input.workspaceRoot, input.reportPath);
    await ensureDir(path.dirname(absoluteReportPath));
    await fs.writeFile(absoluteReportPath, JSON.stringify(inspection, null, 2), "utf8");
  }

  return inspection;
}

export async function attachCleanEditQualityInspectionToSourceMetadata(input: {
  metadataPath: string;
  inspection: CleanEditQualityInspection;
}) {
  const raw = await fs.readFile(input.metadataPath, "utf8");
  const metadata = JSON.parse(raw);
  const next = {
    ...metadata,
    cleanEditQualityInspection: {
      inspectedPath: input.inspection.inspectedPath,
      reportPath: input.inspection.reportPath,
      qualityPassed: input.inspection.qualityPassed,
      expectedDurationSec: input.inspection.expectedDurationSec,
      actualDurationSec: input.inspection.actualDurationSec,
      durationDeltaSec: input.inspection.durationDeltaSec,
      checks: input.inspection.checks.map((check) => ({
        key: check.key,
        passed: check.passed,
      })),
    },
  };

  await ensureDir(path.dirname(input.metadataPath));
  await fs.writeFile(input.metadataPath, JSON.stringify(next, null, 2), "utf8");

  return next;
}

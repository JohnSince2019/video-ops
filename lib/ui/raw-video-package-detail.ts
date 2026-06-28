import { buildJobOutputUrl } from "../assets/job-assets.js";
import type { RawVideoCriticReport } from "../raw-video/raw-video-ai-critic.js";
import type { RawVideoQualityGateReport } from "../raw-video/raw-video-quality-gate.js";

type OutputItem = { kind: string; path: string; url?: string };

export type RawVideoPackageLink = {
  label: string;
  path: string;
  url: string;
  available: boolean;
};

export type RawVideoPackageReportCard = {
  title: string;
  status: string;
  summary: string[];
  url: string | null;
  available: boolean;
};

export type RawVideoPackageDetail = {
  finalOutputs: RawVideoPackageLink[];
  supportingArtifacts: RawVideoPackageLink[];
  reportCards: RawVideoPackageReportCard[];
};

function makeLink(label: string, path: string | null | undefined, availablePaths: Set<string>, outputs: OutputItem[]) {
  if (!path?.trim()) {
    return null;
  }

  const output = outputs.find((item) => item.path === path);
  return {
    label,
    path,
    url: output?.url ?? buildJobOutputUrl(path),
    available: availablePaths.has(path) || Boolean(output),
  } satisfies RawVideoPackageLink;
}

function buildQualityGateCard(report?: RawVideoQualityGateReport | null, url?: string | null): RawVideoPackageReportCard {
  if (!report) {
    return {
      title: "自动质量门",
      status: "未生成",
      summary: ["当前还没有自动质量门报告。"],
      url: url ?? null,
      available: false,
    };
  }

  return {
    title: "自动质量门",
    status: report.qualityPassed ? "已通过" : "未通过",
    summary: [
      `总体结果：${report.qualityPassed ? "通过" : "未通过"}`,
      `视频规格：${report.videoProbe.resolution ?? "未知分辨率"} / ${report.videoProbe.hasAudio ? "有音轨" : "无音轨"}`,
      `字幕安全区：${report.subtitleSafeArea.passed ? "通过" : "未通过"} / ${report.subtitleCueCount} 条字幕`,
      report.missingArtifacts.length ? `缺失文件：${report.missingArtifacts.join("、")}` : "关键交付文件齐全",
    ],
    url: url ?? null,
    available: true,
  };
}

function buildCriticCard(report?: RawVideoCriticReport | null, url?: string | null): RawVideoPackageReportCard {
  if (!report) {
    return {
      title: "AI Critic",
      status: "未生成",
      summary: ["当前还没有 AI Critic 报告。"],
      url: url ?? null,
      available: false,
    };
  }

  const hook = report.checks.find((item) => item.key === "hook");
  const subtitle = report.checks.find((item) => item.key === "subtitle_naturalness");
  const semantic = report.checks.find((item) => item.key === "semantic_integrity");

  return {
    title: "AI Critic",
    status: report.overallPassed ? `通过 · ${report.overallScore} 分` : `待复核 · ${report.overallScore} 分`,
    summary: [
      `Hook：${hook?.summary ?? "未检查"}`,
      `字幕：${subtitle?.summary ?? "未检查"}`,
      `语义完整性：${semantic?.summary ?? "未检查"}`,
    ],
    url: url ?? null,
    available: true,
  };
}

export function buildRawVideoPackageDetail(input: {
  jobMode?: string | null;
  outputs?: OutputItem[] | null;
  outputPaths?: Record<string, string | null | undefined> | null;
  qualityGateReport?: RawVideoQualityGateReport | null;
  criticReport?: RawVideoCriticReport | null;
  availablePaths?: string[] | null;
}): RawVideoPackageDetail | null {
  if (input.jobMode !== "raw_video_edit") {
    return null;
  }

  const outputs = input.outputs ?? [];
  const outputPaths = input.outputPaths ?? {};
  const availablePaths = new Set((input.availablePaths ?? []).filter((item): item is string => typeof item === "string" && item.length > 0));

  const finalOutputs = [
    makeLink("成片 MP4", outputPaths.videoPath, availablePaths, outputs),
    makeLink("封面图", outputPaths.coverPath, availablePaths, outputs),
    makeLink("metadata.json", outputPaths.metadataPath, availablePaths, outputs),
  ].filter((item): item is RawVideoPackageLink => Boolean(item));

  const supportingArtifacts = [
    makeLink("转写 transcript", outputPaths.transcriptPath, availablePaths, outputs),
    makeLink("字幕时间轴", outputPaths.subtitleTimelinePath, availablePaths, outputs),
    makeLink("字幕 SRT", outputPaths.subtitleSrtPath, availablePaths, outputs),
    makeLink("字幕 VTT", outputPaths.subtitleVttPath, availablePaths, outputs),
    makeLink("EDL", outputPaths.edlPath, availablePaths, outputs),
    makeLink("Clean Edit", outputPaths.cleanEditPath, availablePaths, outputs),
    makeLink("响度报告", outputPaths.loudnessReportPath, availablePaths, outputs),
    makeLink("Remotion Metadata", outputPaths.remotionRenderMetadataPath, availablePaths, outputs),
  ].filter((item): item is RawVideoPackageLink => Boolean(item));

  const reportCards = [
    buildQualityGateCard(
      input.qualityGateReport,
      outputPaths.rawVideoQualityGateReportPath ? buildJobOutputUrl(outputPaths.rawVideoQualityGateReportPath) : null,
    ),
    buildCriticCard(
      input.criticReport,
      outputPaths.rawVideoCriticReportPath ? buildJobOutputUrl(outputPaths.rawVideoCriticReportPath) : null,
    ),
  ];

  return {
    finalOutputs,
    supportingArtifacts,
    reportCards,
  };
}

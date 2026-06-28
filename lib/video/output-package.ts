import type { PlatformMetadata } from "./platform-metadata.js";
import type { RenderPlan } from "./render-plan.js";

export type OutputArtifact = {
  kind: string;
  path: string;
  url: string;
};

export type OutputPackage = {
  video: {
    path: string;
    profile: string;
    url: string;
  };
  cover: {
    path: string;
    url: string;
    text?: string;
  };
  metadataFile: {
    path: string;
    url: string;
    content: string;
  };
  subtitles: Array<{
    format: "srt" | "vtt";
    path: string;
    url: string;
  }>;
  artifacts: OutputArtifact[];
  metadata: {
    platform: PlatformMetadata;
    renderProfile: string;
    timelineDurationMs: number;
    videoPath: string;
    coverPath: string;
    subtitles: Array<{
      format: "srt" | "vtt";
      path: string;
    }>;
    ffmpegArgs: string[];
    clipCount: number;
    providerMetadata?: {
      render?: import("../providers/provider-types.js").ProviderExecutionMetadata;
      image?: import("../providers/provider-types.js").ProviderExecutionMetadata;
      tts?: import("../providers/provider-types.js").ProviderExecutionMetadata;
    };
    ttsRouteSummary?: {
      providerId?: string;
      routeLabel?: string;
      routeRoleLabel?: string;
      acceptanceHint?: string;
      voiceLabel?: string;
    };
    rawVideo?: {
      jobMode: "raw_video_edit";
      sourceVideo?: {
        metadataPath?: string;
        proxyPath?: string;
        thumbnailPath?: string;
      };
      transcript?: {
        transcriptPath: string;
        wordsPath?: string;
        subtitleTimelinePath?: string;
        srtPath?: string;
        vttPath?: string;
      };
      editDecisionList?: {
        path: string;
      };
      cleanEdit?: {
        path?: string;
        normalizedPath?: string;
        loudnessReportPath?: string;
        qualityReportPath?: string;
      };
      remotion?: {
        propsPath?: string;
        renderMetadataPath?: string;
      };
      complianceReportPath?: string;
    };
  };
};

import { buildJobOutputUrl } from "../assets/job-assets.js";

function deriveMetadataPath(videoPath: string) {
  if (!videoPath.includes("/")) {
    return "output/metadata.json";
  }

  return videoPath.replace(/\/[^/]+$/, "/metadata.json");
}

function pushArtifact(target: OutputArtifact[], artifact?: { kind: string; path?: string | null }) {
  if (!artifact?.path?.trim()) {
    return;
  }

  if (target.some((item) => item.kind === artifact.kind && item.path === artifact.path)) {
    return;
  }

  target.push({
    kind: artifact.kind,
    path: artifact.path,
    url: buildJobOutputUrl(artifact.path),
  });
}

export function buildOutputPackage(input: {
  renderPlan: RenderPlan;
  platformMetadata: PlatformMetadata;
  videoPath?: string;
  coverPath: string;
  metadataPath?: string;
  subtitles?: Array<{
    format: "srt" | "vtt";
    path: string;
  }>;
  providerMetadata?: OutputPackage["metadata"]["providerMetadata"];
  ttsRouteSummary?: OutputPackage["metadata"]["ttsRouteSummary"];
  rawVideo?: OutputPackage["metadata"]["rawVideo"];
}) {
  if (!input.renderPlan) {
    throw new Error("Render plan is required for output packaging.");
  }
  if (!input.platformMetadata) {
    throw new Error("Platform metadata is required for output packaging.");
  }
  if (!input.coverPath?.trim()) {
    throw new Error("Cover path is required for output packaging.");
  }

  const videoPath = input.videoPath ?? input.renderPlan.outputPath;
  if (!videoPath?.trim()) {
    throw new Error("Video path is required for output packaging.");
  }

  const metadataPath = input.metadataPath ?? deriveMetadataPath(videoPath);

  const metadata = {
    platform: input.platformMetadata,
    renderProfile: input.renderPlan.profile,
    timelineDurationMs: input.renderPlan.timelineDurationMs,
    videoPath,
    coverPath: input.coverPath,
    subtitles: (input.subtitles ?? []).map((item) => ({
      format: item.format,
      path: item.path,
    })),
    ffmpegArgs: input.renderPlan.ffmpegArgs,
    clipCount: input.renderPlan.clips.length,
    providerMetadata: input.providerMetadata,
    ttsRouteSummary: input.ttsRouteSummary,
    rawVideo: input.rawVideo,
  };

  const artifacts: OutputArtifact[] = [];
  pushArtifact(artifacts, { kind: "video", path: videoPath });
  pushArtifact(artifacts, { kind: "cover", path: input.coverPath });
  pushArtifact(artifacts, { kind: "metadata", path: metadataPath });
  for (const subtitle of input.subtitles ?? []) {
    pushArtifact(artifacts, {
      kind: subtitle.format === "srt" ? "subtitle_srt" : "subtitle_vtt",
      path: subtitle.path,
    });
  }
  pushArtifact(artifacts, { kind: "source_metadata", path: input.rawVideo?.sourceVideo?.metadataPath });
  pushArtifact(artifacts, { kind: "proxy_video", path: input.rawVideo?.sourceVideo?.proxyPath });
  pushArtifact(artifacts, { kind: "thumbnail", path: input.rawVideo?.sourceVideo?.thumbnailPath });
  pushArtifact(artifacts, { kind: "transcript_json", path: input.rawVideo?.transcript?.transcriptPath });
  pushArtifact(artifacts, { kind: "transcript_words", path: input.rawVideo?.transcript?.wordsPath });
  pushArtifact(artifacts, { kind: "subtitle_timeline", path: input.rawVideo?.transcript?.subtitleTimelinePath });
  pushArtifact(artifacts, { kind: "edl", path: input.rawVideo?.editDecisionList?.path });
  pushArtifact(artifacts, { kind: "clean_edit", path: input.rawVideo?.cleanEdit?.path });
  pushArtifact(artifacts, { kind: "clean_edit_normalized", path: input.rawVideo?.cleanEdit?.normalizedPath });
  pushArtifact(artifacts, { kind: "clean_edit_loudness_report", path: input.rawVideo?.cleanEdit?.loudnessReportPath });
  pushArtifact(artifacts, { kind: "clean_edit_quality_report", path: input.rawVideo?.cleanEdit?.qualityReportPath });
  pushArtifact(artifacts, { kind: "remotion_props", path: input.rawVideo?.remotion?.propsPath });
  pushArtifact(artifacts, { kind: "remotion_render_metadata", path: input.rawVideo?.remotion?.renderMetadataPath });
  pushArtifact(artifacts, { kind: "compliance_report", path: input.rawVideo?.complianceReportPath });

  return {
    video: {
      path: videoPath,
      profile: input.renderPlan.profile,
      url: buildJobOutputUrl(videoPath),
    },
    cover: {
      path: input.coverPath,
      url: buildJobOutputUrl(input.coverPath),
      text: input.platformMetadata.coverText,
    },
    metadataFile: {
      path: metadataPath,
      url: buildJobOutputUrl(metadataPath),
      content: JSON.stringify(metadata, null, 2),
    },
    subtitles: (input.subtitles ?? []).map((item) => ({
      format: item.format,
      path: item.path,
      url: buildJobOutputUrl(item.path),
    })),
    artifacts,
    metadata,
  } satisfies OutputPackage;
}

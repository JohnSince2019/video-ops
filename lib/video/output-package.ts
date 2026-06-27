import type { PlatformMetadata } from "./platform-metadata.js";
import type { RenderPlan } from "./render-plan.js";

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
  metadata: {
    platform: PlatformMetadata;
    renderProfile: string;
    timelineDurationMs: number;
    videoPath: string;
    coverPath: string;
    ffmpegArgs: string[];
    clipCount: number;
    providerMetadata?: {
      render?: import("../providers/provider-types.js").ProviderExecutionMetadata;
      image?: import("../providers/provider-types.js").ProviderExecutionMetadata;
      tts?: import("../providers/provider-types.js").ProviderExecutionMetadata;
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

export function buildOutputPackage(input: {
  renderPlan: RenderPlan;
  platformMetadata: PlatformMetadata;
  videoPath?: string;
  coverPath: string;
  metadataPath?: string;
  providerMetadata?: OutputPackage["metadata"]["providerMetadata"];
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
    ffmpegArgs: input.renderPlan.ffmpegArgs,
    clipCount: input.renderPlan.clips.length,
    providerMetadata: input.providerMetadata,
  };

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
    metadata,
  } satisfies OutputPackage;
}

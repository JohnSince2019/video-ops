import type { PlatformMetadata } from "./platform-metadata.js";
import type { RenderPlan } from "./render-plan.js";

export type OutputPackage = {
  video: {
    path: string;
    profile: string;
  };
  cover: {
    path: string;
    text?: string;
  };
  metadataFile: {
    path: string;
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
  };
};

export function buildOutputPackage(input: {
  renderPlan: RenderPlan;
  platformMetadata: PlatformMetadata;
  videoPath?: string;
  coverPath: string;
  metadataPath?: string;
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

  const metadataPath = input.metadataPath ?? "output/metadata.json";

  const metadata = {
    platform: input.platformMetadata,
    renderProfile: input.renderPlan.profile,
    timelineDurationMs: input.renderPlan.timelineDurationMs,
    videoPath,
    coverPath: input.coverPath,
    ffmpegArgs: input.renderPlan.ffmpegArgs,
    clipCount: input.renderPlan.clips.length,
  };

  return {
    video: {
      path: videoPath,
      profile: input.renderPlan.profile,
    },
    cover: {
      path: input.coverPath,
      text: input.platformMetadata.coverText,
    },
    metadataFile: {
      path: metadataPath,
      content: JSON.stringify(metadata, null, 2),
    },
    metadata,
  } satisfies OutputPackage;
}

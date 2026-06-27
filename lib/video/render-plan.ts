import type { RenderProfile } from "../types/manifest.js";
import type { VideoTimeline } from "./video-assembler.js";

export type RenderProfileSpec = {
  profile: RenderProfile;
  width: number;
  height: number;
  videoBitrateKbps: number;
  audioBitrateKbps: number;
  crf: number;
  preset: string;
};

export type RenderClipPlan = {
  sceneId: string;
  imageInput: string;
  audioInput: string;
  durationMs: number;
  transition: {
    type: string;
    durationMs: number;
  };
};

export type RenderPlan = {
  profile: RenderProfile;
  timelineDurationMs: number;
  outputPath: string;
  ffmpegArgs: string[];
  clips: RenderClipPlan[];
  spec: RenderProfileSpec;
};

const RENDER_PROFILE_SPECS: Record<RenderProfile, RenderProfileSpec> = {
  draft: {
    profile: "draft",
    width: 720,
    height: 1280,
    videoBitrateKbps: 1500,
    audioBitrateKbps: 96,
    crf: 30,
    preset: "veryfast",
  },
  standard: {
    profile: "standard",
    width: 1080,
    height: 1920,
    videoBitrateKbps: 3500,
    audioBitrateKbps: 128,
    crf: 24,
    preset: "medium",
  },
  high_quality: {
    profile: "high_quality",
    width: 1440,
    height: 2560,
    videoBitrateKbps: 6000,
    audioBitrateKbps: 192,
    crf: 18,
    preset: "slow",
  },
};

export function getRenderProfileSpec(profile: RenderProfile) {
  const spec = RENDER_PROFILE_SPECS[profile];
  if (!spec) {
    throw new Error(`Invalid render profile "${profile}".`);
  }
  return spec;
}

export function buildRenderPlan(input: {
  timeline: VideoTimeline;
  profile: RenderProfile;
  outputPath?: string;
}) {
  if (!input.timeline || !Array.isArray(input.timeline.clips)) {
    throw new Error("Timeline is required.");
  }

  if (input.timeline.clips.length === 0) {
    throw new Error("Timeline must contain at least one clip.");
  }

  const spec = getRenderProfileSpec(input.profile);
  const outputPath = input.outputPath ?? `output/video-${input.profile}.mp4`;

  const clips = input.timeline.clips.map((clip) => {
    if (!clip.mainImage.url && !clip.mainImage.b64_json) {
      throw new Error(`Missing main image input for scene ${clip.sceneId}.`);
    }
    if (!clip.audio.path) {
      throw new Error(`Missing audio input for scene ${clip.sceneId}.`);
    }

    return {
      sceneId: clip.sceneId,
      imageInput: clip.mainImage.url ?? `inline:${clip.mainImage.artifactKey}`,
      audioInput: clip.audio.path,
      durationMs: clip.durationMs,
      transition: clip.transition,
    } satisfies RenderClipPlan;
  });

  const ffmpegArgs = [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    "timeline-input.txt",
    "-c:v",
    "libx264",
    "-preset",
    spec.preset,
    "-crf",
    String(spec.crf),
    "-b:v",
    `${spec.videoBitrateKbps}k`,
    "-c:a",
    "aac",
    "-b:a",
    `${spec.audioBitrateKbps}k`,
    "-vf",
    `scale=${spec.width}:${spec.height}`,
    outputPath,
  ];

  return {
    profile: input.profile,
    timelineDurationMs: input.timeline.totalDurationMs,
    outputPath,
    ffmpegArgs,
    clips,
    spec,
  } satisfies RenderPlan;
}

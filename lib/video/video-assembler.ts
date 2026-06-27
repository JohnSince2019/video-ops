import type { GenerateTtsResult } from "../audio/cosyvoice-client.js";
import type { GenerateImageResult } from "../image/gpt-image-client.js";
import type { ContentScene } from "../types/manifest.js";

export type TransitionType = "cut" | "crossfade" | "fade";

export type TimelineClip = {
  sceneId: string;
  sceneHash: string;
  order: number;
  startMs: number;
  endMs: number;
  durationMs: number;
  mainImage: {
    artifactKey: string;
    url?: string;
    b64_json?: string;
  };
  brollImage?: {
    artifactKey: string;
    url?: string;
    b64_json?: string;
  };
  audio: {
    path: string;
    durationMs: number;
    voice: string;
  };
  transition: {
    type: TransitionType;
    durationMs: number;
  };
};

export type VideoTimeline = {
  totalDurationMs: number;
  transitionDefault: TransitionType;
  clips: TimelineClip[];
};

export type AssembleTimelineInput = {
  scenes: Array<Pick<ContentScene, "id" | "scene_hash">>;
  mainImages: GenerateImageResult[];
  brollImages?: GenerateImageResult[];
  audios: GenerateTtsResult[];
  transitionType?: TransitionType;
  transitionDurationMs?: number;
};

const VALID_TRANSITIONS: TransitionType[] = ["cut", "crossfade", "fade"];

function pickFirstArtifact(result: GenerateImageResult) {
  const artifact = result.artifacts[0];
  if (!artifact) {
    throw new Error(`Image result for scene ${result.sceneId} contains no artifacts.`);
  }
  return artifact;
}

function findRequiredImage(sceneId: string, images: GenerateImageResult[], label: string) {
  const image = images.find((item) => item.sceneId === sceneId);
  if (!image) {
    throw new Error(`Missing ${label} image asset for scene ${sceneId}.`);
  }
  return image;
}

function findRequiredAudio(sceneId: string, audios: GenerateTtsResult[]) {
  const audio = audios.find((item) => item.sceneId === sceneId);
  if (!audio) {
    throw new Error(`Missing audio asset for scene ${sceneId}.`);
  }
  if (!Number.isFinite(audio.durationMs) || audio.durationMs <= 0) {
    throw new Error(`Missing valid audio duration for scene ${sceneId}.`);
  }
  return audio;
}

export function assembleVideoTimeline(input: AssembleTimelineInput): VideoTimeline {
  const transitionType = input.transitionType ?? "crossfade";
  const transitionDurationMs = input.transitionDurationMs ?? 300;

  if (!VALID_TRANSITIONS.includes(transitionType)) {
    throw new Error(
      `Invalid transition type "${transitionType}". Allowed: ${VALID_TRANSITIONS.join(", ")}.`,
    );
  }

  if (!Number.isFinite(transitionDurationMs) || transitionDurationMs < 0) {
    throw new Error("Transition duration must be a non-negative number.");
  }

  let cursorMs = 0;
  const clips = input.scenes.map((scene, index) => {
    const mainImage = findRequiredImage(scene.id, input.mainImages, "main");
    const audio = findRequiredAudio(scene.id, input.audios);
    const brollImage = input.brollImages?.find((item) => item.sceneId === scene.id);
    const effectiveTransitionMs = index === 0 ? 0 : transitionDurationMs;
    const startMs = cursorMs;
    const endMs = startMs + audio.durationMs;

    cursorMs = endMs;

    return {
      sceneId: scene.id,
      sceneHash: scene.scene_hash,
      order: index,
      startMs,
      endMs,
      durationMs: audio.durationMs,
      mainImage: pickFirstArtifact(mainImage),
      brollImage: brollImage ? pickFirstArtifact(brollImage) : undefined,
      audio: {
        path: audio.audioPath,
        durationMs: audio.durationMs,
        voice: audio.voice,
      },
      transition: {
        type: transitionType,
        durationMs: effectiveTransitionMs,
      },
    } satisfies TimelineClip;
  });

  return {
    totalDurationMs: clips.at(-1)?.endMs ?? 0,
    transitionDefault: transitionType,
    clips,
  };
}

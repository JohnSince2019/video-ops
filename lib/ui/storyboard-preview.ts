import type { TransitionType } from "../video/video-assembler.js";

export const SUBTITLE_STYLES = ["minimal", "bold", "caption-card"] as const;
export type SubtitleStyle = (typeof SUBTITLE_STYLES)[number];

export const TRANSITION_STYLES = ["cut", "crossfade", "fade"] as const;
export type TransitionStyle = (typeof TRANSITION_STYLES)[number];

export type StoryboardSceneInput = {
  id: string;
  narration: string;
  visualHint?: string;
  durationMs: number;
  transition?: TransitionType;
};

export type StoryboardControls = {
  textMode: "original" | "shorten" | "headline";
  subtitleStyle: SubtitleStyle;
  transitionStyle: TransitionStyle;
};

export type StoryboardCard = {
  id: string;
  title: string;
  narration: string;
  visualHint: string;
  durationLabel: string;
  transition: TransitionStyle;
  subtitleStyle: SubtitleStyle;
  previewCaption: string;
};

export type StoryboardPreview = {
  cards: StoryboardCard[];
  summary: {
    textMode: StoryboardControls["textMode"];
    subtitleStyle: SubtitleStyle;
    transitionStyle: TransitionStyle;
    totalScenes: number;
  };
};

function formatDuration(durationMs: number) {
  const seconds = Math.max(1, Math.round(durationMs / 1000));
  return `${seconds}s`;
}

function summarizeText(narration: string, mode: StoryboardControls["textMode"]) {
  const trimmed = narration.trim();
  if (mode === "original") {
    return trimmed;
  }

  if (mode === "shorten") {
    return trimmed.length <= 30 ? trimmed : `${trimmed.slice(0, 30)}...`;
  }

  return trimmed.split(/[，。！？!?；;]+/u)[0]?.trim() || trimmed;
}

export function buildStoryboardPreview(input: {
  scenes: StoryboardSceneInput[];
  controls: StoryboardControls;
}): StoryboardPreview {
  const cards = input.scenes.map((scene, index) => ({
    id: scene.id,
    title: `Scene ${index + 1}`,
    narration: scene.narration.trim() || "No narration provided.",
    visualHint: scene.visualHint?.trim() || "No visual hint provided.",
    durationLabel: formatDuration(scene.durationMs),
    transition: input.controls.transitionStyle,
    subtitleStyle: input.controls.subtitleStyle,
    previewCaption: summarizeText(scene.narration, input.controls.textMode),
  }));

  return {
    cards,
    summary: {
      textMode: input.controls.textMode,
      subtitleStyle: input.controls.subtitleStyle,
      transitionStyle: input.controls.transitionStyle,
      totalScenes: cards.length,
    },
  };
}

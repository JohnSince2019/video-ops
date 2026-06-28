import type { ContentManifest } from "../types/manifest.js";

export type SubtitleCue = {
  index: number;
  startMs: number;
  endMs: number;
  text: string;
};

export type SubtitleArtifacts = {
  cues: SubtitleCue[];
  srt: string;
  vtt: string;
};

function pad(value: number, size = 2) {
  return String(value).padStart(size, "0");
}

function formatSrtTimestamp(totalMs: number) {
  const safeMs = Math.max(0, Math.round(totalMs));
  const hours = Math.floor(safeMs / 3_600_000);
  const minutes = Math.floor((safeMs % 3_600_000) / 60_000);
  const seconds = Math.floor((safeMs % 60_000) / 1_000);
  const milliseconds = safeMs % 1_000;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(milliseconds, 3)}`;
}

function formatVttTimestamp(totalMs: number) {
  return formatSrtTimestamp(totalMs).replace(",", ".");
}

export function buildSubtitleCues(manifest: ContentManifest): SubtitleCue[] {
  let cursor = 0;

  return manifest.scenes.map((scene, index) => {
    const startMs = cursor;
    const durationMs = Math.max(500, Math.round(scene.duration_ms || 0));
    const endMs = startMs + durationMs;
    cursor = endMs;

    return {
      index: index + 1,
      startMs,
      endMs,
      text: scene.narration.trim(),
    };
  });
}

export function buildSubtitleArtifacts(manifest: ContentManifest): SubtitleArtifacts {
  if (!manifest?.scenes?.length) {
    throw new Error("Manifest scenes are required to build subtitle artifacts.");
  }

  const cues = buildSubtitleCues(manifest);
  const srt = cues
    .map((cue) => `${cue.index}\n${formatSrtTimestamp(cue.startMs)} --> ${formatSrtTimestamp(cue.endMs)}\n${cue.text}`)
    .join("\n\n");

  const vtt = [
    "WEBVTT",
    "",
    ...cues.map((cue) => `${cue.index}\n${formatVttTimestamp(cue.startMs)} --> ${formatVttTimestamp(cue.endMs)}\n${cue.text}`),
  ].join("\n\n");

  return { cues, srt, vtt };
}

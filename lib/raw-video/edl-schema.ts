export const EDL_OVERLAY_TYPES = ["title_bar", "chapter_card", "cta", "broll_hint"] as const;
export const CLIP_REVIEW_STATES = ["kept", "removed", "restored"] as const;

export type EdlOverlayType = (typeof EDL_OVERLAY_TYPES)[number];
export type ClipReviewState = (typeof CLIP_REVIEW_STATES)[number];

export type RawVideoEdlClip = {
  clipId: string;
  sourceVideoId: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  transcriptText: string;
  removalCandidate?: boolean;
  reviewState?: ClipReviewState;
  reviewReason?: string;
};

export type RawVideoEdlOverlay = {
  overlayId: string;
  type: EdlOverlayType;
  startMs: number;
  endMs: number;
  text: string;
};

export type RawVideoEdlCaption = {
  captionId: string;
  startMs: number;
  endMs: number;
  text: string;
};

export type RawVideoEdlChapter = {
  chapterId: string;
  title: string;
  startMs: number;
  endMs: number;
  summary: string;
};

export type RawVideoEdl = {
  version: "raw-video-edl-v1";
  jobId: string;
  sourceVideoId: string;
  totalDurationMs: number;
  clips: RawVideoEdlClip[];
  overlays: RawVideoEdlOverlay[];
  captions: RawVideoEdlCaption[];
  chapters: RawVideoEdlChapter[];
};

export type ClipReviewCard = {
  clipId: string;
  reviewState: ClipReviewState;
  reviewReason: string;
  transcriptText: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  removalCandidate: boolean;
};

export function createEmptyRawVideoEdl(input: {
  jobId: string;
  sourceVideoId: string;
}): RawVideoEdl {
  return {
    version: "raw-video-edl-v1",
    jobId: input.jobId,
    sourceVideoId: input.sourceVideoId,
    totalDurationMs: 0,
    clips: [],
    overlays: [],
    captions: [],
    chapters: [],
  };
}

export function validateRawVideoEdlShape(edl: RawVideoEdl) {
  if (edl.version !== "raw-video-edl-v1") {
    throw new Error(`Invalid EDL version "${edl.version}".`);
  }
  if (!edl.jobId.trim()) {
    throw new Error("EDL jobId is required.");
  }
  if (!edl.sourceVideoId.trim()) {
    throw new Error("EDL sourceVideoId is required.");
  }
  if (!Array.isArray(edl.clips) || !Array.isArray(edl.overlays) || !Array.isArray(edl.captions) || !Array.isArray(edl.chapters)) {
    throw new Error("EDL collections must be arrays.");
  }
  return true;
}

export function validateRawVideoEdlRules(edl: RawVideoEdl) {
  validateRawVideoEdlShape(edl);

  for (const clip of edl.clips) {
    if (clip.startMs < 0 || clip.endMs < 0 || clip.durationMs < 0) {
      throw new Error(`EDL clip ${clip.clipId} contains negative timing.`);
    }
    if (clip.endMs < clip.startMs) {
      throw new Error(`EDL clip ${clip.clipId} has end before start.`);
    }
    if (clip.durationMs !== clip.endMs - clip.startMs) {
      throw new Error(`EDL clip ${clip.clipId} duration does not match its range.`);
    }
    if (clip.endMs > edl.totalDurationMs) {
      throw new Error(`EDL clip ${clip.clipId} exceeds total duration.`);
    }
    if (!clip.transcriptText.trim()) {
      throw new Error(`EDL clip ${clip.clipId} is missing transcript text.`);
    }
    if (clip.reviewState && !CLIP_REVIEW_STATES.includes(clip.reviewState)) {
      throw new Error(`EDL clip ${clip.clipId} has invalid review state.`);
    }
    if (clip.reviewState && !clip.reviewReason?.trim()) {
      throw new Error(`EDL clip ${clip.clipId} is missing review reason.`);
    }
  }

  const sortedClips = [...edl.clips].sort((a, b) => a.startMs - b.startMs);
  for (let index = 1; index < sortedClips.length; index += 1) {
    const previous = sortedClips[index - 1]!;
    const current = sortedClips[index]!;
    if (current.startMs < previous.endMs) {
      throw new Error(`EDL clips ${previous.clipId} and ${current.clipId} overlap.`);
    }
  }

  for (const caption of edl.captions) {
    if (caption.startMs < 0 || caption.endMs < caption.startMs || caption.endMs > edl.totalDurationMs) {
      throw new Error(`EDL caption ${caption.captionId} has invalid timing.`);
    }
    if (!caption.text.trim()) {
      throw new Error(`EDL caption ${caption.captionId} is missing text.`);
    }
  }

  for (const overlay of edl.overlays) {
    if (overlay.startMs < 0 || overlay.endMs < overlay.startMs || overlay.endMs > edl.totalDurationMs) {
      throw new Error(`EDL overlay ${overlay.overlayId} has invalid timing.`);
    }
    if (!overlay.text.trim()) {
      throw new Error(`EDL overlay ${overlay.overlayId} is missing text.`);
    }
  }

  for (const chapter of edl.chapters) {
    if (chapter.startMs < 0 || chapter.endMs < chapter.startMs || chapter.endMs > edl.totalDurationMs) {
      throw new Error(`EDL chapter ${chapter.chapterId} has invalid timing.`);
    }
    if (!chapter.title.trim()) {
      throw new Error(`EDL chapter ${chapter.chapterId} is missing title.`);
    }
  }

  return true;
}

export function buildClipReviewCards(edl: RawVideoEdl): ClipReviewCard[] {
  validateRawVideoEdlShape(edl);

  return edl.clips.map((clip) => ({
    clipId: clip.clipId,
    reviewState: clip.reviewState ?? (clip.removalCandidate ? "removed" : "kept"),
    reviewReason:
      clip.reviewReason?.trim()
        || (clip.removalCandidate
          ? "当前片段被标记为可删减候选，等待人工复核。"
          : "当前片段默认保留，等待人工确认。"),
    transcriptText: clip.transcriptText,
    startMs: clip.startMs,
    endMs: clip.endMs,
    durationMs: clip.durationMs,
    removalCandidate: Boolean(clip.removalCandidate),
  }));
}

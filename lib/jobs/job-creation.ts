import crypto from "node:crypto";

import { buildJobAssetPaths } from "../assets/job-assets.js";
import type { JobState } from "../domain/job-state.js";
import { parseMarkdownToSceneGraph } from "../parser/markdown-scene-graph.js";
import { parseTextToSceneGraph } from "../parser/text-fallback.js";
import type { SceneGraph } from "../types/scene-graph.js";
import type { JobDashboardRecord } from "../ui/job-dashboard.js";
import {
  SUBTITLE_STYLES,
  TRANSITION_STYLES,
  buildStoryboardPreview,
  type StoryboardPreview,
} from "../ui/storyboard-preview.js";
import type { WizardConfigDraft } from "../ui/wizard-config.js";

export type CreatedVideoJob = {
  record: JobDashboardRecord;
  manifest: SceneGraph;
  storyboard: StoryboardPreview;
  outputPaths: ReturnType<typeof buildJobAssetPaths>;
};

function createJobId(draft: Pick<WizardConfigDraft, "title" | "ownerToken" | "scriptText">) {
  const hash = crypto
    .createHash("sha256")
    .update([draft.title, draft.ownerToken, draft.scriptText, Date.now().toString()].join("|"))
    .digest("hex")
    .slice(0, 10);

  return `job-${hash}`;
}

function hashOwnerToken(ownerToken: string) {
  return crypto.createHash("sha256").update(ownerToken).digest("hex");
}

function toManifest(draft: WizardConfigDraft) {
  if (draft.scriptMode === "markdown") {
    return parseMarkdownToSceneGraph(draft.scriptText);
  }

  return parseTextToSceneGraph(draft.scriptText, {
    title: draft.title,
    platform: draft.platform,
    renderProfile: draft.renderProfile,
    author: draft.author,
    ttsVoice: draft.ttsVoice,
  });
}

function buildStoryboard(manifest: SceneGraph) {
  return buildStoryboardPreview({
    scenes: manifest.scenes.map((scene) => ({
      id: scene.id,
      narration: scene.narration,
      visualHint: scene.visual_hint,
      durationMs: scene.duration_ms,
      transition: TRANSITION_STYLES[1],
    })),
    controls: {
      textMode: "original",
      subtitleStyle: SUBTITLE_STYLES[0],
      transitionStyle: TRANSITION_STYLES[1],
    },
  });
}

function buildInitialRecord(input: {
  jobId: string;
  state: JobState;
  draft: WizardConfigDraft;
  manifest: SceneGraph;
}) {
  const now = new Date().toISOString();
  const outputPaths = buildJobAssetPaths(input.jobId);

  return {
    id: input.jobId,
    title: input.draft.title,
    state: input.state,
    platform: input.draft.platform,
    renderProfile: input.draft.renderProfile,
    updatedAt: now,
    createdAt: now,
    progress: input.state === "COMPLETED" ? 100 : 0,
    currentStep: input.state === "QUEUED" ? "waiting_for_worker" : "done",
    manifestId: input.manifest.id,
    ownerTokenHash: hashOwnerToken(input.draft.ownerToken),
    lastCheckpoint: {
      step: "wizard_submission",
      estimatedScenes: input.draft.estimatedScenes,
      stylePreset: input.draft.stylePreset,
      personaPreset: input.draft.personaPreset,
      voiceMode: input.draft.voiceMode,
    },
    outputs: [
      { kind: "video", path: outputPaths.videoPath },
      { kind: "cover", path: outputPaths.coverPath },
      { kind: "metadata", path: outputPaths.metadataPath },
    ],
    errors: [],
  } satisfies JobDashboardRecord;
}

export function createVideoJobFromDraft(draft: WizardConfigDraft): CreatedVideoJob {
  const jobId = createJobId(draft);
  const manifest = toManifest(draft);
  const storyboard = buildStoryboard(manifest);
  const record = buildInitialRecord({
    jobId,
    state: "QUEUED",
    draft,
    manifest,
  });

  return {
    record,
    manifest,
    storyboard,
    outputPaths: buildJobAssetPaths(jobId),
  };
}

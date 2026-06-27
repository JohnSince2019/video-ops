import crypto from "node:crypto";

import { buildCustomVoiceReferenceAbsolutePath } from "../audio/custom-voice-reference.js";
import { buildJobAssetPaths } from "../assets/job-assets.js";
import type { JobState } from "../domain/job-state.js";
import { parseMarkdownToSceneGraph } from "../parser/markdown-scene-graph.js";
import { parseTextToSceneGraph } from "../parser/text-fallback.js";
import { estimateJobCost } from "../domain/cost-estimator.js";
import { runComplianceGuard } from "../domain/compliance-guard.js";
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
  const referenceAudioPath = draft.customVoiceReference
    ? buildCustomVoiceReferenceAbsolutePath(draft.customVoiceReference)
    : undefined;
  const ttsRouteLabel = draft.customVoiceReference
    ? "自定义声音克隆路线"
    : draft.ttsProviderId === "f5-tts"
      ? "高拟真 SaaS 生产路线"
      : draft.ttsProviderId === "melotts"
        ? "低成本批量兜底路线"
        : "默认中文解说路线";

  if (draft.scriptMode === "markdown") {
    const manifest = parseMarkdownToSceneGraph(draft.scriptText);
    return {
      ...manifest,
      metadata: {
        ...manifest.metadata,
        tts_provider_id: draft.ttsProviderId,
        tts_route_label: ttsRouteLabel,
      },
    };
  }

  return parseTextToSceneGraph(draft.scriptText, {
    title: draft.title,
    platform: draft.platform,
    renderProfile: draft.renderProfile,
    author: draft.author,
    ttsVoice: draft.ttsVoice,
    ttsProviderId: draft.ttsProviderId,
    ttsRouteLabel,
    referenceAudioPath,
  });
}

function resolveTtsRouteTier(draft: WizardConfigDraft) {
  if (draft.customVoiceReference) {
    return "identity_clone";
  }
  if (draft.ttsProviderId === "f5-tts") {
    return "premium_production";
  }
  if (draft.ttsProviderId === "melotts") {
    return "cost_fallback";
  }
  return "default_production";
}

function resolveTtsRouteRoleLabel(draft: WizardConfigDraft) {
  if (draft.customVoiceReference) {
    return "自定义声音保真路线";
  }
  if (draft.ttsProviderId === "f5-tts") {
    return "高拟真正式产线";
  }
  if (draft.ttsProviderId === "melotts") {
    return "低成本兜底路线";
  }
  return "第一阶段默认主链路";
}

function resolveTtsAcceptanceHint(draft: WizardConfigDraft) {
  if (draft.customVoiceReference) {
    return "先确认参考音频是否足够稳定，再重点验收音色一致性和辨识度。";
  }
  if (draft.ttsProviderId === "f5-tts") {
    return "更适合听最终产物效果，不以页面即时试听作为主要验收方式。";
  }
  if (draft.ttsProviderId === "melotts") {
    return "重点验收节奏和可用性，不把它当作高拟真最终音色标准。";
  }
  return "可以先在工作台即时试听，再结合最终产物确认自然度和清晰度。";
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
  const compliance = runComplianceGuard(input.draft.scriptText);
  const ttsRouteLabel = input.manifest.metadata.tts_route_label ?? "默认中文解说路线";
  const ttsRouteTier = resolveTtsRouteTier(input.draft);
  const ttsRouteRoleLabel = resolveTtsRouteRoleLabel(input.draft);
  const ttsAcceptanceHint = resolveTtsAcceptanceHint(input.draft);
  const ttsDurationSecs = Math.round(
    input.manifest.scenes.reduce((total, scene) => total + scene.duration_ms, 0) / 1000,
  );

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
      customVoiceReference: input.draft.customVoiceReference ?? null,
      ttsVoice: input.draft.ttsVoice,
      ttsProviderId: input.draft.ttsProviderId,
      ttsRouteLabel,
      ttsRouteTier,
      ttsRouteRoleLabel,
      ttsAcceptanceHint,
    },
    qualitySummary: {
      fileSizeBytes: null,
      durationSec: null,
      resolution: null,
      audioPresence: null,
      subtitleStatus: "planned",
      fallbackStatus: null,
      fallbackReason: null,
      complianceStatus: compliance.allowed ? "allowed" : "blocked",
      complianceViolations: compliance.violations.length,
    },
    costSummary: estimateJobCost({
      gptImageCalls: input.manifest.scenes.length,
      wanxCalls: 0,
      ttsDurationSecs,
    }),
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

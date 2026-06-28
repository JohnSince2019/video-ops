import crypto from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";

import { buildJobAssetPaths, buildJobOutputUrl } from "../assets/job-assets.js";
import type { JobMode } from "../domain/job-mode.js";
import { attachProbeToSourceMetadata, probeSourceVideo, type SourceVideoProbe } from "./source-video-probe.js";
import {
  attachPreviewArtifactsToSourceMetadata,
  generateSourceVideoPreviewArtifacts,
  type SourceVideoPreviewArtifacts,
} from "./source-video-preview.js";
import {
  attachTranscriptToSourceMetadata,
  transcribeSourceVideo,
  type SourceVideoTranscript,
} from "./source-video-transcript.js";
import {
  attachSubtitleTimelineToSourceMetadata,
  buildRawSubtitleTimeline,
  type RawSubtitleTimeline,
  writeRawSubtitleTimeline,
} from "./subtitle-timeline.js";
import {
  attachTranscriptAnalysisToSourceMetadata,
  type TranscriptAnalysis,
  writeTranscriptAnalysis,
} from "./transcript-analyzer.js";
import {
  buildDefaultEditIntentOptions,
  recommendEditIntentOptions,
  summarizeEditIntentOptions,
  type EditIntentOptions,
} from "./edit-intent-options.js";
import { buildSourceVideo, type SourceVideo } from "./source-video.js";
import type { JobDashboardRecord } from "../ui/job-dashboard.js";
import type { RenderProfile, SupportedPlatform } from "../types/manifest.js";

export type RawVideoJobInput = {
  title: string;
  ownerToken: string;
  platform: SupportedPlatform;
  renderProfile: RenderProfile;
  sourceFileName?: string;
  sourceMimeType?: string;
  sourceVideoBase64?: string;
};

export type CreatedRawVideoJob = {
  record: JobDashboardRecord;
  sourceVideo: SourceVideo;
  sourceProbe?: SourceVideoProbe;
  sourcePreviewArtifacts?: SourceVideoPreviewArtifacts;
  transcript?: SourceVideoTranscript;
  subtitleTimeline?: RawSubtitleTimeline;
  transcriptAnalysis?: TranscriptAnalysis;
  editIntentOptions: EditIntentOptions;
  outputPaths: ReturnType<typeof buildJobAssetPaths>;
};

function createJobId(input: Pick<RawVideoJobInput, "title" | "ownerToken">) {
  const hash = crypto
    .createHash("sha256")
    .update([input.title, input.ownerToken, Date.now().toString()].join("|"))
    .digest("hex")
    .slice(0, 10);

  return `job-${hash}`;
}

function hashOwnerToken(ownerToken: string) {
  return crypto.createHash("sha256").update(ownerToken).digest("hex");
}

function normalizeBase64(payload?: string) {
  const value = payload?.trim();
  if (!value) {
    return null;
  }

  const match = value.match(/^data:[^;]+;base64,(.+)$/);
  return match ? match[1] : value;
}

async function ensureParentDirectory(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function writeSourceVideoArtifacts(rootDir: string, sourceVideo: SourceVideo, base64Payload?: string) {
  const normalized = normalizeBase64(base64Payload);
  if (normalized) {
    await ensureParentDirectory(path.join(rootDir, sourceVideo.originalPath));
    await fs.writeFile(path.join(rootDir, sourceVideo.originalPath), Buffer.from(normalized, "base64"));
  }

  await ensureParentDirectory(path.join(rootDir, sourceVideo.metadataPath));
  await fs.writeFile(
    path.join(rootDir, sourceVideo.metadataPath),
    JSON.stringify(
      {
        id: sourceVideo.id,
        jobId: sourceVideo.jobId,
        fileName: sourceVideo.fileName,
        mimeType: sourceVideo.mimeType,
        originalPath: sourceVideo.originalPath,
        proxyPath: sourceVideo.proxyPath,
        thumbnailPath: sourceVideo.thumbnailPath,
        keyframesDir: sourceVideo.keyframesDir,
        clipsDir: sourceVideo.clipsDir,
        transcriptPath: sourceVideo.transcriptPath,
        transcriptWordsPath: sourceVideo.transcriptWordsPath,
        subtitleTimelinePath: sourceVideo.subtitleTimelinePath,
        subtitleSrtPath: sourceVideo.subtitleSrtPath,
        subtitleVttPath: sourceVideo.subtitleVttPath,
        analysisPath: sourceVideo.analysisPath,
        edlPath: sourceVideo.edlPath,
        clipManifestPath: sourceVideo.clipManifestPath,
        cleanEditPath: sourceVideo.cleanEditPath,
        normalizedCleanEditPath: sourceVideo.normalizedCleanEditPath,
        loudnessReportPath: sourceVideo.loudnessReportPath,
        cleanEditQualityReportPath: sourceVideo.cleanEditQualityReportPath,
        rawVideoQualityGateReportPath: sourceVideo.rawVideoQualityGateReportPath,
        rawVideoCriticReportPath: sourceVideo.rawVideoCriticReportPath,
        remotionPropsPath: sourceVideo.remotionPropsPath,
        remotionRenderMetadataPath: sourceVideo.remotionRenderMetadataPath,
        remotionDir: sourceVideo.remotionDir,
      },
      null,
      2,
    ),
    "utf8",
  );
}

function buildRawVideoRecord(input: {
  jobId: string;
  jobMode: JobMode;
  title: string;
  platform: SupportedPlatform;
  renderProfile: RenderProfile;
  ownerToken: string;
  sourceVideo: SourceVideo;
  editIntentOptions: EditIntentOptions;
}): JobDashboardRecord {
  const now = new Date().toISOString();
  const editIntentSummary = summarizeEditIntentOptions(input.editIntentOptions);

  return {
    id: input.jobId,
    title: input.title,
    jobMode: input.jobMode,
    state: "QUEUED",
    platform: input.platform,
    renderProfile: input.renderProfile,
    updatedAt: now,
    createdAt: now,
    progress: 0,
    currentStep: "source_video_received",
    ownerTokenHash: hashOwnerToken(input.ownerToken),
    lastCheckpoint: {
      step: "source_video_received",
      sourceVideoId: input.sourceVideo.id,
      sourceFileName: input.sourceVideo.fileName,
      sourceMimeType: input.sourceVideo.mimeType,
      sourceVideoPath: input.sourceVideo.originalPath,
      proxyPath: input.sourceVideo.proxyPath,
      thumbnailPath: input.sourceVideo.thumbnailPath,
      transcriptPath: input.sourceVideo.transcriptPath,
      edlPath: input.sourceVideo.edlPath,
      editIntentOptions: input.editIntentOptions,
      editIntentSummary,
      stageNarration: "原始视频素材已接收，等待进入元数据探测和转写分析阶段。",
    },
    qualitySummary: {
      fileSizeBytes: null,
      durationSec: null,
      resolution: null,
      audioPresence: null,
      subtitleStatus: "planned",
      fallbackStatus: null,
      fallbackReason: null,
      complianceStatus: "allowed",
      complianceViolations: 0,
    },
    costSummary: {
      gptImageUsd: 0,
      wanxUsd: 0,
      ttsUsd: 0,
      totalUsd: 0,
    },
    outputs: [
      { kind: "source_video", path: input.sourceVideo.originalPath, url: buildJobOutputUrl(input.sourceVideo.originalPath) },
      { kind: "source_metadata", path: input.sourceVideo.metadataPath, url: buildJobOutputUrl(input.sourceVideo.metadataPath) },
    ],
    errors: [],
  };
}

export async function createRawVideoJobFromInput(
  input: RawVideoJobInput,
  options?: { workspaceRoot?: string },
): Promise<CreatedRawVideoJob> {
  const workspaceRoot = options?.workspaceRoot ?? process.cwd();
  const jobId = createJobId(input);
  const outputPaths = buildJobAssetPaths(jobId);
  const sourceVideo = buildSourceVideo(jobId, {
    fileName: input.sourceFileName,
    mimeType: input.sourceMimeType,
  });
  let editIntentOptions = buildDefaultEditIntentOptions();
  let editIntentSummary = summarizeEditIntentOptions(editIntentOptions);
  let editIntentRecommendation:
    | ReturnType<typeof recommendEditIntentOptions>
    | undefined;

  await writeSourceVideoArtifacts(workspaceRoot, sourceVideo, input.sourceVideoBase64);
  let sourceProbe: SourceVideoProbe | undefined;
  let sourcePreviewArtifacts: SourceVideoPreviewArtifacts | undefined;
  let transcript: SourceVideoTranscript | undefined;
  let subtitleTimeline: RawSubtitleTimeline | undefined;
  let transcriptAnalysis: TranscriptAnalysis | undefined;
  if (input.sourceVideoBase64) {
    sourceProbe = await probeSourceVideo(path.join(workspaceRoot, sourceVideo.originalPath));
    await attachProbeToSourceMetadata(path.join(workspaceRoot, sourceVideo.metadataPath), sourceProbe);
    sourcePreviewArtifacts = await generateSourceVideoPreviewArtifacts({
      workspaceRoot,
      sourceVideoPath: sourceVideo.originalPath,
      proxyPath: sourceVideo.proxyPath,
      thumbnailPath: sourceVideo.thumbnailPath,
      keyframesDir: sourceVideo.keyframesDir,
    });
    await attachPreviewArtifactsToSourceMetadata(
      path.join(workspaceRoot, sourceVideo.metadataPath),
      sourcePreviewArtifacts,
    );
    transcript = await transcribeSourceVideo({
      videoPath: path.join(workspaceRoot, sourceVideo.originalPath),
      transcriptPath: path.join(workspaceRoot, sourceVideo.transcriptPath),
      wordsPath: path.join(workspaceRoot, sourceVideo.transcriptWordsPath),
    });
    await attachTranscriptToSourceMetadata({
      metadataPath: path.join(workspaceRoot, sourceVideo.metadataPath),
      transcriptPath: sourceVideo.transcriptPath,
      wordsPath: sourceVideo.transcriptWordsPath,
      transcript,
    });
    subtitleTimeline = await writeRawSubtitleTimeline({
      transcript,
      timelinePath: path.join(workspaceRoot, sourceVideo.subtitleTimelinePath),
      srtPath: path.join(workspaceRoot, sourceVideo.subtitleSrtPath),
      vttPath: path.join(workspaceRoot, sourceVideo.subtitleVttPath),
    });
    await attachSubtitleTimelineToSourceMetadata({
      metadataPath: path.join(workspaceRoot, sourceVideo.metadataPath),
      timelinePath: sourceVideo.subtitleTimelinePath,
      srtPath: sourceVideo.subtitleSrtPath,
      vttPath: sourceVideo.subtitleVttPath,
      timeline: subtitleTimeline,
    });
    transcriptAnalysis = await writeTranscriptAnalysis({
      transcript,
      subtitleTimeline,
      analysisPath: path.join(workspaceRoot, sourceVideo.analysisPath),
    });
    await attachTranscriptAnalysisToSourceMetadata({
      metadataPath: path.join(workspaceRoot, sourceVideo.metadataPath),
      analysisPath: sourceVideo.analysisPath,
      analysis: transcriptAnalysis,
    });
    editIntentRecommendation = recommendEditIntentOptions({
      transcriptText: transcript.text,
      chapterCount: transcriptAnalysis.chapters.length,
      standoutQuoteCount: transcriptAnalysis.standoutQuotes.length,
      removalSuggestionCount: transcriptAnalysis.removalSuggestions.length,
    });
    editIntentOptions = editIntentRecommendation.options;
    editIntentSummary = summarizeEditIntentOptions(editIntentOptions);
  }

  const record = buildRawVideoRecord({
    jobId,
    jobMode: "raw_video_edit",
    title: input.title,
    platform: input.platform,
    renderProfile: input.renderProfile,
    ownerToken: input.ownerToken,
    sourceVideo,
    editIntentOptions,
  });

  if (sourceProbe) {
    record.lastCheckpoint = {
      ...(record.lastCheckpoint && typeof record.lastCheckpoint === "object" ? record.lastCheckpoint : {}),
      sourceProbe,
    };
    record.qualitySummary = {
      ...(record.qualitySummary ?? {}),
      durationSec: sourceProbe.durationSec,
      resolution: sourceProbe.resolution,
      audioPresence: sourceProbe.hasAudio,
    };
  }
  if (sourcePreviewArtifacts) {
    record.lastCheckpoint = {
      ...(record.lastCheckpoint && typeof record.lastCheckpoint === "object" ? record.lastCheckpoint : {}),
      sourcePreviewArtifacts,
    };
    record.outputs = [
      ...(record.outputs ?? []),
      { kind: "proxy_video", path: sourcePreviewArtifacts.proxyPath, url: buildJobOutputUrl(sourcePreviewArtifacts.proxyPath) },
      { kind: "thumbnail", path: sourcePreviewArtifacts.thumbnailPath, url: buildJobOutputUrl(sourcePreviewArtifacts.thumbnailPath) },
      ...sourcePreviewArtifacts.keyframePaths.map((item, index) => ({
        kind: `keyframe_${index + 1}`,
        path: item,
        url: buildJobOutputUrl(item),
      })),
    ];
  }
  if (transcript) {
    const effectiveTimeline = subtitleTimeline ?? buildRawSubtitleTimeline(transcript);
    record.lastCheckpoint = {
      ...(record.lastCheckpoint && typeof record.lastCheckpoint === "object" ? record.lastCheckpoint : {}),
      transcriptSummary: {
        textPreview: transcript.text.slice(0, 120),
        segmentCount: transcript.segments.length,
        wordCount: transcript.words.length,
      },
      subtitleTimelineSummary: {
        cueCount: effectiveTimeline.cueCount,
        cueSource: effectiveTimeline.cueSource,
      },
      transcriptAnalysisSummary: transcriptAnalysis
        ? {
            topic: transcriptAnalysis.topic,
            chapterCount: transcriptAnalysis.chapters.length,
            standoutQuoteCount: transcriptAnalysis.standoutQuotes.length,
            removalSuggestionCount: transcriptAnalysis.removalSuggestions.length,
          }
        : undefined,
      editIntentOptions,
      editIntentSummary,
      editIntentRecommendation: editIntentRecommendation?.reasons,
    };
    record.qualitySummary = {
      ...(record.qualitySummary ?? {}),
      subtitleStatus: effectiveTimeline.cueCount ? "generated" : "missing",
    };
    record.outputs = [
      ...(record.outputs ?? []),
      { kind: "transcript_json", path: sourceVideo.transcriptPath, url: buildJobOutputUrl(sourceVideo.transcriptPath) },
      { kind: "transcript_words", path: sourceVideo.transcriptWordsPath, url: buildJobOutputUrl(sourceVideo.transcriptWordsPath) },
      { kind: "subtitle_timeline", path: sourceVideo.subtitleTimelinePath, url: buildJobOutputUrl(sourceVideo.subtitleTimelinePath) },
      { kind: "subtitle_srt", path: sourceVideo.subtitleSrtPath, url: buildJobOutputUrl(sourceVideo.subtitleSrtPath) },
      { kind: "subtitle_vtt", path: sourceVideo.subtitleVttPath, url: buildJobOutputUrl(sourceVideo.subtitleVttPath) },
      { kind: "transcript_analysis", path: sourceVideo.analysisPath, url: buildJobOutputUrl(sourceVideo.analysisPath) },
    ];
  }

  return {
    record,
    sourceVideo,
    sourceProbe,
    sourcePreviewArtifacts,
    transcript,
    subtitleTimeline,
    transcriptAnalysis,
    editIntentOptions,
    outputPaths,
  };
}

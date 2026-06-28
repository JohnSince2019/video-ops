import assert from "node:assert/strict";
import test from "node:test";

import { buildJobAssetPaths, buildJobAssetRoot, buildJobOutputUrl } from "../lib/assets/job-assets.js";
import { buildSourceVideo } from "../lib/raw-video/source-video.js";
import { buildOutputPackage } from "../lib/video/output-package.js";

const renderPlan = {
  profile: "standard" as const,
  timelineDurationMs: 9300,
  outputPath: "output/jobs/job-123/video.mp4",
  ffmpegArgs: ["-y", "-i", "timeline-input.txt", "output/jobs/job-123/video.mp4"],
  clips: [
    {
      sceneId: "scene-001",
      imageInput: "output/jobs/job-123/images/scene-001.png",
      audioInput: "output/jobs/job-123/audio/scene-001.wav",
      durationMs: 4200,
      transition: { type: "cut", durationMs: 0 },
    },
  ],
  spec: {
    profile: "standard" as const,
    width: 1080,
    height: 1920,
    videoBitrateKbps: 3500,
    audioBitrateKbps: 128,
    crf: 24,
    preset: "medium",
  },
};

const platformMetadata = {
  platform: "douyin" as const,
  renderProfile: "standard" as const,
  durationMs: 9300,
  orientation: "portrait" as const,
  title: "测试标题",
  description: "测试描述",
  tags: ["抖音"],
  coverText: "测试封面文案",
  category: "channel_video",
};

test("job asset paths follow output/jobs/{jobId} conventions", () => {
  const root = buildJobAssetRoot("job 123");
  const paths = buildJobAssetPaths("job 123");

  assert.equal(root, "output/jobs/job-123");
  assert.equal(paths.sourceDir, "output/jobs/job-123/source");
  assert.equal(paths.proxyDir, "output/jobs/job-123/proxy");
  assert.equal(paths.framesDir, "output/jobs/job-123/frames");
  assert.equal(paths.keyframesDir, "output/jobs/job-123/frames/keyframes");
  assert.equal(paths.clipsDir, "output/jobs/job-123/clips");
  assert.equal(paths.transcriptsDir, "output/jobs/job-123/transcripts");
  assert.equal(paths.analysisDir, "output/jobs/job-123/analysis");
  assert.equal(paths.edlDir, "output/jobs/job-123/edl");
  assert.equal(paths.remotionDir, "output/jobs/job-123/remotion");
  assert.equal(paths.imagesDir, "output/jobs/job-123/images");
  assert.equal(paths.audioDir, "output/jobs/job-123/audio");
  assert.equal(paths.subtitlesDir, "output/jobs/job-123/subtitles");
  assert.equal(paths.proxyVideoPath, "output/jobs/job-123/proxy/proxy.mp4");
  assert.equal(paths.thumbnailPath, "output/jobs/job-123/proxy/thumbnail.jpg");
  assert.equal(paths.transcriptPath, "output/jobs/job-123/transcripts/transcript.json");
  assert.equal(paths.transcriptWordsPath, "output/jobs/job-123/transcripts/words.json");
  assert.equal(paths.subtitleTimelinePath, "output/jobs/job-123/transcripts/subtitle-timeline.json");
  assert.equal(paths.transcriptAnalysisPath, "output/jobs/job-123/analysis/transcript-analysis.json");
  assert.equal(paths.edlPath, "output/jobs/job-123/edl/edit-decision-list.json");
  assert.equal(paths.clipManifestPath, "output/jobs/job-123/clips/clip-manifest.json");
  assert.equal(paths.cleanEditPath, "output/jobs/job-123/clean-edit.mp4");
  assert.equal(paths.normalizedCleanEditPath, "output/jobs/job-123/clean-edit-normalized.mp4");
  assert.equal(paths.loudnessReportPath, "output/jobs/job-123/analysis/clean-edit-loudness.json");
  assert.equal(paths.cleanEditQualityReportPath, "output/jobs/job-123/analysis/clean-edit-quality-report.json");
  assert.equal(paths.remotionPropsPath, "output/jobs/job-123/remotion/clean-knowledge-talk-props.json");
  assert.equal(paths.remotionRenderMetadataPath, "output/jobs/job-123/remotion/render-metadata.json");
  assert.equal(paths.subtitleSrtPath, "output/jobs/job-123/subtitles/captions.srt");
  assert.equal(paths.subtitleVttPath, "output/jobs/job-123/subtitles/captions.vtt");
  assert.equal(paths.sourceMetadataPath, "output/jobs/job-123/source/source-video.json");
  assert.equal(paths.videoPath, "output/jobs/job-123/video.mp4");
  assert.equal(paths.metadataPath, "output/jobs/job-123/metadata.json");
});

test("source video record uses raw-video asset paths instead of treating the upload as a generic attachment", () => {
  const sourceVideo = buildSourceVideo("job raw 01", {
    fileName: "john-demo.mov",
    mimeType: "video/quicktime",
  });

  assert.equal(sourceVideo.id, "job raw 01-source-video");
  assert.equal(sourceVideo.jobId, "job raw 01");
  assert.equal(sourceVideo.fileName, "john-demo.mov");
  assert.equal(sourceVideo.mimeType, "video/quicktime");
  assert.equal(sourceVideo.originalPath, "output/jobs/job-raw-01/source/john-demo.mov");
  assert.equal(sourceVideo.proxyPath, "output/jobs/job-raw-01/proxy/proxy.mp4");
  assert.equal(sourceVideo.thumbnailPath, "output/jobs/job-raw-01/proxy/thumbnail.jpg");
  assert.equal(sourceVideo.keyframesDir, "output/jobs/job-raw-01/frames/keyframes");
  assert.equal(sourceVideo.clipsDir, "output/jobs/job-raw-01/clips");
  assert.equal(sourceVideo.transcriptPath, "output/jobs/job-raw-01/transcripts/transcript.json");
  assert.equal(sourceVideo.transcriptWordsPath, "output/jobs/job-raw-01/transcripts/words.json");
  assert.equal(sourceVideo.subtitleTimelinePath, "output/jobs/job-raw-01/transcripts/subtitle-timeline.json");
  assert.equal(sourceVideo.subtitleSrtPath, "output/jobs/job-raw-01/subtitles/captions.srt");
  assert.equal(sourceVideo.subtitleVttPath, "output/jobs/job-raw-01/subtitles/captions.vtt");
  assert.equal(sourceVideo.analysisPath, "output/jobs/job-raw-01/analysis/transcript-analysis.json");
  assert.equal(sourceVideo.edlPath, "output/jobs/job-raw-01/edl/edit-decision-list.json");
  assert.equal(sourceVideo.clipManifestPath, "output/jobs/job-raw-01/clips/clip-manifest.json");
  assert.equal(sourceVideo.cleanEditPath, "output/jobs/job-raw-01/clean-edit.mp4");
  assert.equal(sourceVideo.normalizedCleanEditPath, "output/jobs/job-raw-01/clean-edit-normalized.mp4");
  assert.equal(sourceVideo.loudnessReportPath, "output/jobs/job-raw-01/analysis/clean-edit-loudness.json");
  assert.equal(sourceVideo.cleanEditQualityReportPath, "output/jobs/job-raw-01/analysis/clean-edit-quality-report.json");
  assert.equal(sourceVideo.remotionPropsPath, "output/jobs/job-raw-01/remotion/clean-knowledge-talk-props.json");
  assert.equal(sourceVideo.remotionRenderMetadataPath, "output/jobs/job-raw-01/remotion/render-metadata.json");
  assert.equal(sourceVideo.remotionDir, "output/jobs/job-raw-01/remotion");
  assert.equal(sourceVideo.metadataPath, "output/jobs/job-raw-01/source/source-video.json");
});

test("output urls and fallback metadata are exposed to downstream UI/api consumers", () => {
  const output = buildOutputPackage({
    renderPlan,
    platformMetadata,
    coverPath: "output/jobs/job-123/cover.png",
    providerMetadata: {
      render: {
        stage: "render",
        provider: "ffmpeg-local",
        mode: "fallback",
        originalProvider: "cloud-renderer",
        fallbackReason: "cloud queue unavailable",
      },
    },
  });

  assert.equal(buildJobOutputUrl("output/jobs/job-123/video.mp4"), "/output/jobs/job-123/video.mp4");
  assert.equal(output.video.url, "/output/jobs/job-123/video.mp4");
  assert.equal(output.cover.url, "/output/jobs/job-123/cover.png");
  assert.equal(output.metadataFile.url, "/output/jobs/job-123/metadata.json");
  assert.equal(output.metadata.providerMetadata?.render?.mode, "fallback");
  assert.equal(output.metadata.providerMetadata?.render?.fallbackReason, "cloud queue unavailable");
  assert.equal(output.artifacts.find((item) => item.kind === "video")?.url, "/output/jobs/job-123/video.mp4");
  assert.equal(output.artifacts.find((item) => item.kind === "metadata")?.path, "output/jobs/job-123/metadata.json");
});

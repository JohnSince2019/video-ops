import path from "node:path";

function sanitizePathSegment(value: string, fallback: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "") || fallback;
}

export function buildJobAssetRoot(jobId: string) {
  const normalizedJobId = sanitizePathSegment(jobId, "job");
  return path.posix.join("output", "jobs", normalizedJobId);
}

export function buildJobAssetPaths(jobId: string) {
  const rootDir = buildJobAssetRoot(jobId);

  return {
    rootDir,
    sourceDir: path.posix.join(rootDir, "source"),
    proxyDir: path.posix.join(rootDir, "proxy"),
    framesDir: path.posix.join(rootDir, "frames"),
    keyframesDir: path.posix.join(rootDir, "frames", "keyframes"),
    clipsDir: path.posix.join(rootDir, "clips"),
    transcriptsDir: path.posix.join(rootDir, "transcripts"),
    analysisDir: path.posix.join(rootDir, "analysis"),
    edlDir: path.posix.join(rootDir, "edl"),
    remotionDir: path.posix.join(rootDir, "remotion"),
    imagesDir: path.posix.join(rootDir, "images"),
    brollDir: path.posix.join(rootDir, "broll"),
    audioDir: path.posix.join(rootDir, "audio"),
    subtitlesDir: path.posix.join(rootDir, "subtitles"),
    tempDir: path.posix.join(rootDir, "tmp"),
    proxyVideoPath: path.posix.join(rootDir, "proxy", "proxy.mp4"),
    thumbnailPath: path.posix.join(rootDir, "proxy", "thumbnail.jpg"),
    transcriptPath: path.posix.join(rootDir, "transcripts", "transcript.json"),
    transcriptWordsPath: path.posix.join(rootDir, "transcripts", "words.json"),
    subtitleTimelinePath: path.posix.join(rootDir, "transcripts", "subtitle-timeline.json"),
    transcriptAnalysisPath: path.posix.join(rootDir, "analysis", "transcript-analysis.json"),
    edlPath: path.posix.join(rootDir, "edl", "edit-decision-list.json"),
    clipManifestPath: path.posix.join(rootDir, "clips", "clip-manifest.json"),
    cleanEditPath: path.posix.join(rootDir, "clean-edit.mp4"),
    normalizedCleanEditPath: path.posix.join(rootDir, "clean-edit-normalized.mp4"),
    loudnessReportPath: path.posix.join(rootDir, "analysis", "clean-edit-loudness.json"),
    cleanEditQualityReportPath: path.posix.join(rootDir, "analysis", "clean-edit-quality-report.json"),
    rawVideoQualityGateReportPath: path.posix.join(rootDir, "analysis", "raw-video-quality-gate.json"),
    rawVideoCriticReportPath: path.posix.join(rootDir, "analysis", "raw-video-critic-report.json"),
    remotionPropsPath: path.posix.join(rootDir, "remotion", "clean-knowledge-talk-props.json"),
    remotionRenderMetadataPath: path.posix.join(rootDir, "remotion", "render-metadata.json"),
    subtitleSrtPath: path.posix.join(rootDir, "subtitles", "captions.srt"),
    subtitleVttPath: path.posix.join(rootDir, "subtitles", "captions.vtt"),
    sourceMetadataPath: path.posix.join(rootDir, "source", "source-video.json"),
    videoPath: path.posix.join(rootDir, "video.mp4"),
    coverPath: path.posix.join(rootDir, "cover.png"),
    metadataPath: path.posix.join(rootDir, "metadata.json"),
  };
}

export function buildJobOutputUrl(assetPath: string) {
  const normalized = assetPath.replace(/^\/+/, "");
  return `/${normalized}`;
}

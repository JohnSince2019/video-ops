import { buildJobAssetPaths } from "../assets/job-assets.js";

export type SourceVideo = {
  id: string;
  jobId: string;
  fileName: string;
  mimeType: string;
  originalPath: string;
  proxyPath: string;
  thumbnailPath: string;
  keyframesDir: string;
  clipsDir: string;
  transcriptPath: string;
  transcriptWordsPath: string;
  subtitleTimelinePath: string;
  subtitleSrtPath: string;
  subtitleVttPath: string;
  analysisPath: string;
  edlPath: string;
  clipManifestPath: string;
  cleanEditPath: string;
  normalizedCleanEditPath: string;
  loudnessReportPath: string;
  cleanEditQualityReportPath: string;
  rawVideoQualityGateReportPath: string;
  rawVideoCriticReportPath: string;
  remotionPropsPath: string;
  remotionRenderMetadataPath: string;
  remotionDir: string;
  metadataPath: string;
};

function sanitizeFileName(fileName: string) {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return "source-video.mp4";
  }

  return trimmed.replace(/[\\/]+/g, "-");
}

function buildSourceVideoId(jobId: string) {
  return `${jobId}-source-video`;
}

export function buildSourceVideo(jobId: string, input?: { fileName?: string; mimeType?: string }): SourceVideo {
  const paths = buildJobAssetPaths(jobId);
  const fileName = sanitizeFileName(input?.fileName ?? "source-video.mp4");

  return {
    id: buildSourceVideoId(jobId),
    jobId,
    fileName,
    mimeType: input?.mimeType?.trim() || "video/mp4",
    originalPath: `${paths.sourceDir}/${fileName}`,
    proxyPath: paths.proxyVideoPath,
    thumbnailPath: paths.thumbnailPath,
    keyframesDir: paths.keyframesDir,
    clipsDir: paths.clipsDir,
    transcriptPath: paths.transcriptPath,
    transcriptWordsPath: paths.transcriptWordsPath,
    subtitleTimelinePath: paths.subtitleTimelinePath,
    subtitleSrtPath: paths.subtitleSrtPath,
    subtitleVttPath: paths.subtitleVttPath,
    analysisPath: paths.transcriptAnalysisPath,
    edlPath: paths.edlPath,
    clipManifestPath: paths.clipManifestPath,
    cleanEditPath: paths.cleanEditPath,
    normalizedCleanEditPath: paths.normalizedCleanEditPath,
    loudnessReportPath: paths.loudnessReportPath,
    cleanEditQualityReportPath: paths.cleanEditQualityReportPath,
    rawVideoQualityGateReportPath: paths.rawVideoQualityGateReportPath,
    rawVideoCriticReportPath: paths.rawVideoCriticReportPath,
    remotionPropsPath: paths.remotionPropsPath,
    remotionRenderMetadataPath: paths.remotionRenderMetadataPath,
    remotionDir: paths.remotionDir,
    metadataPath: paths.sourceMetadataPath,
  };
}

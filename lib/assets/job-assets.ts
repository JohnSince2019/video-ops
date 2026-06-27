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
    imagesDir: path.posix.join(rootDir, "images"),
    brollDir: path.posix.join(rootDir, "broll"),
    audioDir: path.posix.join(rootDir, "audio"),
    subtitlesDir: path.posix.join(rootDir, "subtitles"),
    tempDir: path.posix.join(rootDir, "tmp"),
    videoPath: path.posix.join(rootDir, "video.mp4"),
    coverPath: path.posix.join(rootDir, "cover.png"),
    metadataPath: path.posix.join(rootDir, "metadata.json"),
  };
}

export function buildJobOutputUrl(assetPath: string) {
  const normalized = assetPath.replace(/^\/+/, "");
  return `/${normalized}`;
}

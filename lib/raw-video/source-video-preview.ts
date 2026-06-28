import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const EXEC_OPTIONS = { maxBuffer: 10 * 1024 * 1024 };

export type SourceVideoPreviewArtifacts = {
  proxyPath: string;
  thumbnailPath: string;
  keyframePaths: string[];
};

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function generateSourceVideoPreviewArtifacts(input: {
  workspaceRoot: string;
  sourceVideoPath: string;
  proxyPath: string;
  thumbnailPath: string;
  keyframesDir: string;
}): Promise<SourceVideoPreviewArtifacts> {
  const absoluteSourcePath = path.join(input.workspaceRoot, input.sourceVideoPath);
  const absoluteProxyPath = path.join(input.workspaceRoot, input.proxyPath);
  const absoluteThumbnailPath = path.join(input.workspaceRoot, input.thumbnailPath);
  const absoluteKeyframesDir = path.join(input.workspaceRoot, input.keyframesDir);

  await ensureDir(path.dirname(absoluteProxyPath));
  await ensureDir(path.dirname(absoluteThumbnailPath));
  await ensureDir(absoluteKeyframesDir);

  await execFileAsync(
    "ffmpeg",
    [
      "-loglevel",
      "error",
      "-y",
      "-i",
      absoluteSourcePath,
      "-vf",
      "scale='min(720,iw)':-2",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "30",
      "-c:a",
      "aac",
      "-b:a",
      "96k",
      absoluteProxyPath,
    ],
    EXEC_OPTIONS,
  );

  await execFileAsync(
    "ffmpeg",
    [
      "-loglevel",
      "error",
      "-y",
      "-i",
      absoluteSourcePath,
      "-frames:v",
      "1",
      "-q:v",
      "2",
      absoluteThumbnailPath,
    ],
    EXEC_OPTIONS,
  );

  const keyframePattern = path.join(absoluteKeyframesDir, "frame-%03d.jpg");
  await execFileAsync(
    "ffmpeg",
    [
      "-loglevel",
      "error",
      "-y",
      "-i",
      absoluteSourcePath,
      "-vf",
      "fps=1/2,scale='min(960,iw)':-2",
      "-frames:v",
      "3",
      "-q:v",
      "3",
      keyframePattern,
    ],
    EXEC_OPTIONS,
  );

  const files = (await fs.readdir(absoluteKeyframesDir))
    .filter((name) => name.endsWith(".jpg"))
    .sort()
    .map((name) => path.posix.join(input.keyframesDir, name));

  return {
    proxyPath: input.proxyPath,
    thumbnailPath: input.thumbnailPath,
    keyframePaths: files,
  };
}

export async function attachPreviewArtifactsToSourceMetadata(
  metadataPath: string,
  previews: SourceVideoPreviewArtifacts,
) {
  const raw = await fs.readFile(metadataPath, "utf8");
  const metadata = JSON.parse(raw);
  const next = {
    ...metadata,
    previewArtifacts: previews,
  };

  await ensureDir(path.dirname(metadataPath));
  await fs.writeFile(metadataPath, JSON.stringify(next, null, 2), "utf8");

  return next;
}

import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { validateRawVideoEdlRules, type RawVideoEdl } from "./edl-schema.js";

const execFileAsync = promisify(execFile);
const EXEC_OPTIONS = { maxBuffer: 20 * 1024 * 1024 };

export type RawVideoClipArtifact = {
  clipId: string;
  sourceVideoId: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  transcriptText: string;
  reviewState: "kept" | "removed" | "restored";
  outputPath: string;
  outputUrl: string;
};

export type RawVideoClipManifest = {
  version: "raw-video-clip-manifest-v1";
  jobId: string;
  sourceVideoId: string;
  clipCount: number;
  clips: RawVideoClipArtifact[];
};

function sanitizeClipId(value: string, fallback: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "") || fallback;
}

function buildOutputUrl(relativePath: string) {
  return `/${relativePath.replace(/^\/+/, "")}`;
}

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

function normalizeReviewState(reviewState?: "kept" | "removed" | "restored", removalCandidate?: boolean) {
  if (reviewState) {
    return reviewState;
  }

  return removalCandidate ? "removed" : "kept";
}

export async function cutRawVideoEdlClips(input: {
  workspaceRoot: string;
  sourceVideoPath: string;
  edl: RawVideoEdl;
  clipsDir: string;
  clipManifestPath?: string;
  runner?: (
    file: string,
    args: string[],
    options?: { maxBuffer?: number },
  ) => Promise<{ stdout: string; stderr?: string }>;
}) {
  validateRawVideoEdlRules(input.edl);

  const absoluteSourcePath = path.join(input.workspaceRoot, input.sourceVideoPath);
  const absoluteClipsDir = path.join(input.workspaceRoot, input.clipsDir);
  const absoluteClipManifestPath = input.clipManifestPath
    ? path.join(input.workspaceRoot, input.clipManifestPath)
    : null;
  const run =
    input.runner
    ?? ((file, args, options) =>
      execFileAsync(file, args, { maxBuffer: options?.maxBuffer ?? EXEC_OPTIONS.maxBuffer }));

  await ensureDir(absoluteClipsDir);

  const clips: RawVideoClipArtifact[] = [];
  for (const [index, clip] of input.edl.clips.entries()) {
    const basename = `${String(index + 1).padStart(3, "0")}-${sanitizeClipId(clip.clipId, `clip-${index + 1}`)}.mp4`;
    const relativeOutputPath = path.posix.join(input.clipsDir, basename);
    const absoluteOutputPath = path.join(input.workspaceRoot, relativeOutputPath);

    await run(
      "ffmpeg",
      [
        "-loglevel",
        "error",
        "-y",
        "-ss",
        (clip.startMs / 1000).toFixed(3),
        "-i",
        absoluteSourcePath,
        "-t",
        (clip.durationMs / 1000).toFixed(3),
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-movflags",
        "+faststart",
        absoluteOutputPath,
      ],
      EXEC_OPTIONS,
    );

    clips.push({
      clipId: clip.clipId,
      sourceVideoId: clip.sourceVideoId,
      startMs: clip.startMs,
      endMs: clip.endMs,
      durationMs: clip.durationMs,
      transcriptText: clip.transcriptText,
      reviewState: normalizeReviewState(clip.reviewState, clip.removalCandidate),
      outputPath: relativeOutputPath,
      outputUrl: buildOutputUrl(relativeOutputPath),
    });
  }

  const manifest: RawVideoClipManifest = {
    version: "raw-video-clip-manifest-v1",
    jobId: input.edl.jobId,
    sourceVideoId: input.edl.sourceVideoId,
    clipCount: clips.length,
    clips,
  };

  if (absoluteClipManifestPath) {
    await ensureDir(path.dirname(absoluteClipManifestPath));
    await fs.writeFile(absoluteClipManifestPath, JSON.stringify(manifest, null, 2), "utf8");
  }

  return manifest;
}

export async function attachClipManifestToSourceMetadata(input: {
  metadataPath: string;
  clipManifestPath: string;
  clipManifest: RawVideoClipManifest;
}) {
  const raw = await fs.readFile(input.metadataPath, "utf8");
  const metadata = JSON.parse(raw);
  const next = {
    ...metadata,
    clipArtifacts: {
      manifestPath: input.clipManifestPath,
      clipCount: input.clipManifest.clipCount,
      clips: input.clipManifest.clips.map((clip) => ({
        clipId: clip.clipId,
        reviewState: clip.reviewState,
        outputPath: clip.outputPath,
        startMs: clip.startMs,
        endMs: clip.endMs,
        durationMs: clip.durationMs,
      })),
    },
  };

  await ensureDir(path.dirname(input.metadataPath));
  await fs.writeFile(input.metadataPath, JSON.stringify(next, null, 2), "utf8");

  return next;
}

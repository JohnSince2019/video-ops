import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import type { RawVideoClipManifest } from "./edl-clip-cutter.js";

const execFileAsync = promisify(execFile);
const EXEC_OPTIONS = { maxBuffer: 20 * 1024 * 1024 };

export type CleanEditAssemblyResult = {
  version: "raw-video-clean-edit-v1";
  jobId: string;
  sourceVideoId: string;
  approvedClipCount: number;
  skippedClipCount: number;
  outputPath: string;
  outputUrl: string;
  concatListPath: string;
  approvedClipIds: string[];
};

function buildOutputUrl(relativePath: string) {
  return `/${relativePath.replace(/^\/+/, "")}`;
}

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function assembleCleanEditFromClipManifest(input: {
  workspaceRoot: string;
  clipManifest: RawVideoClipManifest;
  outputPath: string;
  concatListPath?: string;
  runner?: (
    file: string,
    args: string[],
    options?: { maxBuffer?: number },
  ) => Promise<{ stdout: string; stderr?: string }>;
}) {
  const run =
    input.runner
    ?? ((file, args, options) =>
      execFileAsync(file, args, { maxBuffer: options?.maxBuffer ?? EXEC_OPTIONS.maxBuffer }));
  const approvedClips = input.clipManifest.clips.filter((clip) => clip.reviewState !== "removed");
  const effectiveClips = approvedClips.length > 0 ? approvedClips : input.clipManifest.clips;

  if (effectiveClips.length === 0) {
    throw new Error("No clips available to assemble clean edit.");
  }

  const absoluteOutputPath = path.join(input.workspaceRoot, input.outputPath);
  const relativeConcatPath =
    input.concatListPath ?? path.posix.join(path.posix.dirname(input.outputPath), "clean-edit-concat.txt");
  const absoluteConcatPath = path.join(input.workspaceRoot, relativeConcatPath);

  await ensureDir(path.dirname(absoluteOutputPath));
  await ensureDir(path.dirname(absoluteConcatPath));

  const concatFile = effectiveClips
    .map((clip) => {
      const absoluteClipPath = path.resolve(path.join(input.workspaceRoot, clip.outputPath));
      return `file '${absoluteClipPath.replace(/'/g, "'\\''")}'`;
    })
    .join("\n");
  await fs.writeFile(absoluteConcatPath, concatFile, "utf8");

  await run(
    "ffmpeg",
    [
      "-loglevel",
      "error",
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      absoluteConcatPath,
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

  return {
    version: "raw-video-clean-edit-v1",
    jobId: input.clipManifest.jobId,
    sourceVideoId: input.clipManifest.sourceVideoId,
    approvedClipCount: effectiveClips.length,
    skippedClipCount: input.clipManifest.clipCount - effectiveClips.length,
    outputPath: input.outputPath,
    outputUrl: buildOutputUrl(input.outputPath),
    concatListPath: relativeConcatPath,
    approvedClipIds: effectiveClips.map((clip) => clip.clipId),
  } satisfies CleanEditAssemblyResult;
}

export async function attachCleanEditToSourceMetadata(input: {
  metadataPath: string;
  cleanEdit: CleanEditAssemblyResult;
}) {
  const raw = await fs.readFile(input.metadataPath, "utf8");
  const metadata = JSON.parse(raw);
  const next = {
    ...metadata,
    cleanEditArtifacts: {
      outputPath: input.cleanEdit.outputPath,
      concatListPath: input.cleanEdit.concatListPath,
      approvedClipCount: input.cleanEdit.approvedClipCount,
      skippedClipCount: input.cleanEdit.skippedClipCount,
      approvedClipIds: input.cleanEdit.approvedClipIds,
    },
  };

  await ensureDir(path.dirname(input.metadataPath));
  await fs.writeFile(input.metadataPath, JSON.stringify(next, null, 2), "utf8");

  return next;
}

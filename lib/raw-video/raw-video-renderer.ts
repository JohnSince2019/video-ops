import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {promises as fs} from "node:fs";
import path from "node:path";

import {buildJobOutputUrl} from "../assets/job-assets.js";
import {probeSourceVideo} from "./source-video-probe.js";
import type {TranscriptAnalysis} from "./transcript-analyzer.js";
import {buildCleanKnowledgeTalkRemotionProps} from "./remotion-props.js";
import {
  assertValidCleanKnowledgeTalkProps,
  normalizeCleanKnowledgeTalkProps,
} from "../../remotion/src/clean-knowledge-talk-schema.js";

const execFileAsync = promisify(execFile);
const EXEC_OPTIONS = {maxBuffer: 30 * 1024 * 1024};

export type RawVideoRenderResult = {
  jobId: string;
  outputPath: string;
  outputUrl: string;
  propsPath: string;
  metadataPath?: string;
  compositionId: "CleanKnowledgeTalk";
  probe: {
    durationSec: number;
    resolution: string | null;
    hasAudio: boolean;
    hasVideo: boolean;
    streamTypes: string[];
  };
};

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, {recursive: true});
}

export async function renderRawVideoWithRemotion(input: {
  workspaceRoot: string;
  jobId: string;
  title: string;
  transcriptAnalysis: TranscriptAnalysis;
  remotionRoot?: string;
  outputPath: string;
  propsPath: string;
  metadataPath?: string;
  speaker?: string;
  cta?: string;
  accentColor?: string;
  waveformStyle?: "calm" | "focused" | "energetic";
  runner?: (
    file: string,
    args: string[],
    options?: {cwd?: string; maxBuffer?: number},
  ) => Promise<{stdout: string; stderr?: string}>;
}) {
  const run =
    input.runner ??
    ((file, args, options) =>
      execFileAsync(file, args, {
        cwd: options?.cwd,
        maxBuffer: options?.maxBuffer ?? EXEC_OPTIONS.maxBuffer,
      }));
  const remotionRoot = input.remotionRoot ?? path.join(input.workspaceRoot, "remotion");
  const remotionBinary = path.join(
    remotionRoot,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "remotion.cmd" : "remotion",
  );
  const absolutePropsPath = path.join(input.workspaceRoot, input.propsPath);
  const absoluteOutputPath = path.join(input.workspaceRoot, input.outputPath);
  const absoluteMetadataPath = input.metadataPath ? path.join(input.workspaceRoot, input.metadataPath) : null;

  await ensureDir(path.dirname(absolutePropsPath));
  await ensureDir(path.dirname(absoluteOutputPath));
  if (absoluteMetadataPath) {
    await ensureDir(path.dirname(absoluteMetadataPath));
  }

  const remotionProps = normalizeCleanKnowledgeTalkProps(
    buildCleanKnowledgeTalkRemotionProps({
      title: input.title,
      analysis: input.transcriptAnalysis,
      speaker: input.speaker,
      cta: input.cta,
      accentColor: input.accentColor,
      waveformStyle: input.waveformStyle,
    }),
  );
  assertValidCleanKnowledgeTalkProps(remotionProps);

  await fs.writeFile(absolutePropsPath, JSON.stringify(remotionProps, null, 2), "utf8");

  await run(
    remotionBinary,
    [
      "render",
      "src/index.ts",
      "CleanKnowledgeTalk",
      absoluteOutputPath,
      `--props=${absolutePropsPath}`,
    ],
    {
      cwd: remotionRoot,
      maxBuffer: EXEC_OPTIONS.maxBuffer,
    },
  );

  const probe = await probeSourceVideo(absoluteOutputPath);
  const result = {
    jobId: input.jobId,
    outputPath: input.outputPath,
    outputUrl: buildJobOutputUrl(input.outputPath),
    propsPath: input.propsPath,
    metadataPath: input.metadataPath,
    compositionId: "CleanKnowledgeTalk" as const,
    probe: {
      durationSec: probe.durationSec,
      resolution: probe.resolution,
      hasAudio: probe.hasAudio,
      hasVideo: probe.hasVideo,
      streamTypes: probe.streamTypes,
    },
  } satisfies RawVideoRenderResult;

  if (absoluteMetadataPath) {
    await fs.writeFile(
      absoluteMetadataPath,
      JSON.stringify(
        {
          jobId: input.jobId,
          compositionId: result.compositionId,
          outputPath: result.outputPath,
          propsPath: result.propsPath,
          probe: result.probe,
        },
        null,
        2,
      ),
      "utf8",
    );
  }

  return result;
}

import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const EXEC_OPTIONS = { maxBuffer: 20 * 1024 * 1024 };

export type LoudnessTarget = {
  integratedLufs: number;
  loudnessRange: number;
  truePeakDb: number;
};

export type LoudnessReport = {
  inputIntegratedLufs: number | null;
  inputLoudnessRange: number | null;
  inputTruePeakDb: number | null;
  inputThresholdDb: number | null;
  outputIntegratedLufs: number | null;
  outputLoudnessRange: number | null;
  outputTruePeakDb: number | null;
  outputThresholdDb: number | null;
  normalizationType: string | null;
  targetOffset: number | null;
  target: LoudnessTarget;
};

export type CleanEditAudioNormalizationResult = {
  version: "raw-video-clean-edit-audio-v1";
  inputPath: string;
  outputPath: string;
  outputUrl: string;
  reportPath?: string;
  target: LoudnessTarget;
  report: LoudnessReport;
};

function buildOutputUrl(relativePath: string) {
  return `/${relativePath.replace(/^\/+/, "")}`;
}

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

function extractLastJsonObject(text: string) {
  const trimmed = text.trim();
  const start = trimmed.lastIndexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end < start) {
    throw new Error("Unable to locate loudnorm JSON payload.");
  }

  return trimmed.slice(start, end + 1);
}

function parseNullableNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized || normalized === "inf" || normalized === "-inf" || normalized === "nan") {
      return null;
    }
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : null;
  }

  return null;
}

function parseLoudnormJson(payload: string, target: LoudnessTarget): LoudnessReport {
  const parsed = JSON.parse(extractLastJsonObject(payload)) as Record<string, unknown>;

  return {
    inputIntegratedLufs: parseNullableNumber(parsed.input_i),
    inputLoudnessRange: parseNullableNumber(parsed.input_lra),
    inputTruePeakDb: parseNullableNumber(parsed.input_tp),
    inputThresholdDb: parseNullableNumber(parsed.input_thresh),
    outputIntegratedLufs: parseNullableNumber(parsed.output_i),
    outputLoudnessRange: parseNullableNumber(parsed.output_lra),
    outputTruePeakDb: parseNullableNumber(parsed.output_tp),
    outputThresholdDb: parseNullableNumber(parsed.output_thresh),
    normalizationType: typeof parsed.normalization_type === "string" ? parsed.normalization_type : null,
    targetOffset: parseNullableNumber(parsed.target_offset),
    target,
  };
}

export async function normalizeCleanEditAudio(input: {
  workspaceRoot: string;
  inputPath: string;
  outputPath: string;
  reportPath?: string;
  target?: Partial<LoudnessTarget>;
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
  const target: LoudnessTarget = {
    integratedLufs: input.target?.integratedLufs ?? -16,
    loudnessRange: input.target?.loudnessRange ?? 11,
    truePeakDb: input.target?.truePeakDb ?? -1.5,
  };
  const absoluteInputPath = path.join(input.workspaceRoot, input.inputPath);
  const absoluteOutputPath = path.join(input.workspaceRoot, input.outputPath);
  const absoluteReportPath = input.reportPath ? path.join(input.workspaceRoot, input.reportPath) : null;
  const loudnormFilter = `loudnorm=I=${target.integratedLufs}:LRA=${target.loudnessRange}:TP=${target.truePeakDb}:print_format=json`;

  await ensureDir(path.dirname(absoluteOutputPath));
  if (absoluteReportPath) {
    await ensureDir(path.dirname(absoluteReportPath));
  }

  const { stdout, stderr } = await run(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "info",
      "-y",
      "-i",
      absoluteInputPath,
      "-c:v",
      "copy",
      "-af",
      loudnormFilter,
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      absoluteOutputPath,
      "-f",
      "null",
      "-",
    ],
      EXEC_OPTIONS,
  );

  const report = parseLoudnormJson([stdout, stderr].filter(Boolean).join("\n"), target);
  if (absoluteReportPath) {
    await fs.writeFile(absoluteReportPath, JSON.stringify(report, null, 2), "utf8");
  }

  return {
    version: "raw-video-clean-edit-audio-v1",
    inputPath: input.inputPath,
    outputPath: input.outputPath,
    outputUrl: buildOutputUrl(input.outputPath),
    reportPath: input.reportPath,
    target,
    report,
  } satisfies CleanEditAudioNormalizationResult;
}

export async function attachCleanEditAudioNormalizationToSourceMetadata(input: {
  metadataPath: string;
  normalizedAudio: CleanEditAudioNormalizationResult;
}) {
  const raw = await fs.readFile(input.metadataPath, "utf8");
  const metadata = JSON.parse(raw);
  const next = {
    ...metadata,
    cleanEditAudioNormalization: {
      outputPath: input.normalizedAudio.outputPath,
      reportPath: input.normalizedAudio.reportPath,
      target: input.normalizedAudio.target,
      measured: {
        outputIntegratedLufs: input.normalizedAudio.report.outputIntegratedLufs,
        outputLoudnessRange: input.normalizedAudio.report.outputLoudnessRange,
        outputTruePeakDb: input.normalizedAudio.report.outputTruePeakDb,
        targetOffset: input.normalizedAudio.report.targetOffset,
      },
    },
  };

  await ensureDir(path.dirname(input.metadataPath));
  await fs.writeFile(input.metadataPath, JSON.stringify(next, null, 2), "utf8");

  return next;
}

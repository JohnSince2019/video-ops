import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const EXEC_OPTIONS = { maxBuffer: 10 * 1024 * 1024 };

export type SourceVideoProbe = {
  durationSec: number;
  width: number | null;
  height: number | null;
  resolution: string | null;
  fps: number | null;
  hasAudio: boolean;
  hasVideo: boolean;
  streamTypes: string[];
  videoCodec: string | null;
  audioCodec: string | null;
};

function parseFps(rate?: string) {
  if (!rate || !rate.includes("/")) {
    const numeric = Number(rate);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  }

  const [numeratorRaw, denominatorRaw] = rate.split("/");
  const numerator = Number(numeratorRaw);
  const denominator = Number(denominatorRaw);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }

  return Number((numerator / denominator).toFixed(3));
}

export async function probeSourceVideo(videoPath: string): Promise<SourceVideoProbe> {
  const { stdout } = await execFileAsync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration:stream=codec_type,codec_name,width,height,r_frame_rate",
      "-of",
      "json",
      videoPath,
    ],
    EXEC_OPTIONS,
  );

  const parsed = JSON.parse(stdout);
  const streams = Array.isArray(parsed.streams) ? parsed.streams : [];
  const videoStream = streams.find((item: { codec_type?: string }) => item.codec_type === "video") as
    | { width?: number; height?: number; codec_name?: string; r_frame_rate?: string }
    | undefined;
  const audioStream = streams.find((item: { codec_type?: string }) => item.codec_type === "audio") as
    | { codec_name?: string }
    | undefined;

  const width = Number(videoStream?.width ?? 0) || null;
  const height = Number(videoStream?.height ?? 0) || null;

  return {
    durationSec: Number(parsed.format?.duration ?? 0),
    width,
    height,
    resolution: width && height ? `${width}x${height}` : null,
    fps: parseFps(videoStream?.r_frame_rate),
    hasAudio: Boolean(audioStream),
    hasVideo: Boolean(videoStream),
    streamTypes: streams
      .map((item: { codec_type?: string }) => item.codec_type)
      .filter((value: unknown): value is string => typeof value === "string" && value.length > 0),
    videoCodec: videoStream?.codec_name ?? null,
    audioCodec: audioStream?.codec_name ?? null,
  };
}

async function ensureParentDirectory(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

export async function attachProbeToSourceMetadata(metadataPath: string, probe: SourceVideoProbe) {
  const raw = await fs.readFile(metadataPath, "utf8");
  const metadata = JSON.parse(raw);
  const next = {
    ...metadata,
    probe,
  };

  await ensureParentDirectory(metadataPath);
  await fs.writeFile(metadataPath, JSON.stringify(next, null, 2), "utf8");

  return next;
}

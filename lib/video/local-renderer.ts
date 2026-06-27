import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { buildJobAssetPaths } from "../assets/job-assets.js";
import type { ProviderExecutionMetadata } from "../providers/provider-types.js";
import type { ContentManifest } from "../types/manifest.js";
import { buildPlatformMetadata } from "./platform-metadata.js";
import { buildOutputPackage } from "./output-package.js";
import { buildRenderPlan, type RenderPlan } from "./render-plan.js";
import { assembleVideoTimeline, type VideoTimeline } from "./video-assembler.js";

const execFileAsync = promisify(execFile);
const EXEC_OPTIONS = { maxBuffer: 10 * 1024 * 1024 };

const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn8Y6QAAAAASUVORK5CYII=",
  "base64",
);

export type RendererMode = "ffmpeg" | "mock" | "auto";

export type RenderJobArtifactsResult = {
  timeline: VideoTimeline;
  renderPlan: RenderPlan;
  outputPackage: ReturnType<typeof buildOutputPackage>;
  providerMetadata: ProviderExecutionMetadata;
  previewUrl: string;
  probe?: {
    durationSec: number;
    streamTypes: string[];
  };
};

function sanitizeFileSegment(value: string, fallback: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "") || fallback;
}

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

function buildWavTone(durationMs: number, frequency = 440) {
  const sampleRate = 16000;
  const channels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const durationSec = Math.max(0.5, durationMs / 1000);
  const frameCount = Math.floor(sampleRate * durationSec);
  const dataSize = frameCount * channels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  buffer.writeUInt16LE(channels * bytesPerSample, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < frameCount; i += 1) {
    const amplitude = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 0.15;
    const sample = Math.max(-1, Math.min(1, amplitude));
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
  }

  return buffer;
}

function buildPpmImage(width: number, height: number, rgb: [number, number, number]) {
  const header = `P6\n${width} ${height}\n255\n`;
  const pixels = Buffer.alloc(width * height * 3);
  for (let offset = 0; offset < pixels.length; offset += 3) {
    pixels[offset] = rgb[0];
    pixels[offset + 1] = rgb[1];
    pixels[offset + 2] = rgb[2];
  }
  return Buffer.concat([Buffer.from(header, "ascii"), pixels]);
}

async function buildSceneAssets(manifest: ContentManifest, outputPaths: ReturnType<typeof buildJobAssetPaths>) {
  await Promise.all([
    ensureDir(outputPaths.rootDir),
    ensureDir(outputPaths.imagesDir),
    ensureDir(outputPaths.audioDir),
    ensureDir(outputPaths.tempDir),
  ]);

  const mainImages = [];
  const audios = [];

  for (const [index, scene] of manifest.scenes.entries()) {
    const basename = sanitizeFileSegment(scene.id, `scene-${index + 1}`);
    const imagePath = path.join(outputPaths.imagesDir, `${basename}.ppm`);
    const audioPath = path.join(outputPaths.audioDir, `${basename}.wav`);

    await fs.writeFile(imagePath, buildPpmImage(1080, 1920, [240 - index * 20, 226 - index * 10, 210]));
    await fs.writeFile(audioPath, buildWavTone(scene.duration_ms, 320 + index * 40));

    mainImages.push({
      sceneId: scene.id,
      sceneHash: scene.scene_hash,
      promptHash: scene.prompt_hash,
      model: "local-placeholder-image",
      prompt: scene.visual_hint ?? scene.narration,
      size: "1x1",
      quality: "standard" as const,
      responseFormat: "url" as const,
      artifacts: [
        {
          index: 0,
          url: imagePath,
          artifactKey: `${scene.scene_hash}:${scene.prompt_hash}:0`,
        },
      ],
    });

    audios.push({
      sceneId: scene.id,
      sceneHash: scene.scene_hash,
      model: "local-tone-audio",
      voice: scene.audio.tts_voice,
      text: scene.narration,
      audioPath,
      durationMs: scene.duration_ms,
      format: "wav" as const,
      cloneMode: "standard" as const,
    });
  }

  return { mainImages, audios };
}

async function renderSegmentsWithFfmpeg(plan: RenderPlan, tempDir: string) {
  const segmentPaths: string[] = [];

  for (const [index, clip] of plan.clips.entries()) {
    const segmentPath = path.join(tempDir, `segment-${String(index + 1).padStart(3, "0")}.mp4`);
    await execFileAsync("ffmpeg", [
      "-loglevel",
      "error",
      "-y",
      "-loop",
      "1",
      "-framerate",
      "25",
      "-i",
      clip.imageInput,
      "-i",
      clip.audioInput,
      "-t",
      (clip.durationMs / 1000).toFixed(3),
      "-vf",
      `scale=${plan.spec.width}:${plan.spec.height}:force_original_aspect_ratio=decrease,pad=${plan.spec.width}:${plan.spec.height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`,
      "-c:v",
      "libx264",
      "-preset",
      plan.spec.preset,
      "-crf",
      String(plan.spec.crf),
      "-c:a",
      "aac",
      "-b:a",
      `${plan.spec.audioBitrateKbps}k`,
      "-pix_fmt",
      "yuv420p",
      "-shortest",
      segmentPath,
    ], EXEC_OPTIONS);
    segmentPaths.push(segmentPath);
  }

  const concatFilePath = path.join(tempDir, "concat.txt");
  await fs.writeFile(
    concatFilePath,
    segmentPaths
      .map((segmentPath) => `file '${path.resolve(segmentPath).replace(/'/g, "'\\''")}'`)
      .join("\n"),
  );

  await execFileAsync("ffmpeg", [
    "-loglevel",
    "error",
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatFilePath,
    "-c:v",
    "libx264",
    "-preset",
    plan.spec.preset,
    "-crf",
    String(plan.spec.crf),
    "-c:a",
    "aac",
    "-b:a",
    `${plan.spec.audioBitrateKbps}k`,
    "-movflags",
    "+faststart",
    plan.outputPath,
  ], EXEC_OPTIONS);
}

async function probeVideo(videoPath: string) {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration:stream=codec_type",
    "-of",
    "json",
    videoPath,
  ], EXEC_OPTIONS);

  const parsed = JSON.parse(stdout);
  return {
    durationSec: Number(parsed.format?.duration ?? 0),
    streamTypes: Array.isArray(parsed.streams)
      ? parsed.streams.map((item: { codec_type?: string }) => item.codec_type).filter(Boolean)
      : [],
  };
}

async function buildMockArtifacts(plan: RenderPlan, outputPaths: ReturnType<typeof buildJobAssetPaths>) {
  await fs.writeFile(plan.outputPath, "mock-mp4-placeholder");
  await fs.copyFile(plan.clips[0]?.imageInput ?? outputPaths.coverPath, outputPaths.coverPath).catch(async () => {
    await fs.writeFile(outputPaths.coverPath, ONE_PIXEL_PNG);
  });
}

function resolveRendererMode(mode?: RendererMode) {
  if (mode && mode !== "auto") {
    return mode;
  }

  if (process.env.CI === "true") {
    return "mock";
  }

  return "ffmpeg";
}

export async function renderJobArtifacts(input: {
  jobId: string;
  manifest: ContentManifest;
  mode?: RendererMode;
}) {
  const outputPaths = buildJobAssetPaths(input.jobId);
  const { mainImages, audios } = await buildSceneAssets(input.manifest, outputPaths);
  const timeline = assembleVideoTimeline({
    scenes: input.manifest.scenes.map((scene) => ({ id: scene.id, scene_hash: scene.scene_hash })),
    mainImages,
    audios,
    transitionType: "crossfade",
    transitionDurationMs: 300,
  });
  const renderPlan = buildRenderPlan({
    timeline,
    profile: input.manifest.renderProfile,
    outputPath: outputPaths.videoPath,
  });
  const platformMetadata = buildPlatformMetadata({
    manifest: input.manifest,
    timeline,
  });

  let providerMetadata: ProviderExecutionMetadata = {
    stage: "render",
    provider: "ffmpeg-local",
    mode: "primary",
  };
  let probe: RenderJobArtifactsResult["probe"];

  const requestedMode = input.mode ?? (process.env.VIDEO_OPS_RENDERER_MODE as RendererMode | undefined);
  const resolvedMode = resolveRendererMode(requestedMode);

  try {
    if (resolvedMode === "mock") {
      await buildMockArtifacts(renderPlan, outputPaths);
      providerMetadata = {
        stage: "render",
        provider: "mock-renderer",
        mode: "primary",
      };
    } else {
      await renderSegmentsWithFfmpeg(renderPlan, outputPaths.tempDir);
      await fs.copyFile(renderPlan.clips[0]!.imageInput, outputPaths.coverPath);
      probe = await probeVideo(renderPlan.outputPath);
    }
  } catch (error) {
    if (requestedMode !== "auto" && requestedMode !== undefined) {
      throw error;
    }

    await buildMockArtifacts(renderPlan, outputPaths);
    providerMetadata = {
      stage: "render",
      provider: "mock-renderer",
      mode: "fallback",
      originalProvider: "ffmpeg-local",
      fallbackReason: error instanceof Error ? error.message : "ffmpeg render failed",
    };
  }

  const outputPackage = buildOutputPackage({
    renderPlan,
    platformMetadata,
    videoPath: renderPlan.outputPath,
    coverPath: outputPaths.coverPath,
    metadataPath: outputPaths.metadataPath,
    providerMetadata: {
      render: providerMetadata,
    },
  });

  await fs.writeFile(outputPackage.metadataFile.path, outputPackage.metadataFile.content);

  return {
    timeline,
    renderPlan,
    outputPackage,
    providerMetadata,
    previewUrl: outputPackage.video.url,
    probe,
  } satisfies RenderJobArtifactsResult;
}

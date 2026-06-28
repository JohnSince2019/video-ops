import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  type GenerateTtsResult,
  generateClonedSpeechForScene,
  generateSpeechForScene,
  type TtsRunner,
} from "../audio/cosyvoice-client.js";
import { createUnavailableMlxRunner, detectMlxAudioAvailability } from "../audio/local-tts-runner.js";
import { buildJobAssetPaths } from "../assets/job-assets.js";
import type { ProviderExecutionMetadata } from "../providers/provider-types.js";
import type { ContentManifest } from "../types/manifest.js";
import { buildPlatformMetadata } from "./platform-metadata.js";
import { buildOutputPackage } from "./output-package.js";
import { buildRenderPlan, type RenderPlan } from "./render-plan.js";
import { buildSubtitleArtifacts } from "./subtitle-artifacts.js";
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

function buildCloneAwareTone(durationMs: number, referenceAudioPath?: string, fallbackFrequency = 440) {
  if (!referenceAudioPath) {
    return buildWavTone(durationMs, fallbackFrequency);
  }

  const hashSeed = Array.from(referenceAudioPath).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const tunedFrequency = 220 + (hashSeed % 180);
  return buildWavTone(durationMs, tunedFrequency);
}

const localToneTtsRunner: TtsRunner = async (request) => {
  const outputDir = path.dirname(request.outputPath);
  await fs.mkdir(outputDir, { recursive: true });
  const tone = buildCloneAwareTone(
    Math.max(1500, request.text.replace(/\s+/g, "").length * 180),
    request.referenceAudioPath,
    320,
  );
  await fs.writeFile(request.outputPath, tone);

  return {
    success: true,
    audioPath: request.outputPath,
    durationMs: Math.max(1500, request.text.replace(/\s+/g, "").length * 180),
  };
};

async function createSceneAudioAsset(input: {
  scene: ContentManifest["scenes"][number];
  outputDir: string;
  preferredRunner?: TtsRunner;
}) {
  const sceneInput = {
    scene: input.scene,
    outputDir: input.outputDir,
    referenceAudioPath: input.scene.audio.reference_audio_path,
  };

  const hasMlxAudio = await detectMlxAudioAvailability();
  const preferredRunner = input.preferredRunner ?? (hasMlxAudio ? createUnavailableMlxRunner() : undefined);
  let generated: GenerateTtsResult;
  let providerLabel = "local-tone-runner";
  let providerMode = "fallback";

  try {
    if (input.scene.audio.reference_audio_path) {
      generated = await generateClonedSpeechForScene(sceneInput, { runner: preferredRunner ?? localToneTtsRunner });
    } else {
      generated = await generateSpeechForScene(sceneInput, { runner: preferredRunner ?? localToneTtsRunner });
    }
    providerLabel = preferredRunner ? "mlx-audio-runner" : "local-tone-runner";
    providerMode = preferredRunner ? "primary" : "fallback";
  } catch {
    if (input.scene.audio.reference_audio_path) {
      generated = await generateClonedSpeechForScene(sceneInput, { runner: localToneTtsRunner });
    } else {
      generated = await generateSpeechForScene(sceneInput, { runner: localToneTtsRunner });
    }
    providerLabel = "local-tone-runner";
    providerMode = "fallback";
  }

  return {
    generated,
    providerLabel,
    providerMode,
  };
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
    ensureDir(outputPaths.subtitlesDir),
    ensureDir(outputPaths.tempDir),
  ]);

  const mainImages = [];
  const audios = [];

  for (const [index, scene] of manifest.scenes.entries()) {
    const basename = sanitizeFileSegment(scene.id, `scene-${index + 1}`);
    const imagePath = path.join(outputPaths.imagesDir, `${basename}.ppm`);

    await fs.writeFile(imagePath, buildPpmImage(1080, 1920, [240 - index * 20, 226 - index * 10, 210]));

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

    const { generated, providerLabel, providerMode } = await createSceneAudioAsset({
      scene,
      outputDir: outputPaths.audioDir,
    });

    audios.push({
      ...generated,
      model: providerLabel,
      durationMs: scene.duration_ms,
      providerMetadata: {
        stage: "tts" as const,
        provider: providerLabel,
        mode: providerMode as "primary" | "fallback",
      },
    });
  }

  return { mainImages, audios };
}

async function buildSubtitleFiles(manifest: ContentManifest, outputPaths: ReturnType<typeof buildJobAssetPaths>) {
  const artifacts = buildSubtitleArtifacts(manifest);
  const srtPath = path.join(outputPaths.subtitlesDir, "captions.srt");
  const vttPath = path.join(outputPaths.subtitlesDir, "captions.vtt");

  await fs.writeFile(srtPath, artifacts.srt, "utf8");
  await fs.writeFile(vttPath, artifacts.vtt, "utf8");

  return [
    { format: "srt" as const, path: srtPath },
    { format: "vtt" as const, path: vttPath },
  ];
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
  const subtitleFiles = await buildSubtitleFiles(input.manifest, outputPaths);
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
    subtitles: subtitleFiles,
    providerMetadata: {
      render: providerMetadata,
    },
    ttsRouteSummary: {
      providerId: input.manifest.metadata.tts_provider_id,
      routeLabel: input.manifest.metadata.tts_route_label,
      routeRoleLabel:
        input.manifest.metadata.tts_route_label === "自定义声音克隆路线"
          ? "自定义声音保真路线"
          : input.manifest.metadata.tts_provider_id === "f5-tts"
            ? "高拟真正式产线"
            : input.manifest.metadata.tts_provider_id === "melotts"
              ? "低成本兜底路线"
              : "第一阶段默认主链路",
      acceptanceHint:
        input.manifest.metadata.tts_route_label === "自定义声音克隆路线"
          ? "先确认参考音频是否足够稳定，再重点验收音色一致性和辨识度。"
          : input.manifest.metadata.tts_provider_id === "f5-tts"
            ? "更适合听最终产物效果，不以页面即时试听作为主要验收方式。"
            : input.manifest.metadata.tts_provider_id === "melotts"
              ? "重点验收节奏和可用性，不把它当作高拟真最终音色标准。"
              : "可以先在工作台即时试听，再结合最终产物确认自然度和清晰度。",
      voiceLabel: input.manifest.scenes[0]?.audio.tts_voice,
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

import assert from "node:assert/strict";
import test from "node:test";

import { createProviderRegistry } from "../lib/providers/provider-registry.js";
import type {
  ImageProvider,
  RendererProvider,
  TtsProvider,
} from "../lib/providers/provider-types.js";

const imageProvider: ImageProvider = {
  id: "gpt-image-2",
  displayName: "GPT Image 2",
  async generate() {
    return { ok: true };
  },
};

const ttsProvider: TtsProvider = {
  id: "cosyvoice-mlx",
  displayName: "CosyVoice MLX",
  qualityTier: "production",
  supportsVoiceCloning: true,
  supportsStreamingPreview: true,
  async synthesize() {
    return { ok: true };
  },
};

const rendererProvider: RendererProvider = {
  id: "ffmpeg-local",
  displayName: "FFmpeg Local",
  async render() {
    return { ok: true };
  },
};

test("provider registry resolves default providers and lists them", () => {
  const registry = createProviderRegistry({
    imageProviders: [imageProvider],
    ttsProviders: [ttsProvider],
    rendererProviders: [rendererProvider],
    imageProviderId: "gpt-image-2",
    ttsProviderId: "cosyvoice-mlx",
    rendererProviderId: "ffmpeg-local",
  });

  assert.equal(registry.getImageProvider().id, "gpt-image-2");
  assert.equal(registry.getTtsProvider().id, "cosyvoice-mlx");
  assert.equal(registry.getTtsProvider().qualityTier, "production");
  assert.equal(registry.getTtsProvider().supportsVoiceCloning, true);
  assert.equal(registry.getRendererProvider().id, "ffmpeg-local");
  assert.equal(registry.listImageProviders().length, 1);
  assert.equal(registry.listTtsProviders().length, 1);
  assert.equal(registry.listRendererProviders().length, 1);
});

test("provider registry throws explicit errors for unknown or missing providers", () => {
  const registry = createProviderRegistry({
    imageProviders: [imageProvider],
  });

  assert.throws(() => registry.getImageProvider("missing-provider"), /Unknown image provider/);
  assert.throws(() => registry.getTtsProvider(), /No tts providers are registered/);
  assert.throws(() => registry.getRendererProvider(), /No render providers are registered/);
});

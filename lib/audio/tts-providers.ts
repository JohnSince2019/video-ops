import type { TtsProvider } from "../providers/provider-types.js";

export const TTS_PROVIDER_IDS = [
  "cosyvoice-mlx",
  "f5-tts",
  "melotts",
] as const;

export type TtsProviderId = (typeof TTS_PROVIDER_IDS)[number];

const PLACEHOLDER_SYNTHESIZE = async () => ({ ok: true });

const TTS_PROVIDERS: Record<TtsProviderId, TtsProvider> = {
  "cosyvoice-mlx": {
    id: "cosyvoice-mlx",
    displayName: "CosyVoice MLX",
    qualityTier: "production",
    supportsVoiceCloning: true,
    supportsStreamingPreview: true,
    synthesize: PLACEHOLDER_SYNTHESIZE,
  },
  "f5-tts": {
    id: "f5-tts",
    displayName: "F5-TTS",
    qualityTier: "premium",
    supportsVoiceCloning: true,
    supportsStreamingPreview: false,
    synthesize: PLACEHOLDER_SYNTHESIZE,
  },
  melotts: {
    id: "melotts",
    displayName: "MeloTTS",
    qualityTier: "baseline",
    supportsVoiceCloning: false,
    supportsStreamingPreview: false,
    synthesize: PLACEHOLDER_SYNTHESIZE,
  },
};

export function listTtsProviders() {
  return TTS_PROVIDER_IDS.map((id) => TTS_PROVIDERS[id]);
}

export function getTtsProviderById(id: string) {
  const provider = TTS_PROVIDERS[id as TtsProviderId];
  if (!provider) {
    throw new Error(`Unknown tts provider "${id}".`);
  }
  return provider;
}

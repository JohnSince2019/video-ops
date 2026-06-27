import type { TtsProvider } from "../providers/provider-types.js";

export const TTS_PROVIDER_IDS = [
  "cosyvoice-mlx",
  "f5-tts",
  "melotts",
] as const;

export type TtsProviderId = (typeof TTS_PROVIDER_IDS)[number];

export type TtsProviderProfile = {
  id: TtsProviderId;
  displayName: string;
  qualityTier: NonNullable<TtsProvider["qualityTier"]>;
  supportsVoiceCloning: boolean;
  supportsStreamingPreview: boolean;
  deploymentMode: "local_only" | "cloud_ready" | "hybrid";
  naturalnessLabel: string;
  notes: string;
};

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

const TTS_PROVIDER_PROFILES: Record<TtsProviderId, TtsProviderProfile> = {
  "cosyvoice-mlx": {
    id: "cosyvoice-mlx",
    displayName: "CosyVoice MLX",
    qualityTier: "production",
    supportsVoiceCloning: true,
    supportsStreamingPreview: true,
    deploymentMode: "hybrid",
    naturalnessLabel: "自然度高，适合中文解说与零样本音色克隆",
    notes: "本地 Mac 开发体验最好，也适合作为云端异步 TTS worker。",
  },
  "f5-tts": {
    id: "f5-tts",
    displayName: "F5-TTS",
    qualityTier: "premium",
    supportsVoiceCloning: true,
    supportsStreamingPreview: false,
    deploymentMode: "cloud_ready",
    naturalnessLabel: "表现上限高，适合追求更强拟真度的生产链路",
    notes: "更适合独立 GPU/容器部署，适合后续 SaaS 化重度生产。",
  },
  melotts: {
    id: "melotts",
    displayName: "MeloTTS",
    qualityTier: "baseline",
    supportsVoiceCloning: false,
    supportsStreamingPreview: false,
    deploymentMode: "cloud_ready",
    naturalnessLabel: "稳定轻量，适合低成本批量生成与兜底",
    notes: "可以作为低成本 fallback，但拟真度不如 CosyVoice / F5-TTS。",
  },
};

export function getTtsProviderProfile(id: string) {
  const profile = TTS_PROVIDER_PROFILES[id as TtsProviderId];
  if (!profile) {
    throw new Error(`Unknown tts provider profile "${id}".`);
  }
  return profile;
}

export function listTtsProviderProfiles() {
  return TTS_PROVIDER_IDS.map((id) => TTS_PROVIDER_PROFILES[id]);
}

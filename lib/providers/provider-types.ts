export type ProviderStage = "image" | "tts" | "render" | "analysis";

export type ProviderExecutionMode = "primary" | "fallback";

export type ProviderExecutionMetadata = {
  stage: ProviderStage;
  provider: string;
  mode: ProviderExecutionMode;
  originalProvider?: string;
  fallbackReason?: string;
};

export type ImageProvider = {
  id: string;
  displayName: string;
  generate(...args: unknown[]): Promise<unknown>;
};

export type TtsProvider = {
  id: string;
  displayName: string;
  qualityTier?: "baseline" | "production" | "premium";
  supportsVoiceCloning?: boolean;
  supportsStreamingPreview?: boolean;
  synthesize(...args: unknown[]): Promise<unknown>;
};

export type RendererProvider = {
  id: string;
  displayName: string;
  render(...args: unknown[]): Promise<unknown>;
};

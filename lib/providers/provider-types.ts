export type ProviderStage = "image" | "tts" | "render";

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
  synthesize(...args: unknown[]): Promise<unknown>;
};

export type RendererProvider = {
  id: string;
  displayName: string;
  render(...args: unknown[]): Promise<unknown>;
};

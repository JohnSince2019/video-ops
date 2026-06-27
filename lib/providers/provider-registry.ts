import type {
  ImageProvider,
  ProviderStage,
  RendererProvider,
  TtsProvider,
} from "./provider-types.js";

type ProviderDefaults = {
  imageProviderId?: string;
  ttsProviderId?: string;
  rendererProviderId?: string;
};

export type ProviderRegistryInput = ProviderDefaults & {
  imageProviders?: ImageProvider[];
  ttsProviders?: TtsProvider[];
  rendererProviders?: RendererProvider[];
};

export type ProviderRegistry = ReturnType<typeof createProviderRegistry>;

function buildProviderMap<T extends { id: string }>(providers: T[]) {
  return new Map(providers.map((provider) => [provider.id, provider]));
}

function resolveProvider<T extends { id: string }>(
  stage: ProviderStage,
  providers: Map<string, T>,
  providerId?: string,
) {
  const resolvedId = providerId ?? providers.keys().next().value;
  if (!resolvedId) {
    throw new Error(`No ${stage} providers are registered.`);
  }

  const provider = providers.get(resolvedId);
  if (!provider) {
    throw new Error(`Unknown ${stage} provider "${resolvedId}".`);
  }

  return provider;
}

export function createProviderRegistry(input: ProviderRegistryInput = {}) {
  const imageProviders = buildProviderMap(input.imageProviders ?? []);
  const ttsProviders = buildProviderMap(input.ttsProviders ?? []);
  const rendererProviders = buildProviderMap(input.rendererProviders ?? []);

  return {
    getImageProvider(providerId = input.imageProviderId) {
      return resolveProvider("image", imageProviders, providerId);
    },
    getTtsProvider(providerId = input.ttsProviderId) {
      return resolveProvider("tts", ttsProviders, providerId);
    },
    getRendererProvider(providerId = input.rendererProviderId) {
      return resolveProvider("render", rendererProviders, providerId);
    },
    listImageProviders() {
      return [...imageProviders.values()];
    },
    listTtsProviders() {
      return [...ttsProviders.values()];
    },
    listRendererProviders() {
      return [...rendererProviders.values()];
    },
  };
}

import type { ContentScene } from "../types/manifest.js";

export type ImageGenerationSceneInput = Pick<
  ContentScene,
  | "id"
  | "scene_hash"
  | "prompt_hash"
  | "narration"
  | "visual_hint"
  | "script_type"
  | "mood"
>;

export type GenerateImageInput = {
  scene: ImageGenerationSceneInput;
  model?: string;
  size?: string;
  quality?: "standard" | "hd";
  n?: number;
  responseFormat?: "url" | "b64_json";
};

export type GatewayImageData = {
  url?: string;
  b64_json?: string;
};

export type GenerateImageResult = {
  sceneId: string;
  sceneHash: string;
  promptHash: string;
  model: string;
  prompt: string;
  size: string;
  quality: "standard" | "hd";
  responseFormat: "url" | "b64_json";
  artifacts: Array<{
    index: number;
    url?: string;
    b64_json?: string;
    artifactKey: string;
  }>;
  providerMetadata?: import("../providers/provider-types.js").ProviderExecutionMetadata;
};

export type GatewayFetch = typeof fetch;

const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
const DEFAULT_MODEL = "gpt-image-2";
const DEFAULT_SIZE = "1024x1024";
const DEFAULT_QUALITY = "standard";
const DEFAULT_RESPONSE_FORMAT = "url";

export function buildImagePrompt(scene: ImageGenerationSceneInput) {
  const visualHint = scene.visual_hint?.trim() || "根据文案生成一张高信息密度、适合短视频分镜的画面";

  return [
    "Create a single storyboard frame for a short-form video.",
    `Scene ID: ${scene.id}`,
    `Narration: ${scene.narration.trim()}`,
    `Visual hint: ${visualHint}`,
    `Script type: ${scene.script_type}`,
    `Mood: ${scene.mood}`,
    `Scene hash: ${scene.scene_hash}`,
    `Prompt hash: ${scene.prompt_hash}`,
    "Requirements: cinematic composition, clear subject, no text overlay, production-ready visual.",
  ].join("\n");
}

export function buildImageRequestBody(input: GenerateImageInput) {
  const model = input.model ?? process.env.VIDEO_OPS_IMAGE_MODEL ?? DEFAULT_MODEL;
  const size = input.size ?? DEFAULT_SIZE;
  const quality = input.quality ?? DEFAULT_QUALITY;
  const n = input.n ?? 1;
  const responseFormat = input.responseFormat ?? DEFAULT_RESPONSE_FORMAT;
  const prompt = buildImagePrompt(input.scene);

  return {
    model,
    prompt,
    size,
    quality,
    n,
    response_format: responseFormat,
  };
}

function buildArtifactKey(sceneHash: string, promptHash: string, index: number) {
  return `${sceneHash}:${promptHash}:${index}`;
}

export function normalizeImageGenerationResult(
  input: GenerateImageInput,
  body: ReturnType<typeof buildImageRequestBody>,
  payload: unknown,
): GenerateImageResult {
  if (!payload || typeof payload !== "object" || !("data" in payload) || !Array.isArray(payload.data)) {
    throw new Error("Image gateway returned an invalid payload: missing data array.");
  }

  const artifacts = (payload.data as GatewayImageData[])
    .map((item, index) => ({
      index,
      url: typeof item.url === "string" ? item.url : undefined,
      b64_json: typeof item.b64_json === "string" ? item.b64_json : undefined,
      artifactKey: buildArtifactKey(input.scene.scene_hash, input.scene.prompt_hash, index),
    }))
    .filter((item) => item.url || item.b64_json);

  if (artifacts.length === 0) {
    throw new Error("Image gateway returned no usable image artifacts.");
  }

  return {
    sceneId: input.scene.id,
    sceneHash: input.scene.scene_hash,
    promptHash: input.scene.prompt_hash,
    model: body.model,
    prompt: body.prompt,
    size: body.size,
    quality: body.quality,
    responseFormat: body.response_format,
    artifacts,
  };
}

export async function generateImageForScene(
  input: GenerateImageInput,
  options: {
    baseUrl?: string;
    fetchImpl?: GatewayFetch;
  } = {},
) {
  const baseUrl = options.baseUrl ?? process.env.LLM_GATEWAY_BASE_URL ?? DEFAULT_BASE_URL;
  const fetchImpl = options.fetchImpl ?? fetch;
  const requestBody = buildImageRequestBody(input);
  const endpoint = `${baseUrl.replace(/\/$/, "")}/api/auto/images/generations`;

  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Image gateway returned a non-JSON response.");
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : `Image gateway request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return normalizeImageGenerationResult(input, requestBody, payload);
}

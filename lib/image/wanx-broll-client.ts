import {
  type GatewayFetch,
  type GenerateImageInput,
  type GenerateImageResult,
  type ImageGenerationSceneInput,
  generateImageForScene,
} from "./gpt-image-client.js";

const DEFAULT_BROLL_MODEL = "wanx-v1";

export type GenerateBrollImageInput = Omit<GenerateImageInput, "model"> & {
  shotIntent?: string;
};

export function buildBrollPrompt(
  scene: ImageGenerationSceneInput,
  shotIntent = "supporting cutaway shot",
) {
  const visualHint = scene.visual_hint?.trim() || "根据旁白生成辅助镜头";

  return [
    "Create a B-roll support shot for a short-form video.",
    `Shot intent: ${shotIntent}`,
    `Scene ID: ${scene.id}`,
    `Narration: ${scene.narration.trim()}`,
    `B-roll focus: ${visualHint}`,
    `Script type: ${scene.script_type}`,
    `Mood: ${scene.mood}`,
    `Scene hash: ${scene.scene_hash}`,
    `Prompt hash: ${scene.prompt_hash}`,
    "Requirements: cutaway angle, complementary subject matter, cinematic but secondary to the main hero frame, no text overlay.",
  ].join("\n");
}

export function buildBrollRequestBody(input: GenerateBrollImageInput) {
  const model = process.env.VIDEO_OPS_BROLL_MODEL ?? DEFAULT_BROLL_MODEL;
  const prompt = buildBrollPrompt(input.scene, input.shotIntent);

  return {
    model,
    prompt,
    size: input.size ?? "1024x1024",
    quality: input.quality ?? "standard",
    n: input.n ?? 1,
    response_format: input.responseFormat ?? "url",
  };
}

export async function generateBrollForScene(
  input: GenerateBrollImageInput,
  options: {
    baseUrl?: string;
    fetchImpl?: GatewayFetch;
  } = {},
): Promise<GenerateImageResult> {
  const body = buildBrollRequestBody(input);

  return generateImageForScene(
    {
      ...input,
      model: body.model,
      size: body.size,
      quality: body.quality,
      n: body.n,
      responseFormat: body.response_format,
      scene: {
        ...input.scene,
        visual_hint: `B-roll: ${input.scene.visual_hint?.trim() || input.scene.narration.trim()}`,
      },
    },
    {
      ...options,
      fetchImpl: async (url, init) => {
        const fetchImpl = options.fetchImpl ?? fetch;
        return fetchImpl(url, {
          ...init,
          body: JSON.stringify(body),
        });
      },
    },
  );
}

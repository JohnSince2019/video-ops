import {
  RENDER_PROFILES,
  SCENE_MOODS,
  SCRIPT_TYPES,
  SUPPORTED_PLATFORMS,
  type ContentManifest,
} from "../types/manifest.js";

export const CONTENT_MANIFEST_SCHEMA_ID =
  "https://video-ops.example.com/manifest-v1.schema.json";

export const contentManifestSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: CONTENT_MANIFEST_SCHEMA_ID,
  title: "ContentManifest",
  type: "object",
  required: [
    "$schema",
    "id",
    "title",
    "platform",
    "renderProfile",
    "scenes",
    "metadata",
  ],
  additionalProperties: false,
  properties: {
    $schema: { type: "string", const: CONTENT_MANIFEST_SCHEMA_ID },
    id: { type: "string", minLength: 1 },
    title: { type: "string", minLength: 1 },
    platform: { type: "string", enum: [...SUPPORTED_PLATFORMS] },
    renderProfile: { type: "string", enum: [...RENDER_PROFILES] },
    scenes: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: [
          "id",
          "scene_hash",
          "prompt_hash",
          "duration_ms",
          "narration",
          "script_type",
          "mood",
          "audio",
        ],
        additionalProperties: false,
        properties: {
          id: { type: "string", minLength: 1 },
          scene_hash: { type: "string", minLength: 1 },
          prompt_hash: { type: "string", minLength: 1 },
          duration_ms: { type: "integer", minimum: 1 },
          narration: { type: "string", minLength: 1 },
          script_type: { type: "string", enum: [...SCRIPT_TYPES] },
          mood: { type: "string", enum: [...SCENE_MOODS] },
          visual_hint: { type: "string", minLength: 1 },
          audio: {
            type: "object",
            required: ["tts_voice"],
            additionalProperties: false,
            properties: {
              tts_voice: { type: "string", minLength: 1 },
              bgm: { type: "string", minLength: 1 },
            },
          },
        },
      },
    },
    metadata: {
      type: "object",
      required: ["created_at", "author", "copyright_license"],
      additionalProperties: false,
      properties: {
        created_at: { type: "string", minLength: 1 },
        author: { type: "string", minLength: 1 },
        copyright_license: { type: "string", minLength: 1 },
      },
    },
  },
} as const;

export type ValidationResult<T> =
  | { valid: true; value: T }
  | { valid: false; errors: string[] };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateNonEmptyString(
  value: unknown,
  path: string,
  errors: string[],
  options: { expected?: readonly string[]; exact?: string } = {},
) {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${path} must be a non-empty string.`);
    return;
  }

  if (options.exact && value !== options.exact) {
    errors.push(`${path} must equal "${options.exact}".`);
  }

  if (options.expected && !options.expected.includes(value)) {
    errors.push(`${path} must be one of: ${options.expected.join(", ")}.`);
  }
}

function validateScene(scene: unknown, index: number, errors: string[]) {
  const path = `scenes[${index}]`;

  if (!isObject(scene)) {
    errors.push(`${path} must be an object.`);
    return;
  }

  validateNonEmptyString(scene.id, `${path}.id`, errors);
  validateNonEmptyString(scene.scene_hash, `${path}.scene_hash`, errors);
  validateNonEmptyString(scene.prompt_hash, `${path}.prompt_hash`, errors);

  if (!Number.isInteger(scene.duration_ms) || Number(scene.duration_ms) <= 0) {
    errors.push(`${path}.duration_ms must be a positive integer.`);
  }

  validateNonEmptyString(scene.narration, `${path}.narration`, errors);
  validateNonEmptyString(scene.script_type, `${path}.script_type`, errors, {
    expected: SCRIPT_TYPES,
  });
  validateNonEmptyString(scene.mood, `${path}.mood`, errors, {
    expected: SCENE_MOODS,
  });

  if (scene.visual_hint !== undefined) {
    validateNonEmptyString(scene.visual_hint, `${path}.visual_hint`, errors);
  }

  if (!isObject(scene.audio)) {
    errors.push(`${path}.audio must be an object.`);
  } else {
    validateNonEmptyString(scene.audio.tts_voice, `${path}.audio.tts_voice`, errors);
    if (scene.audio.bgm !== undefined) {
      validateNonEmptyString(scene.audio.bgm, `${path}.audio.bgm`, errors);
    }
  }
}

export function validateContentManifest(input: unknown): ValidationResult<ContentManifest> {
  const errors: string[] = [];

  if (!isObject(input)) {
    return {
      valid: false,
      errors: ["Manifest must be an object."],
    };
  }

  validateNonEmptyString(input.$schema, "$schema", errors, {
    exact: CONTENT_MANIFEST_SCHEMA_ID,
  });
  validateNonEmptyString(input.id, "id", errors);
  validateNonEmptyString(input.title, "title", errors);
  validateNonEmptyString(input.platform, "platform", errors, {
    expected: SUPPORTED_PLATFORMS,
  });
  validateNonEmptyString(input.renderProfile, "renderProfile", errors, {
    expected: RENDER_PROFILES,
  });

  if (!Array.isArray(input.scenes) || input.scenes.length === 0) {
    errors.push("scenes must be a non-empty array.");
  } else {
    input.scenes.forEach((scene, index) => validateScene(scene, index, errors));
  }

  if (!isObject(input.metadata)) {
    errors.push("metadata must be an object.");
  } else {
    validateNonEmptyString(input.metadata.created_at, "metadata.created_at", errors);
    validateNonEmptyString(input.metadata.author, "metadata.author", errors);
    validateNonEmptyString(
      input.metadata.copyright_license,
      "metadata.copyright_license",
      errors,
    );
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
    };
  }

  return {
    valid: true,
    value: input as ContentManifest,
  };
}

export function assertValidContentManifest(input: unknown) {
  const result = validateContentManifest(input);
  if (!result.valid) {
    throw new Error(`Invalid ContentManifest: ${result.errors.join(" | ")}`);
  }

  return result.value;
}

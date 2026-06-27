import crypto from "node:crypto";

import type { ContentManifest, ContentScene } from "../types/manifest.js";
import type { SceneGraph } from "../types/scene-graph.js";
import { CONTENT_MANIFEST_SCHEMA_ID } from "../validation/content-manifest-schema.js";

export type TextFallbackOptions = {
  title?: string;
  platform?: ContentManifest["platform"];
  renderProfile?: ContentManifest["renderProfile"];
  author?: string;
  copyrightLicense?: string;
  ttsVoice?: string;
  mood?: ContentScene["mood"];
  scriptType?: ContentScene["script_type"];
  wordsPerSecond?: number;
};

const DEFAULTS: Required<TextFallbackOptions> = {
  title: "TXT Import",
  platform: "douyin",
  renderProfile: "draft",
  author: "John",
  copyrightLicense: "commercial",
  ttsVoice: "zh-CN-female-yunyang",
  mood: "calm",
  scriptType: "narration",
  wordsPerSecond: 4,
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "txt-import";
}

function normalizeText(input: string) {
  return input.replace(/\r\n/g, "\n").trim();
}

function splitParagraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => /[\p{L}\p{N}]/u.test(block));
}

function splitSentences(block: string) {
  return block
    .split(/(?<=[。！？!?；;])\s+|(?<=[。！？!?；;])/u)
    .map((part) => part.trim())
    .filter((part) => /[\p{L}\p{N}]/u.test(part));
}

function estimateDurationMs(text: string, wordsPerSecond: number) {
  const compact = text.replace(/\s+/g, "");
  const length = compact.length;
  const seconds = Math.max(3, Math.ceil(length / Math.max(1, wordsPerSecond)));
  return seconds * 1000;
}

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeHashInput(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function buildScenes(
  text: string,
  options: Required<TextFallbackOptions>,
): ContentScene[] {
  const paragraphs = splitParagraphs(text);
  const rawScenes =
    paragraphs.length > 1
      ? paragraphs
      : paragraphs.flatMap((paragraph) => splitSentences(paragraph));

  const scenes = rawScenes
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && /[\p{L}\p{N}]/u.test(value))
    .map((narration, index) => {
      const id = `scene-${String(index + 1).padStart(3, "0")}-${slugify(narration.slice(0, 24))}`;
      const visualHint = `根据这段文案生成配图：${narration.slice(0, 60)}`;
      const sceneHashInput = [
        id,
        normalizeHashInput(narration),
        options.scriptType,
        options.mood,
        normalizeHashInput(visualHint),
        options.ttsVoice,
      ].join("|");
      const promptHashInput = [normalizeHashInput(visualHint), normalizeHashInput(narration)].join("|");

      return {
        id,
        scene_hash: sha256(sceneHashInput),
        prompt_hash: sha256(promptHashInput),
        duration_ms: estimateDurationMs(narration, options.wordsPerSecond),
        narration,
        script_type: options.scriptType,
        mood: options.mood,
        visual_hint: visualHint,
        audio: {
          tts_voice: options.ttsVoice,
        },
      };
    });

  if (scenes.length === 0) {
    throw new Error("TXT input does not contain any valid sentences or paragraphs.");
  }

  return scenes;
}

export function parseTextToSceneGraph(
  input: string,
  customOptions: TextFallbackOptions = {},
): SceneGraph {
  const text = normalizeText(input);
  if (!text) {
    throw new Error("TXT input is empty.");
  }

  const options = {
    ...DEFAULTS,
    ...customOptions,
  };

  const title = customOptions.title?.trim() || text.split(/\n+/)[0]?.trim() || DEFAULTS.title;
  const scenes = buildScenes(text, options);

  return {
    $schema: CONTENT_MANIFEST_SCHEMA_ID,
    id: `manifest-${slugify(title)}`,
    title,
    platform: options.platform,
    renderProfile: options.renderProfile,
    scenes,
    metadata: {
      created_at: new Date().toISOString(),
      author: options.author,
      copyright_license: options.copyrightLicense,
    },
  };
}

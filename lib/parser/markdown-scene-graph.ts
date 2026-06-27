import crypto from "node:crypto";

import {
  RENDER_PROFILES,
  SCENE_MOODS,
  SCRIPT_TYPES,
  SUPPORTED_PLATFORMS,
  type ContentManifest,
  type ContentScene,
  type RenderProfile,
  type SceneMood,
  type ScriptType,
  type SupportedPlatform,
} from "../types/manifest.js";
import type { SceneGraph } from "../types/scene-graph.js";

const DEFAULT_SCHEMA = "https://video-ops.example.com/manifest-v1.schema.json";

type SceneDraft = {
  heading: string;
  metadata: Record<string, string>;
  narrationLines: string[];
};

type DocumentDraft = {
  title?: string;
  metadata: Record<string, string>;
  scenes: SceneDraft[];
};

function normalizeLineBreaks(markdown: string) {
  return markdown.replace(/\r\n/g, "\n").trim();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "untitled";
}

function parseKeyValue(line: string) {
  const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.+)\s*$/);
  if (!match) return null;

  return {
    key: match[1],
    value: match[2],
  };
}

function requireValue(record: Record<string, string>, key: string, scope: string) {
  const value = record[key]?.trim();
  if (!value) {
    throw new Error(`Missing required field "${key}" in ${scope}.`);
  }

  return value;
}

function parseEnumValue<T extends readonly string[]>(
  value: string,
  allowed: T,
  field: string,
  scope: string,
) {
  if (!allowed.includes(value)) {
    throw new Error(
      `Invalid ${field} "${value}" in ${scope}. Allowed values: ${allowed.join(", ")}.`,
    );
  }

  return value as T[number];
}

function parseDuration(value: string, scope: string) {
  const duration = Number(value);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`Invalid duration_ms "${value}" in ${scope}.`);
  }

  return Math.round(duration);
}

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeHashInput(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function buildSceneHashInput(scene: {
  id: string;
  narration: string;
  script_type: ScriptType;
  mood: SceneMood;
  visual_hint?: string;
  tts_voice: string;
  bgm?: string;
}) {
  return [
    scene.id,
    normalizeHashInput(scene.narration),
    scene.script_type,
    scene.mood,
    normalizeHashInput(scene.visual_hint ?? ""),
    scene.tts_voice,
    scene.bgm ?? "",
  ].join("|");
}

function buildPromptHashInput(visualHint: string | undefined, narration: string) {
  return [normalizeHashInput(visualHint ?? ""), normalizeHashInput(narration)].join("|");
}

function parseDocumentDraft(markdown: string): DocumentDraft {
  const lines = normalizeLineBreaks(markdown).split("\n");
  const draft: DocumentDraft = {
    metadata: {},
    scenes: [],
  };

  let currentScene: SceneDraft | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("# ")) {
      if (currentScene) {
        currentScene.narrationLines.push(line);
        continue;
      }
      draft.title = line.slice(2).trim();
      continue;
    }

    if (line.startsWith("## ")) {
      currentScene = {
        heading: line.slice(3).trim(),
        metadata: {},
        narrationLines: [],
      };
      draft.scenes.push(currentScene);
      continue;
    }

    const pair = parseKeyValue(line);
    if (pair) {
      if (currentScene) {
        currentScene.metadata[pair.key] = pair.value;
      } else {
        draft.metadata[pair.key] = pair.value;
      }
      continue;
    }

    if (!currentScene) {
      throw new Error(`Unexpected content before first scene: "${line}".`);
    }

    currentScene.narrationLines.push(line);
  }

  return draft;
}

function buildScene(scene: SceneDraft, index: number): ContentScene {
  const scope = `scene ${index + 1}`;
  const metadata = scene.metadata;
  const explicitNarration = metadata.narration?.trim();
  const narrationBody = scene.narrationLines.join("\n").trim();
  const narration = [explicitNarration, narrationBody].filter(Boolean).join("\n").trim();

  if (!narration) {
    throw new Error(`Missing required field "narration" in ${scope}.`);
  }

  const headingId = scene.heading.replace(/^scene\s*[:：-]?\s*/i, "").trim();
  const id = metadata.id?.trim() || `scene-${String(index + 1).padStart(3, "0")}-${slugify(headingId || scene.heading)}`;

  const visualHint = metadata.visual_hint?.trim();
  const ttsVoice = requireValue(metadata, "tts_voice", scope);
  const bgm = metadata.bgm?.trim();
  const baseScene = {
    id,
    narration,
    script_type: parseEnumValue(
      requireValue(metadata, "script_type", scope),
      SCRIPT_TYPES,
      "script_type",
      scope,
    ) as ScriptType,
    mood: parseEnumValue(
      requireValue(metadata, "mood", scope),
      SCENE_MOODS,
      "mood",
      scope,
    ) as SceneMood,
    visual_hint: visualHint,
    tts_voice: ttsVoice,
    bgm,
  };

  return {
    id,
    scene_hash: sha256(buildSceneHashInput(baseScene)),
    prompt_hash: sha256(buildPromptHashInput(visualHint, narration)),
    duration_ms: parseDuration(requireValue(metadata, "duration_ms", scope), scope),
    narration,
    script_type: baseScene.script_type,
    mood: baseScene.mood,
    visual_hint: visualHint,
    audio: {
      tts_voice: ttsVoice,
      bgm,
    },
  };
}

export function parseMarkdownToSceneGraph(markdown: string): SceneGraph {
  if (!markdown.trim()) {
    throw new Error("Markdown input is empty.");
  }

  const draft = parseDocumentDraft(markdown);
  const title = draft.title?.trim();
  if (!title) {
    throw new Error("Missing document title (# Title).");
  }

  if (draft.scenes.length === 0) {
    throw new Error("Markdown must contain at least one scene section (## Scene ...).");
  }

  const metadata = draft.metadata;
  const manifest: ContentManifest = {
    $schema: metadata.$schema?.trim() || DEFAULT_SCHEMA,
    id: metadata.id?.trim() || `manifest-${slugify(title)}`,
    title,
    platform: parseEnumValue(
      requireValue(metadata, "platform", "document metadata"),
      SUPPORTED_PLATFORMS,
      "platform",
      "document metadata",
    ) as SupportedPlatform,
    renderProfile: parseEnumValue(
      requireValue(metadata, "renderProfile", "document metadata"),
      RENDER_PROFILES,
      "renderProfile",
      "document metadata",
    ) as RenderProfile,
    scenes: draft.scenes.map(buildScene),
    metadata: {
      created_at: metadata.created_at?.trim() || new Date().toISOString(),
      author: requireValue(metadata, "author", "document metadata"),
      copyright_license: requireValue(metadata, "copyright_license", "document metadata"),
    },
  };

  return manifest;
}

export function sceneGraphToJson(sceneGraph: SceneGraph) {
  return JSON.stringify(sceneGraph, null, 2);
}

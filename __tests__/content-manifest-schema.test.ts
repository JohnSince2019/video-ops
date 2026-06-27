import assert from "node:assert/strict";
import test from "node:test";

import { parseMarkdownToSceneGraph } from "../lib/parser/markdown-scene-graph.js";
import {
  CONTENT_MANIFEST_SCHEMA_ID,
  assertValidContentManifest,
  contentManifestSchema,
  validateContentManifest,
} from "../lib/validation/content-manifest-schema.js";

const validManifest = {
  $schema: CONTENT_MANIFEST_SCHEMA_ID,
  id: "manifest-001",
  title: "AI Workflow Demo",
  platform: "douyin",
  renderProfile: "standard",
  scenes: [
    {
      id: "scene-001",
      scene_hash: "scene-hash-001",
      prompt_hash: "prompt-hash-001",
      duration_ms: 5000,
      narration: "把流程定下来，效率才会稳定。",
      script_type: "narration",
      mood: "inspiring",
      visual_hint: "一位创作者在梳理 SOP",
      audio: {
        tts_voice: "zh-CN-female-yunyang",
      },
    },
  ],
  metadata: {
    created_at: "2026-06-26T00:00:00.000Z",
    author: "John",
    copyright_license: "commercial",
  },
};

test("accepts a valid content manifest", () => {
  const result = validateContentManifest(validManifest);

  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.value.platform, "douyin");
    assert.equal(result.value.scenes[0]?.script_type, "narration");
  }
});

test("exposes a schema definition aligned with the manifest contract", () => {
  assert.equal(contentManifestSchema.$id, CONTENT_MANIFEST_SCHEMA_ID);
  assert.deepEqual(contentManifestSchema.properties.platform.enum, [
    "douyin",
    "xiaohongshu",
    "videox",
  ]);
});

test("rejects missing top-level fields", () => {
  const result = validateContentManifest({
    ...validManifest,
    title: "",
  });

  assert.equal(result.valid, false);
  if (!result.valid) {
    assert.match(result.errors.join("\n"), /title must be a non-empty string/);
  }
});

test("rejects invalid platform and render profile values", () => {
  const result = validateContentManifest({
    ...validManifest,
    platform: "youtube",
    renderProfile: "cinematic",
  });

  assert.equal(result.valid, false);
  if (!result.valid) {
    const text = result.errors.join("\n");
    assert.match(text, /platform must be one of/);
    assert.match(text, /renderProfile must be one of/);
  }
});

test("rejects empty scenes and invalid scene duration", () => {
  const emptyScenes = validateContentManifest({
    ...validManifest,
    scenes: [],
  });
  const badDuration = validateContentManifest({
    ...validManifest,
    scenes: [
      {
        ...validManifest.scenes[0],
        duration_ms: 0,
      },
    ],
  });

  assert.equal(emptyScenes.valid, false);
  assert.equal(badDuration.valid, false);
  if (!emptyScenes.valid) {
    assert.match(emptyScenes.errors.join("\n"), /scenes must be a non-empty array/);
  }
  if (!badDuration.valid) {
    assert.match(badDuration.errors.join("\n"), /duration_ms must be a positive integer/);
  }
});

test("validates markdown parser output directly", () => {
  const parsed = parseMarkdownToSceneGraph(`
# Parser To Schema
platform: douyin
renderProfile: draft
author: John
copyright_license: commercial

## Scene: Intro
duration_ms: 3500
script_type: narration
mood: calm
tts_voice: zh-CN-female-yunyang
先做结构化，再做自动化。
`);

  assert.doesNotThrow(() => assertValidContentManifest(parsed));
});

test("rejects missing scene hash fields", () => {
  const invalid = validateContentManifest({
    ...validManifest,
    scenes: [
      {
        ...validManifest.scenes[0],
        scene_hash: "",
      },
    ],
  });

  assert.equal(invalid.valid, false);
  if (!invalid.valid) {
    assert.match(invalid.errors.join("\n"), /scene_hash must be a non-empty string/);
  }
});

import assert from "node:assert/strict";
import test from "node:test";

import type { ContentManifest } from "../lib/types/manifest.js";
import {
  parseMarkdownToSceneGraph,
  sceneGraphToJson,
} from "../lib/parser/markdown-scene-graph.js";

const sampleMarkdown = `
# AI 提效训练营短视频
platform: douyin
renderProfile: standard
author: John
copyright_license: commercial
created_at: 2026-06-26T00:00:00.000Z

## Scene: Hook
duration_ms: 4000
script_type: narration
mood: inspiring
visual_hint: 工程经理站在白板前，讲解 AI 工作流
tts_voice: zh-CN-female-yunyang
你是不是每天都很忙，但产出还是不稳定？

## Scene: Method
id: scene-method
duration_ms: 6000
script_type: narration
mood: calm
visual_hint: 屏幕上出现 SOP 和 checklist
tts_voice: zh-CN-male-yunze
bgm: focused-lofi-001
narration: 先把流程固定，再让 AI 接手重复动作。
`;

test("parses markdown into a multi-scene scene graph", () => {
  const manifest = parseMarkdownToSceneGraph(sampleMarkdown);

  assert.equal(manifest.title, "AI 提效训练营短视频");
  assert.equal(manifest.platform, "douyin");
  assert.equal(manifest.renderProfile, "standard");
  assert.equal(manifest.metadata.author, "John");
  assert.equal(manifest.scenes.length, 2);
  assert.match(manifest.scenes[0]?.id ?? "", /^scene-001-/);
  assert.match(manifest.scenes[0]?.scene_hash ?? "", /^[a-f0-9]{64}$/);
  assert.match(manifest.scenes[0]?.prompt_hash ?? "", /^[a-f0-9]{64}$/);
  assert.equal(manifest.scenes[0]?.narration, "你是不是每天都很忙，但产出还是不稳定？");
  assert.equal(manifest.scenes[1]?.id, "scene-method");
  assert.equal(manifest.scenes[1]?.audio.bgm, "focused-lofi-001");
  assert.equal(
    manifest.scenes[1]?.narration,
    "先把流程固定，再让 AI 接手重复动作。",
  );
});

test("returns explicit errors for missing metadata", () => {
  assert.throws(
    () =>
      parseMarkdownToSceneGraph(`
# Missing Platform
renderProfile: standard
author: John
copyright_license: commercial

## Scene: Only
duration_ms: 3000
script_type: narration
mood: calm
tts_voice: zh-CN-female-yunyang
一段旁白
`),
    /Missing required field "platform"/,
  );
});

test("returns explicit errors for missing scenes", () => {
  assert.throws(
    () =>
      parseMarkdownToSceneGraph(`
# No Scene Doc
platform: douyin
renderProfile: draft
author: John
copyright_license: commercial
`),
    /at least one scene section/,
  );
});

test("returns explicit errors for missing narration", () => {
  assert.throws(
    () =>
      parseMarkdownToSceneGraph(`
# Broken Scene
platform: douyin
renderProfile: draft
author: John
copyright_license: commercial

## Scene: Empty
duration_ms: 3000
script_type: narration
mood: calm
tts_voice: zh-CN-female-yunyang
`),
    /Missing required field "narration"/,
  );
});

test("maps parser output to the current manifest types", () => {
  const manifest: ContentManifest = parseMarkdownToSceneGraph(sampleMarkdown);

  assert.equal(manifest.scenes[0]?.script_type, "narration");
  assert.match(sceneGraphToJson(manifest), /"platform": "douyin"/);
});

test("produces stable hashes for repeated markdown parsing", () => {
  const first = parseMarkdownToSceneGraph(sampleMarkdown);
  const second = parseMarkdownToSceneGraph(sampleMarkdown);

  assert.equal(first.scenes[0]?.scene_hash, second.scenes[0]?.scene_hash);
  assert.equal(first.scenes[0]?.prompt_hash, second.scenes[0]?.prompt_hash);
});

test("changes hashes when narration or visual hint changes", () => {
  const base = parseMarkdownToSceneGraph(sampleMarkdown);
  const changedNarration = parseMarkdownToSceneGraph(
    sampleMarkdown.replace("你是不是每天都很忙，但产出还是不稳定？", "你是不是每天都很忙，但效率还是上不去？"),
  );
  const changedPrompt = parseMarkdownToSceneGraph(
    sampleMarkdown.replace("工程经理站在白板前，讲解 AI 工作流", "工程经理坐在电脑前，展示 AI 面板"),
  );

  assert.notEqual(base.scenes[0]?.scene_hash, changedNarration.scenes[0]?.scene_hash);
  assert.notEqual(base.scenes[0]?.prompt_hash, changedPrompt.scenes[0]?.prompt_hash);
});

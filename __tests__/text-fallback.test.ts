import assert from "node:assert/strict";
import test from "node:test";

import { parseTextToSceneGraph } from "../lib/parser/text-fallback.js";
import { assertValidContentManifest } from "../lib/validation/content-manifest-schema.js";

test("splits multi-sentence text into multiple scenes", () => {
  const manifest = parseTextToSceneGraph(
    "第一句讲问题。第二句讲方法！第三句讲结果？",
  );

  assert.equal(manifest.scenes.length, 3);
  assert.equal(manifest.scenes[0]?.narration, "第一句讲问题。");
  assert.equal(manifest.scenes[1]?.narration, "第二句讲方法！");
  assert.equal(manifest.scenes[2]?.narration, "第三句讲结果？");
  assert.match(manifest.scenes[0]?.scene_hash ?? "", /^[a-f0-9]{64}$/);
  assert.match(manifest.scenes[0]?.prompt_hash ?? "", /^[a-f0-9]{64}$/);
});

test("splits by paragraph and fills defaults", () => {
  const manifest = parseTextToSceneGraph(
    "第一段讲背景\n\n第二段讲方案",
    { author: "John", title: "TXT Demo" },
  );

  assert.equal(manifest.title, "TXT Demo");
  assert.equal(manifest.platform, "douyin");
  assert.equal(manifest.renderProfile, "draft");
  assert.equal(manifest.scenes.length, 2);
  assert.equal(manifest.scenes[0]?.script_type, "narration");
  assert.equal(manifest.scenes[0]?.mood, "calm");
  assert.equal(manifest.scenes[0]?.audio.tts_voice, "zh-CN-female-yunyang");
});

test("returns explicit errors for empty input", () => {
  assert.throws(() => parseTextToSceneGraph("   \n\t "), /TXT input is empty/);
});

test("returns explicit errors for noise-only input", () => {
  assert.throws(() => parseTextToSceneGraph("!!!\n\n。。。"), /does not contain any valid sentences/);
});

test("txt parser output passes the content manifest validator", () => {
  const manifest = parseTextToSceneGraph("先把任务拆小。再让 AI 接手重复动作。");

  assert.doesNotThrow(() => assertValidContentManifest(manifest));
});

test("txt parser hashes stay stable for the same input and change for different text", () => {
  const first = parseTextToSceneGraph("先把任务拆小。再让 AI 接手重复动作。");
  const second = parseTextToSceneGraph("先把任务拆小。再让 AI 接手重复动作。");
  const changed = parseTextToSceneGraph("先把任务拆小。最后用人工验收把结果卡住。");

  assert.equal(first.scenes[0]?.scene_hash, second.scenes[0]?.scene_hash);
  assert.equal(first.scenes[0]?.prompt_hash, second.scenes[0]?.prompt_hash);
  assert.notEqual(first.scenes[1]?.scene_hash, changed.scenes[1]?.scene_hash);
});

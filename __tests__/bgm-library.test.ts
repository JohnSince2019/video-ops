import assert from "node:assert/strict";
import test from "node:test";

import { findBgmPresets, listBgmPresets } from "../lib/audio/bgm-library.js";

test("bgm preset list exposes stable fields and minimum catalog size", () => {
  const presets = listBgmPresets();

  assert.equal(presets.length >= 20, true);
  assert.equal(typeof presets[0]?.id, "string");
  assert.equal(typeof presets[0]?.title, "string");
  assert.equal(typeof presets[0]?.mood, "string");
  assert.equal(typeof presets[0]?.tempo, "string");
  assert.equal(typeof presets[0]?.useCase, "string");
  assert.equal(typeof presets[0]?.localPath, "string");
});

test("filtering by mood and use case returns expected tracks", () => {
  const calm = findBgmPresets({ mood: "calm" });
  const hook = findBgmPresets({ useCase: "hook" });

  assert.equal(calm.every((item) => item.mood === "calm"), true);
  assert.equal(hook.some((item) => item.id === "spark-launch-001"), true);
});

test("unknown filters return safe empty results", () => {
  const none = findBgmPresets({ useCase: "non-existent-scene-type" });
  assert.deepEqual(none, []);
});

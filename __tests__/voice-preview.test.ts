import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import test from "node:test";

import { ensureVoicePreviewAsset, getVoicePreviewMeta } from "../lib/audio/voice-preview.js";

test("voice preview metadata exposes stable labels and real-preview flag", () => {
  const presetMeta = getVoicePreviewMeta("male_coach_deep");
  assert.equal(presetMeta.isPreviewPlaceholder, false);
  assert.match(presetMeta.label, /John Coach Male/);

  const customMeta = getVoicePreviewMeta("custom_reference");
  assert.equal(customMeta.isPreviewPlaceholder, false);
  assert.match(customMeta.label, /自定义声音参考/);
});

test("voice preview asset generation returns a playable wav path", async () => {
  const asset = await ensureVoicePreviewAsset({ voiceMode: "male_clear_teacher" });
  const stat = await fs.stat(asset.outputPath);

  assert.equal(asset.relativeUrl.endsWith(".wav"), true);
  assert.equal(stat.size > 44, true);
});

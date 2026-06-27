import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import test from "node:test";

import { ensureVoicePreviewAsset, getVoicePreviewMeta } from "../lib/audio/voice-preview.js";

test("voice preview metadata exposes stable labels and real-preview flag", () => {
  const presetMeta = getVoicePreviewMeta("male_coach_deep");
  assert.equal(presetMeta.isPreviewPlaceholder, false);
  assert.match(presetMeta.label, /John Coach Male|男声教练沉稳/);
  assert.match(presetMeta.previewPurposeLabel, /确认预设音色|快速确认/);
  assert.match(presetMeta.qualityNote, /工作台试听样本|最终任务成片/);

  const customMeta = getVoicePreviewMeta("custom_reference");
  assert.equal(customMeta.isPreviewPlaceholder, false);
  assert.match(customMeta.label, /自定义声音参考/);
  assert.match(customMeta.previewPurposeLabel, /参考声音/);
  assert.match(customMeta.qualityNote, /原始参考声音|不代表最终 TTS 成片/);
});

test("voice preview asset generation returns a playable wav path", async () => {
  const asset = await ensureVoicePreviewAsset({ voiceMode: "male_clear_teacher" });
  const stat = await fs.stat(asset.outputPath);

  assert.equal(asset.relativeUrl.endsWith(".wav"), true);
  assert.equal(stat.size > 44, true);
  assert.match(asset.previewSource, /system_preview|fallback_preview/);
});

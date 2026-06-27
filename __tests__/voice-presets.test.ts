import assert from "node:assert/strict";
import test from "node:test";

import {
  CUSTOM_VOICE_MODE,
  getCustomVoiceAuthorizationNotice,
  getVoicePreset,
  isCustomVoiceMode,
  listVoicePresets,
} from "../lib/audio/voice-presets.js";
import { normalizeWizardConfig, validateWizardConfig } from "../lib/ui/wizard-config.js";

test("voice preset registry exposes five stable voice presets", () => {
  const presets = listVoicePresets();

  assert.equal(presets.length, 5);
  assert.equal(presets[0]?.id, "male_coach_deep");
  assert.equal(presets[0]?.ttsVoice, "zh-CN-male-yunze");
  assert.equal(getVoicePreset("female_warm_narrator").ttsVoice, "zh-CN-female-yunyang");
});

test("custom voice mode and authorization notice are exposed explicitly", () => {
  assert.equal(isCustomVoiceMode(CUSTOM_VOICE_MODE), true);
  assert.equal(isCustomVoiceMode("male_coach_deep"), false);
  assert.match(getCustomVoiceAuthorizationNotice(), /explicit permission/i);
});

test("wizard config defaults to the John coach male preset and validates custom reference mode", () => {
  const draft = normalizeWizardConfig({
    title: "Voice Demo",
    platform: "douyin",
    renderProfile: "standard",
    author: "John",
    ownerToken: "voice-owner-001",
    scriptText: "第一段：这是声音预设测试。",
    scriptMode: "plain_text",
  });

  assert.equal(draft.voiceMode, "male_coach_deep");
  assert.equal(draft.ttsVoice, "zh-CN-male-yunze");

  const invalid = validateWizardConfig({
    title: "Voice Demo",
    platform: "douyin",
    renderProfile: "standard",
    author: "John",
    ownerToken: "voice-owner-001",
    scriptText: "第一段：这是声音预设测试。",
    scriptMode: "plain_text",
    voiceMode: "custom_reference",
  });

  assert.equal(invalid.valid, false);
  assert.match(invalid.errors.join("\n"), /customVoiceReference is required/);

  const custom = normalizeWizardConfig({
    title: "Voice Demo",
    platform: "douyin",
    renderProfile: "standard",
    author: "John",
    ownerToken: "voice-owner-001",
    scriptText: "第一段：这是声音预设测试。",
    scriptMode: "plain_text",
    voiceMode: "custom_reference",
    customVoiceReference: "john-reference.wav",
  });

  assert.equal(custom.voiceMode, "custom_reference");
  assert.equal(custom.customVoiceReference, "john-reference.wav");
  assert.equal(custom.ttsVoice, "custom-reference-voice");
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeWizardConfig,
  summarizeWizardConfig,
  validateWizardConfig,
} from "../lib/ui/wizard-config.js";

test("detects missing title, missing script, invalid platform, and invalid render profile", () => {
  const result = validateWizardConfig({
    title: "   ",
    platform: "youtube",
    renderProfile: "ultra",
    author: "John",
    ownerToken: "owner-001",
    scriptText: "",
    scriptMode: "plain_text",
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /title is required/);
  assert.match(result.errors.join("\n"), /platform must be one of/);
  assert.match(result.errors.join("\n"), /renderProfile must be one of/);
  assert.match(result.errors.join("\n"), /scriptText is required/);
});

test("rejects invalid tts provider and cloning-incompatible provider selections", () => {
  const invalidProvider = validateWizardConfig({
    title: "TTS Provider Test",
    platform: "douyin",
    renderProfile: "standard",
    author: "John",
    ownerToken: "owner-tts-provider-001",
    scriptText: "第一句。第二句。",
    scriptMode: "plain_text",
    ttsProviderId: "unknown-tts-provider",
  });
  assert.equal(invalidProvider.valid, false);
  assert.match(invalidProvider.errors.join("\n"), /ttsProviderId must be one of/);

  const cloningMismatch = validateWizardConfig({
    title: "Custom Clone Provider Test",
    platform: "douyin",
    renderProfile: "standard",
    author: "John",
    ownerToken: "owner-tts-provider-002",
    scriptText: "第一句。第二句。",
    scriptMode: "plain_text",
    voiceMode: "custom_reference",
    customVoiceReference: "john-demo.wav",
    ttsProviderId: "melotts",
  });
  assert.equal(cloningMismatch.valid, false);
  assert.match(cloningMismatch.errors.join("\n"), /does not support custom voice cloning/);
});

test("normalizes valid wizard input into a draft payload", () => {
  const draft = normalizeWizardConfig({
    title: "  AI 提效日报  ",
    platform: "douyin",
    renderProfile: "high_quality",
    author: " John ",
    ownerToken: " owner-token-001 ",
    scriptText: "第一句。第二句。第三句。",
    scriptMode: "plain_text",
  });

  assert.equal(draft.title, "AI 提效日报");
  assert.equal(draft.platform, "douyin");
  assert.equal(draft.renderProfile, "high_quality");
  assert.equal(draft.author, "John");
  assert.equal(draft.ownerToken, "owner-token-001");
  assert.equal(draft.stylePreset, "john_vertical_comic");
  assert.equal(draft.personaPreset, "john_persona_v1");
  assert.equal(draft.voiceMode, "male_coach_deep");
  assert.equal(draft.ttsVoice, "zh-CN-male-yunze");
  assert.equal(draft.ttsProviderId, "cosyvoice-mlx");
  assert.equal(draft.estimatedScenes, 3);
});

test("summary includes platform, profile, script mode, and estimated scene count", () => {
  const draft = normalizeWizardConfig({
    title: "Markdown Demo",
    platform: "xiaohongshu",
    renderProfile: "standard",
    author: "Atlas",
    ownerToken: "owner-xyz",
    scriptText: "# Scene 1\n内容一\n\n# Scene 2\n内容二",
    scriptMode: "markdown",
  });

  const summary = summarizeWizardConfig(draft);

  assert.equal(summary.platform, "xiaohongshu");
  assert.equal(summary.renderProfile, "standard");
  assert.equal(summary.scriptMode, "markdown");
  assert.equal(summary.stylePreset, "john_vertical_comic");
  assert.equal(summary.personaPreset, "john_persona_v1");
  assert.equal(summary.voiceMode, "male_coach_deep");
  assert.equal(summary.ttsVoice, "zh-CN-male-yunze");
  assert.equal(summary.ttsProviderId, "cosyvoice-mlx");
  assert.equal(summary.ttsProviderProfile.displayName, "CosyVoice MLX");
  assert.equal(summary.ttsProviderProfile.supportsVoiceCloning, true);
  assert.equal(summary.estimatedScenes, 2);
  assert.equal(summary.checklist.includes("Platform: xiaohongshu"), true);
  assert.equal(summary.checklist.includes("Style preset: john_vertical_comic"), true);
  assert.equal(summary.checklist.includes("Voice mode: male_coach_deep"), true);
  assert.equal(summary.checklist.includes("TTS provider: cosyvoice-mlx"), true);
});

test("voice presets map to provider strategy and custom voice defaults to cloning provider", () => {
  const premiumDraft = normalizeWizardConfig({
    title: "Creator Hook",
    platform: "douyin",
    renderProfile: "standard",
    author: "John",
    ownerToken: "owner-voice-provider-001",
    scriptText: "第一句。第二句。",
    scriptMode: "plain_text",
    voiceMode: "female_energetic_creator",
  });
  assert.equal(premiumDraft.ttsProviderId, "f5-tts");
  assert.equal(premiumDraft.ttsVoice, "zh-CN-female-yunxi");

  const customDraft = normalizeWizardConfig({
    title: "Custom Voice",
    platform: "douyin",
    renderProfile: "standard",
    author: "John",
    ownerToken: "owner-custom-voice-001",
    scriptText: "第一句。第二句。",
    scriptMode: "plain_text",
    voiceMode: "custom_reference",
    customVoiceReference: "john-demo.wav",
  });
  assert.equal(customDraft.ttsProviderId, "cosyvoice-mlx");
  assert.equal(customDraft.ttsVoice, "custom-reference-voice");
});

test("explicit tts provider selection is preserved when compatible", () => {
  const draft = normalizeWizardConfig({
    title: "Explicit Provider",
    platform: "douyin",
    renderProfile: "standard",
    author: "John",
    ownerToken: "owner-explicit-provider-001",
    scriptText: "第一句。第二句。",
    scriptMode: "plain_text",
    voiceMode: "male_coach_deep",
    ttsProviderId: "f5-tts",
  });

  assert.equal(draft.ttsProviderId, "f5-tts");
  assert.equal(draft.ttsVoice, "zh-CN-male-yunze");
});

test("plain text scene markers are counted as explicit scenes", () => {
  const draft = normalizeWizardConfig({
    title: "Bench Press Demo",
    platform: "douyin",
    renderProfile: "standard",
    author: "John",
    ownerToken: "owner-bench-001",
    scriptText: [
      "Scene 1",
      "narration: 第一幕",
      "",
      "Scene 2",
      "narration: 第二幕",
      "",
      "Scene 3",
      "narration: 第三幕",
    ].join("\n"),
    scriptMode: "plain_text",
  });

  assert.equal(draft.estimatedScenes, 3);
});

test("markdown short-video script headings are not all treated as scenes", () => {
  const draft = normalizeWizardConfig({
    title: "高输出操作系统",
    platform: "douyin",
    renderProfile: "standard",
    author: "John",
    ownerToken: "owner-markdown-script-001",
    scriptText: [
      "# 短视频脚本：你不是缺 AI 工具，你是缺一套高输出操作系统",
      "",
      "## 标题",
      "你不是不会用 AI，你只是还没有一套高输出操作系统",
      "",
      "## 时长",
      "30-45 秒",
      "",
      "## 开场钩子",
      "很多高强度上班的人，不是真的不会用 AI。",
      "问题是，你只是多了一个工具，但没有多一套系统。",
      "",
      "## 正文",
      "你白天开会、写方案、带团队、回消息，已经很累了。",
      "下班再想做内容、做副业、做个人品牌，脑子其实已经空了。",
      "",
      "这时候，真正有用的不是再学 10 个 prompt。",
      "而是建立一套系统：",
      "",
      "- 让 AI 帮你接住真实工作里的素材",
      "- 帮你把经验整理成可表达的内容",
      "- 再把一篇内容，拆成文章、短视频、短帖反复复用",
      "",
      "## 结尾",
      "我现在就在做这件事。",
      "不是教你多会一个工具，而是一起搭一套能长期高质量输出的操作系统。",
      "",
      "## CTA",
      "如果你也想把工作流、内容流和精力系统真正接起来，关注我。",
    ].join("\n"),
    scriptMode: "markdown",
  });

  assert.equal(draft.estimatedScenes, 4);
});

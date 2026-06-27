import assert from "node:assert/strict";
import test from "node:test";

import { createVideoJobFromDraft } from "../lib/jobs/job-creation.js";
import { normalizeWizardConfig } from "../lib/ui/wizard-config.js";

test("creates a queued job, manifest, storyboard, and output paths from a plain text draft", () => {
  const draft = normalizeWizardConfig({
    title: "Bench Press Demo",
    platform: "douyin",
    renderProfile: "standard",
    author: "John",
    ownerToken: "owner-bench-001",
    scriptText: "第一段：卧推肩疼先看手肘角度。\n\n第二段：四十五到六十度通常更稳。",
    scriptMode: "plain_text",
    stylePreset: "john_vertical_comic",
    personaPreset: "john_persona_v1",
    voiceMode: "male_coach_deep",
  });

  const created = createVideoJobFromDraft(draft);

  assert.match(created.record.id, /^job-/);
  assert.equal(created.record.state, "QUEUED");
  assert.equal(created.record.platform, "douyin");
  assert.equal(created.record.renderProfile, "standard");
  assert.equal(created.manifest.title, "Bench Press Demo");
  assert.equal(created.manifest.scenes.length, 2);
  assert.equal(created.manifest.scenes[0]?.audio.tts_voice, "zh-CN-male-yunze");
  assert.equal(created.storyboard.summary.totalScenes, 2);
  assert.equal(created.outputPaths.videoPath.includes(`/jobs/${created.record.id}/video.mp4`), true);
});

test("creates a manifest from markdown drafts and records style/voice checkpoint metadata", () => {
  const draft = normalizeWizardConfig({
    title: "Markdown Demo",
    platform: "xiaohongshu",
    renderProfile: "high_quality",
    author: "John",
    ownerToken: "owner-markdown-001",
    scriptText: [
      "# Markdown Demo",
      "platform: xiaohongshu",
      "renderProfile: high_quality",
      "author: John",
      "copyright_license: commercial",
      "",
      "## Scene: 开场",
      "duration_ms: 3000",
      "script_type: narration",
      "mood: inspiring",
      "visual_hint: John 在办公室白板前讲解",
      "tts_voice: zh-CN-female-yunyang",
      "这是第一幕。",
    ].join("\n"),
    scriptMode: "markdown",
    stylePreset: "john_vertical_comic",
    personaPreset: "john_persona_v1",
    voiceMode: "female_warm_narrator",
  });

  const created = createVideoJobFromDraft(draft);

  assert.equal(created.manifest.platform, "xiaohongshu");
  assert.equal(created.manifest.scenes.length, 1);
  assert.equal(created.storyboard.cards[0]?.title, "Scene 1");
  assert.match(JSON.stringify(created.record.lastCheckpoint), /john_vertical_comic/i);
});

test("custom voice reference is preserved in job checkpoint metadata", () => {
  const draft = normalizeWizardConfig({
    title: "Custom Voice Demo",
    platform: "douyin",
    renderProfile: "standard",
    author: "John",
    ownerToken: "owner-custom-voice-001",
    scriptText: "第一段：这是自定义声音任务。",
    scriptMode: "plain_text",
    stylePreset: "john_vertical_comic",
    personaPreset: "john_persona_v1",
    voiceMode: "custom_reference",
    customVoiceReference: "john-custom-reference.wav",
  });

  const created = createVideoJobFromDraft(draft);

  assert.match(JSON.stringify(created.record.lastCheckpoint), /john-custom-reference\.wav/);
  assert.match(JSON.stringify(created.record.lastCheckpoint), /custom-reference-voice/);
  assert.equal(created.manifest.scenes[0]?.audio.reference_audio_path?.endsWith("john-custom-reference.wav"), true);
});

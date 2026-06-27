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
  assert.equal(summary.estimatedScenes, 2);
  assert.equal(summary.checklist.includes("Platform: xiaohongshu"), true);
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

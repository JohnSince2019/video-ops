import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDefaultEditIntentOptions,
  normalizeEditIntentOptions,
  recommendEditIntentOptions,
  summarizeEditIntentOptions,
} from "../lib/raw-video/edit-intent-options.js";

test("buildDefaultEditIntentOptions exposes stable defaults for raw-video editing intent", () => {
  const options = buildDefaultEditIntentOptions();

  assert.equal(options.trimIntensity, "balanced");
  assert.equal(options.packagingIntensity, "standard");
  assert.equal(options.subtitleStyle, "clean_readable");
  assert.equal(options.outputPlatforms.includes("douyin"), true);
  assert.equal(options.outputPlatforms.includes("wechat_channels"), true);
});

test("normalizeEditIntentOptions keeps valid values and falls back invalid values", () => {
  const options = normalizeEditIntentOptions({
    trimIntensity: "aggressive",
    packagingIntensity: "minimal",
    subtitleStyle: "chapter_caption",
    hookType: "result_first",
    brollStrategy: "none",
    aspectRatioStrategy: "portrait_primary",
    audioStrategy: "voice_plus_light_bgm",
    outputPlatforms: ["douyin", "invalid-platform" as never],
  });

  assert.equal(options.trimIntensity, "aggressive");
  assert.equal(options.packagingIntensity, "minimal");
  assert.equal(options.outputPlatforms.length, 1);
  assert.equal(options.outputPlatforms[0], "douyin");
});

test("summarizeEditIntentOptions returns human-readable Chinese labels", () => {
  const summary = summarizeEditIntentOptions(
    normalizeEditIntentOptions({
      trimIntensity: "conservative",
      packagingIntensity: "high_energy",
      subtitleStyle: "highlight_keywords",
      hookType: "counterintuitive",
      brollStrategy: "explanation_enhanced",
      aspectRatioStrategy: "platform_adaptive",
      audioStrategy: "voice_plus_dynamic_bgm",
      outputPlatforms: ["wechat_channels", "xiaohongshu"],
    }),
  );

  assert.equal(summary.trimLabel, "保守剪辑");
  assert.equal(summary.packagingLabel, "高能包装");
  assert.equal(summary.subtitleLabel, "关键词强调字幕");
  assert.equal(summary.platformLabel.includes("wechat_channels"), true);
});

test("recommendEditIntentOptions derives options and reasons from transcript analysis signals", () => {
  const recommendation = recommendEditIntentOptions({
    transcriptText: "你不是不会用 AI，而是缺一套系统。这个流程怎么搭，我们后面分三段来讲。",
    chapterCount: 3,
    standoutQuoteCount: 2,
    removalSuggestionCount: 3,
  });

  assert.equal(recommendation.options.trimIntensity, "aggressive");
  assert.equal(recommendation.options.hookType, "counterintuitive");
  assert.equal(recommendation.options.subtitleStyle, "chapter_caption");
  assert.equal(recommendation.options.brollStrategy, "supporting_cutaways");
  assert.equal(typeof recommendation.reasons.hookType, "string");
  assert.equal(recommendation.reasons.hookType.includes("反常识"), true);
});

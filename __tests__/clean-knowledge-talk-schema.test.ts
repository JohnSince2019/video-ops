import assert from "node:assert/strict";
import test from "node:test";

import {
  CLEAN_KNOWLEDGE_TALK_DEFAULT_PROPS,
} from "../remotion/src/clean-knowledge-talk-props";
import {
  normalizeCleanKnowledgeTalkProps,
  validateCleanKnowledgeTalkProps,
} from "../remotion/src/clean-knowledge-talk-schema";
import { buildCleanKnowledgeTalkRemotionProps } from "../lib/raw-video/remotion-props.js";

test("validateCleanKnowledgeTalkProps accepts the default template props contract", () => {
  const result = validateCleanKnowledgeTalkProps(CLEAN_KNOWLEDGE_TALK_DEFAULT_PROPS);
  assert.equal(result.valid, true);
});

test("validateCleanKnowledgeTalkProps rejects empty strings, invalid waveform, and broken frame ranges", () => {
  const result = validateCleanKnowledgeTalkProps({
    ...CLEAN_KNOWLEDGE_TALK_DEFAULT_PROPS,
    title: "",
    waveformStyle: "noisy",
    chapters: [{ title: "", summary: "x", startFrame: 20, endFrame: 10 }],
    standoutQuotes: [{ text: "", reason: "", startFrame: -1, endFrame: 0 }],
    captionCues: [],
  });

  assert.equal(result.valid, false);
  if (result.valid) {
    throw new Error("Expected validation errors");
  }
  assert.equal(result.errors.some((error) => error.includes("title must be a non-empty string")), true);
  assert.equal(result.errors.some((error) => error.includes("waveformStyle must be one of")), true);
  assert.equal(result.errors.some((error) => error.includes("chapters[0].endFrame must be greater than startFrame")), true);
  assert.equal(result.errors.some((error) => error.includes("captionCues must contain at least 1 item")), true);
});

test("normalizeCleanKnowledgeTalkProps fills missing values from defaults and repairs frame ranges", () => {
  const normalized = normalizeCleanKnowledgeTalkProps({
    title: "  自定义标题  ",
    chapters: [{ title: "章一", summary: "", startFrame: 40, endFrame: 40 }],
    standoutQuotes: [{ text: "金句", reason: "", startFrame: 12, endFrame: 8 }],
    captionCues: [{ text: "字幕", startFrame: 4, endFrame: 4 }],
    waveformStyle: "energetic",
  });

  assert.equal(normalized.title, "自定义标题");
  assert.equal(normalized.hook, CLEAN_KNOWLEDGE_TALK_DEFAULT_PROPS.hook);
  assert.equal(normalized.chapters[0]?.summary.length > 0, true);
  assert.equal((normalized.chapters[0]?.endFrame ?? 0) > (normalized.chapters[0]?.startFrame ?? 0), true);
  assert.equal((normalized.standoutQuotes[0]?.endFrame ?? 0) > (normalized.standoutQuotes[0]?.startFrame ?? 0), true);
  assert.equal((normalized.captionCues[0]?.endFrame ?? 0) > (normalized.captionCues[0]?.startFrame ?? 0), true);
  assert.equal(normalized.waveformStyle, "energetic");
});

test("buildCleanKnowledgeTalkRemotionProps maps transcript analysis into remotion-ready template props", () => {
  const props = buildCleanKnowledgeTalkRemotionProps({
    title: "高输出系统",
    analysis: {
      topic: "AI 高输出系统",
      summary: "把工作素材接住、整理、复用。",
      chapters: [
        { title: "问题", startMs: 0, endMs: 3000, summary: "先识别问题" },
        { title: "方法", startMs: 3000, endMs: 6500, summary: "再给出方法" },
      ],
      standoutQuotes: [
        { text: "你不是缺 AI 工具。", startMs: 500, endMs: 2800, reason: "用作 Hook" },
        { text: "你是缺一套系统。", startMs: 3200, endMs: 5400, reason: "用作收束" },
      ],
      removalSuggestions: [],
      glossaryReplacements: [],
      providerMetadata: { stage: "analysis", provider: "raw-video-heuristic-analyzer", mode: "primary" },
    },
    fps: 30,
    cta: "关注我，继续看完整方法。",
  });

  assert.equal(props.title, "高输出系统");
  assert.equal(props.runtimeLabel, "7s · 9:16 · CleanKnowledgeTalk");
  assert.equal(props.chapters.length, 2);
  assert.equal(props.chapters[0]?.startFrame, 0);
  assert.equal(props.chapters[0]?.endFrame, 90);
  assert.equal(props.standoutQuotes.length, 2);
  assert.equal(props.captionCues[0]?.text, "你不是缺 AI 工具。");
  assert.equal(props.waveformStyle, "focused");
  assert.equal(props.cta, "关注我，继续看完整方法。");
});

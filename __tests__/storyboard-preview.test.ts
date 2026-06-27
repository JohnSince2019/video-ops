import assert from "node:assert/strict";
import test from "node:test";

import { buildStoryboardPreview } from "../lib/ui/storyboard-preview.js";

const scenes = [
  {
    id: "scene-001",
    narration: "第一幕：AI 把重复工作变成流程，让研发节省上下文切换成本。",
    visualHint: "工程师站在白板前",
    durationMs: 4200,
    transition: "crossfade" as const,
  },
  {
    id: "scene-002",
    narration: "第二幕：通过系统化体能管理，让高强度脑力工作可持续。",
    visualHint: "清晨运动后回到工位",
    durationMs: 5100,
    transition: "fade" as const,
  },
];

test("builds storyboard preview cards from scene inputs", () => {
  const preview = buildStoryboardPreview({
    scenes,
    controls: {
      textMode: "original",
      subtitleStyle: "minimal",
      transitionStyle: "crossfade",
    },
  });

  assert.equal(preview.cards.length, 2);
  assert.equal(preview.cards[0]?.title, "Scene 1");
  assert.equal(preview.cards[0]?.visualHint, "工程师站在白板前");
  assert.equal(preview.cards[0]?.durationLabel, "4s");
});

test("text, subtitle style, and transition changes produce updated preview summaries", () => {
  const preview = buildStoryboardPreview({
    scenes,
    controls: {
      textMode: "headline",
      subtitleStyle: "caption-card",
      transitionStyle: "fade",
    },
  });

  assert.equal(preview.summary.textMode, "headline");
  assert.equal(preview.summary.subtitleStyle, "caption-card");
  assert.equal(preview.summary.transitionStyle, "fade");
  assert.equal(preview.cards[0]?.transition, "fade");
  assert.match(preview.cards[0]?.previewCaption ?? "", /第一幕/);
});

test("preview still renders safely when optional fields are missing", () => {
  const preview = buildStoryboardPreview({
    scenes: [
      {
        id: "scene-003",
        narration: "",
        durationMs: 1800,
      },
    ],
    controls: {
      textMode: "shorten",
      subtitleStyle: "bold",
      transitionStyle: "cut",
    },
  });

  assert.equal(preview.cards[0]?.narration, "No narration provided.");
  assert.equal(preview.cards[0]?.visualHint, "No visual hint provided.");
  assert.equal(preview.cards[0]?.durationLabel, "2s");
});

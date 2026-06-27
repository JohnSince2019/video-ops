import { buildStoryboardPreview } from "../lib/ui/storyboard-preview.ts";

const preview = buildStoryboardPreview({
  scenes: [
    {
      id: "scene-001",
      narration: "第一幕：Atlas 帮你把 AI 使用经验沉淀成可复用流程。",
      visualHint: "桌面上的多屏协作场景",
      durationMs: 3800,
    },
    {
      id: "scene-002",
      narration: "第二幕：John 用运动科学维持高能输出。",
      visualHint: "晨跑后整理内容选题",
      durationMs: 4600,
    },
  ],
  controls: {
    textMode: "headline",
    subtitleStyle: "caption-card",
    transitionStyle: "fade",
  },
});

console.log(JSON.stringify(preview, null, 2));

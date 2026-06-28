export const WAVEFORM_STYLES = ["calm", "focused", "energetic"] as const;

export type WaveformStyle = (typeof WAVEFORM_STYLES)[number];

export type CleanKnowledgeTalkChapter = {
  title: string;
  summary: string;
  startFrame: number;
  endFrame: number;
};

export type CleanKnowledgeTalkQuote = {
  text: string;
  reason: string;
  startFrame: number;
  endFrame: number;
};

export type CleanKnowledgeTalkCaptionCue = {
  text: string;
  startFrame: number;
  endFrame: number;
};

export type CleanKnowledgeTalkProps = {
  title: string;
  speaker: string;
  hook: string;
  topicLabel: string;
  accentColor: string;
  runtimeLabel: string;
  chapters: CleanKnowledgeTalkChapter[];
  standoutQuotes: CleanKnowledgeTalkQuote[];
  captionCues: CleanKnowledgeTalkCaptionCue[];
  cta: string;
  speakerFootnote: string;
  waveformStyle: WaveformStyle;
};

export const CLEAN_KNOWLEDGE_TALK_DEFAULT_PROPS: CleanKnowledgeTalkProps = {
  title: "你不是缺 AI 工具，你是缺一套高输出操作系统",
  speaker: "John × Atlas",
  hook: "真正有用的，不是再学 10 个 prompt，而是建立一套能接住工作素材、整理经验、复用内容的系统。",
  topicLabel: "知识口播包装模板",
  accentColor: "#ff7a59",
  runtimeLabel: "45s · 9:16 · CleanKnowledgeTalk",
  chapters: [
    {
      title: "问题识别",
      summary: "多数人不是不会用 AI，而是只有工具，没有系统。",
      startFrame: 12,
      endFrame: 72,
    },
    {
      title: "方法拆解",
      summary: "把工作素材接住、整理、复用，输出自然就不再依赖硬挤时间。",
      startFrame: 72,
      endFrame: 132,
    },
    {
      title: "行动收束",
      summary: "把经验沉淀成资产，而不是每天从空白开始。",
      startFrame: 132,
      endFrame: 180,
    },
  ],
  standoutQuotes: [
    {
      text: "你不是缺 AI 工具，你是缺一套高输出操作系统。",
      reason: "作为标题与核心主张强化记忆点。",
      startFrame: 20,
      endFrame: 90,
    },
    {
      text: "不是额外抽时间创作，而是把你本来就在做的工作沉淀成资产。",
      reason: "强化用户对副业与内容复用的理解。",
      startFrame: 96,
      endFrame: 164,
    },
  ],
  captionCues: [
    {text: "你不是缺 AI 工具", startFrame: 18, endFrame: 48},
    {text: "你是缺一套高输出操作系统", startFrame: 48, endFrame: 84},
    {text: "先接住工作素材，再整理，再复用", startFrame: 92, endFrame: 132},
    {text: "让内容沉淀成长期资产", startFrame: 136, endFrame: 176},
  ],
  cta: "下一步接入真实 raw-video transcript、章节卡、字幕与 CTA 数据。",
  speakerFootnote: "面向知识口播 / talking-head / 课程切片的第一版包装模板",
  waveformStyle: "focused",
};

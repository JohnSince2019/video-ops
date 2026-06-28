import type { TranscriptAnalysis } from "./transcript-analyzer.js";

export type CleanKnowledgeTalkRemotionProps = {
  title: string;
  speaker: string;
  hook: string;
  topicLabel: string;
  accentColor: string;
  runtimeLabel: string;
  chapters: Array<{
    title: string;
    summary: string;
    startFrame: number;
    endFrame: number;
  }>;
  standoutQuotes: Array<{
    text: string;
    reason: string;
    startFrame: number;
    endFrame: number;
  }>;
  captionCues: Array<{
    text: string;
    startFrame: number;
    endFrame: number;
  }>;
  cta: string;
  speakerFootnote: string;
  waveformStyle: "calm" | "focused" | "energetic";
};

function msToFrame(ms: number, fps: number) {
  return Math.max(0, Math.round((ms / 1000) * fps));
}

function clampEndFrame(startFrame: number, endFrame: number) {
  return endFrame > startFrame ? endFrame : startFrame + 1;
}

export function buildCleanKnowledgeTalkRemotionProps(input: {
  title: string;
  analysis: TranscriptAnalysis;
  fps?: number;
  speaker?: string;
  cta?: string;
  accentColor?: string;
  waveformStyle?: CleanKnowledgeTalkRemotionProps["waveformStyle"];
}) {
  const fps = input.fps ?? 30;
  const speaker = input.speaker?.trim() || "John × Atlas";
  const accentColor = input.accentColor?.trim() || "#ff7a59";
  const waveformStyle = input.waveformStyle ?? "focused";
  const title = input.title.trim() || input.analysis.topic || "未命名知识口播";
  const hook = input.analysis.standoutQuotes[0]?.text?.trim()
    || input.analysis.summary.trim()
    || input.analysis.topic.trim()
    || title;
  const maxEndMs = Math.max(
    1000,
    ...input.analysis.chapters.map((chapter) => chapter.endMs),
    ...input.analysis.standoutQuotes.map((quote) => quote.endMs),
  );
  const runtimeLabel = `${Math.max(1, Math.round(maxEndMs / 1000))}s · 9:16 · CleanKnowledgeTalk`;

  return {
    title,
    speaker,
    hook,
    topicLabel: input.analysis.topic.trim() || "知识口播包装模板",
    accentColor,
    runtimeLabel,
    chapters: input.analysis.chapters.map((chapter) => {
      const startFrame = msToFrame(chapter.startMs, fps);
      const endFrame = clampEndFrame(startFrame, msToFrame(chapter.endMs, fps));
      return {
        title: chapter.title.trim() || "未命名章节",
        summary: chapter.summary.trim() || chapter.title.trim() || "暂无章节摘要",
        startFrame,
        endFrame,
      };
    }),
    standoutQuotes: input.analysis.standoutQuotes.map((quote) => {
      const startFrame = msToFrame(quote.startMs, fps);
      const endFrame = clampEndFrame(startFrame, msToFrame(quote.endMs, fps));
      return {
        text: quote.text.trim() || "暂无金句",
        reason: quote.reason.trim() || "用于模板强化重点表达。",
        startFrame,
        endFrame,
      };
    }),
    captionCues: input.analysis.standoutQuotes.map((quote) => {
      const startFrame = msToFrame(quote.startMs, fps);
      const endFrame = clampEndFrame(startFrame, msToFrame(quote.endMs, fps));
      return {
        text: quote.text.trim() || "暂无字幕",
        startFrame,
        endFrame,
      };
    }),
    cta: input.cta?.trim() || "下一步将接入真实 raw-video renderer 输出链路。",
    speakerFootnote: "由 transcript analysis 自动驱动的第一版知识口播包装 props",
    waveformStyle,
  } satisfies CleanKnowledgeTalkRemotionProps;
}

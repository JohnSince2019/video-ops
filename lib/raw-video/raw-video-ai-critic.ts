import { promises as fs } from "node:fs";
import path from "node:path";

import type { RawVideoEdl } from "./edl-schema.js";
import type { EditIntentOptions } from "./edit-intent-options.js";
import type { RawVideoQualityGateReport } from "./raw-video-quality-gate.js";
import type { TranscriptAnalysis } from "./transcript-analyzer.js";
import type { RawSubtitleTimeline } from "./subtitle-timeline.js";

export type RawVideoCriticCheckKey = "hook" | "subtitle_naturalness" | "semantic_integrity";

export type RawVideoCriticCheck = {
  key: RawVideoCriticCheckKey;
  passed: boolean;
  score: number;
  summary: string;
  evidence: string[];
  recommendation: string;
};

export type RawVideoCriticReport = {
  version: "raw-video-ai-critic-v1";
  reportPath?: string;
  providerMetadata: {
    stage: "analysis";
    provider: "raw-video-ai-critic";
    mode: "primary";
  };
  overallScore: number;
  overallPassed: boolean;
  checks: RawVideoCriticCheck[];
};

function normalizeScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function pickHookCheck(input: {
  analysis: TranscriptAnalysis;
  editIntentOptions?: EditIntentOptions;
}) {
  const firstQuote = input.analysis.standoutQuotes[0]?.text?.trim() ?? "";
  const hookType = input.editIntentOptions?.hookType ?? "direct_problem";
  const evidence = [
    firstQuote ? `首条金句候选：${firstQuote}` : "当前没有提取到可用金句候选。",
    `当前 Hook 策略：${hookType}`,
  ];

  let score = 52;
  let passed = false;
  let summary = "开场 Hook 需要增强。";
  let recommendation = "优先把最强问题句或反差句前置，确保前 3 秒能明确抓住用户。";

  if (firstQuote.length >= 12 && firstQuote.length <= 36) {
    score += 20;
  } else if (firstQuote.length > 0) {
    score += 8;
  }

  if (hookType === "counterintuitive" && /不是.+而是/.test(firstQuote)) {
    score += 20;
  } else if (hookType === "direct_problem" && /(为什么|怎么|问题|肩疼|不会|缺)/.test(firstQuote)) {
    score += 18;
  } else if (hookType === "result_first" && /(结果|先说|直接|关键|核心)/.test(firstQuote)) {
    score += 18;
  }

  if (input.analysis.standoutQuotes.length >= 2) {
    score += 8;
    evidence.push(`共提取 ${input.analysis.standoutQuotes.length} 条金句候选，可支撑包装复用。`);
  }

  score = normalizeScore(score);
  if (score >= 70) {
    passed = true;
    summary = "开场 Hook 具备记忆点。";
    recommendation = "保留当前主钩子，后续只需要在字幕和标题条里继续放大记忆点。";
  }

  return {
    key: "hook" as const,
    passed,
    score,
    summary,
    evidence,
    recommendation,
  };
}

function pickSubtitleNaturalnessCheck(input: {
  subtitleTimeline: RawSubtitleTimeline;
  qualityGate?: RawVideoQualityGateReport;
}) {
  const cueCount = input.subtitleTimeline.cueCount;
  const maxCueLength = input.subtitleTimeline.cues.reduce((max, cue) => Math.max(max, cue.text.length), 0);
  const veryShortCueCount = input.subtitleTimeline.cues.filter((cue) => cue.text.trim().length <= 3).length;
  const overflowBlocked = input.qualityGate?.checks.find((item) => item.key === "subtitle_safe_area")?.passed === false;

  const evidence = [
    `字幕条数：${cueCount}`,
    `最长单条字幕长度：${maxCueLength}`,
    `超短字幕条数：${veryShortCueCount}`,
  ];

  let score = 56;
  let passed = false;
  let summary = "字幕自然度还不够稳。";
  let recommendation = "减少过短碎片字幕，尽量按自然表达断句，并控制单条信息密度。";

  if (cueCount >= 2) {
    score += 8;
  }
  if (maxCueLength >= 8 && maxCueLength <= 28) {
    score += 16;
  } else if (maxCueLength <= 40) {
    score += 8;
  }
  if (veryShortCueCount === 0) {
    score += 14;
  } else if (veryShortCueCount <= 1) {
    score += 6;
  } else {
    score -= 12;
    evidence.push("超短字幕过多，说明断句可能过碎。");
  }
  if (!overflowBlocked) {
    score += 14;
    evidence.push("质量门未发现字幕安全区阻塞。");
  } else {
    score -= 18;
    evidence.push("质量门发现字幕安全区问题。");
  }

  score = normalizeScore(score);
  if (score >= 72) {
    passed = true;
    summary = "字幕断句和可读性基本自然。";
    recommendation = "保持当前字幕节奏，后续只需结合包装模板再微调强调词。";
  }

  return {
    key: "subtitle_naturalness" as const,
    passed,
    score,
    summary,
    evidence,
    recommendation,
  };
}

function pickSemanticIntegrityCheck(input: {
  analysis: TranscriptAnalysis;
  edl?: RawVideoEdl;
}) {
  const removalCandidates = input.analysis.removalSuggestions.length;
  const removedClips = input.edl?.clips.filter((clip) => clip.reviewState === "removed").length ?? 0;
  const restoredClips = input.edl?.clips.filter((clip) => clip.reviewState === "restored").length ?? 0;
  const keptClips = input.edl?.clips.filter((clip) => (clip.reviewState ?? "kept") === "kept").length ?? 0;
  const evidence = [
    `删减建议数：${removalCandidates}`,
    `已删除片段数：${removedClips}`,
    `已恢复片段数：${restoredClips}`,
    `保留片段数：${keptClips}`,
  ];

  let score = 58;
  let passed = false;
  let summary = "删减后的语义完整性需要继续确认。";
  let recommendation = "优先检查删除片段是否切断因果、定义、结论，必要时恢复承上启下的关键句。";

  if (restoredClips > 0) {
    score += 12;
    evidence.push("存在恢复片段，说明误删风险被显式纠正过。");
  }
  if (removedClips <= removalCandidates + 1) {
    score += 14;
  } else {
    score -= 14;
    evidence.push("实际删除片段数明显高于分析建议，存在过剪风险。");
  }
  if (keptClips >= 2) {
    score += 10;
  } else if (keptClips === 0) {
    score -= 16;
    evidence.push("当前没有明确保留的核心片段，语义主线可能已经被剪散。");
  }
  if (input.analysis.chapters.length >= 2) {
    score += 10;
    evidence.push(`当前分析识别到 ${input.analysis.chapters.length} 个章节，语义结构可被追踪。`);
  } else {
    score -= 8;
    evidence.push("当前章节结构过少，删减后不容易证明主线仍然完整。");
  }

  score = normalizeScore(score);
  if (score >= 72) {
    passed = true;
    summary = "当前删减没有明显破坏语义主线。";
    recommendation = "保持当前删减强度，后续重点关注开头承接和结尾收束是否仍然完整。";
  }

  return {
    key: "semantic_integrity" as const,
    passed,
    score,
    summary,
    evidence,
    recommendation,
  };
}

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function inspectRawVideoAiCritic(input: {
  workspaceRoot: string;
  analysis: TranscriptAnalysis;
  subtitleTimeline: RawSubtitleTimeline;
  qualityGate?: RawVideoQualityGateReport;
  edl?: RawVideoEdl;
  editIntentOptions?: EditIntentOptions;
  reportPath?: string;
}) {
  const checks = [
    pickHookCheck({
      analysis: input.analysis,
      editIntentOptions: input.editIntentOptions,
    }),
    pickSubtitleNaturalnessCheck({
      subtitleTimeline: input.subtitleTimeline,
      qualityGate: input.qualityGate,
    }),
    pickSemanticIntegrityCheck({
      analysis: input.analysis,
      edl: input.edl,
    }),
  ];
  const overallScore = normalizeScore(checks.reduce((sum, check) => sum + check.score, 0) / checks.length);
  const overallPassed = checks.every((check) => check.passed);

  const report = {
    version: "raw-video-ai-critic-v1",
    reportPath: input.reportPath,
    providerMetadata: {
      stage: "analysis",
      provider: "raw-video-ai-critic",
      mode: "primary",
    },
    overallScore,
    overallPassed,
    checks,
  } satisfies RawVideoCriticReport;

  if (input.reportPath) {
    const absoluteReportPath = path.join(input.workspaceRoot, input.reportPath);
    await ensureDir(path.dirname(absoluteReportPath));
    await fs.writeFile(absoluteReportPath, JSON.stringify(report, null, 2), "utf8");
  }

  return report;
}

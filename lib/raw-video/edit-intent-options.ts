export const TRIM_INTENSITIES = ["conservative", "balanced", "aggressive"] as const;
export const PACKAGING_INTENSITIES = ["minimal", "standard", "high_energy"] as const;
export const SUBTITLE_STYLES = ["clean_readable", "highlight_keywords", "chapter_caption"] as const;
export const HOOK_TYPES = ["direct_problem", "counterintuitive", "result_first"] as const;
export const BROLL_STRATEGIES = ["none", "supporting_cutaways", "explanation_enhanced"] as const;
export const ASPECT_RATIO_STRATEGIES = ["portrait_primary", "landscape_safe", "platform_adaptive"] as const;
export const AUDIO_STRATEGIES = ["voice_first_clean", "voice_plus_light_bgm", "voice_plus_dynamic_bgm"] as const;
export const OUTPUT_PLATFORMS = ["wechat_channels", "xiaohongshu", "douyin", "bilibili"] as const;

export type TrimIntensity = (typeof TRIM_INTENSITIES)[number];
export type PackagingIntensity = (typeof PACKAGING_INTENSITIES)[number];
export type SubtitleStyleOption = (typeof SUBTITLE_STYLES)[number];
export type HookType = (typeof HOOK_TYPES)[number];
export type BrollStrategy = (typeof BROLL_STRATEGIES)[number];
export type AspectRatioStrategy = (typeof ASPECT_RATIO_STRATEGIES)[number];
export type AudioStrategy = (typeof AUDIO_STRATEGIES)[number];
export type OutputPlatform = (typeof OUTPUT_PLATFORMS)[number];

export type EditIntentOptions = {
  trimIntensity: TrimIntensity;
  packagingIntensity: PackagingIntensity;
  subtitleStyle: SubtitleStyleOption;
  hookType: HookType;
  brollStrategy: BrollStrategy;
  aspectRatioStrategy: AspectRatioStrategy;
  audioStrategy: AudioStrategy;
  outputPlatforms: OutputPlatform[];
};

export type EditIntentRecommendation = {
  options: EditIntentOptions;
  reasons: {
    trimIntensity: string;
    packagingIntensity: string;
    subtitleStyle: string;
    hookType: string;
    brollStrategy: string;
    aspectRatioStrategy: string;
    audioStrategy: string;
    outputPlatforms: string;
  };
};

export function buildDefaultEditIntentOptions(): EditIntentOptions {
  return {
    trimIntensity: "balanced",
    packagingIntensity: "standard",
    subtitleStyle: "clean_readable",
    hookType: "direct_problem",
    brollStrategy: "supporting_cutaways",
    aspectRatioStrategy: "platform_adaptive",
    audioStrategy: "voice_first_clean",
    outputPlatforms: ["wechat_channels", "xiaohongshu", "douyin", "bilibili"],
  };
}

function includesValue<T extends readonly string[]>(options: T, value: string): value is T[number] {
  return (options as readonly string[]).includes(value);
}

export function normalizeEditIntentOptions(
  input?: Partial<EditIntentOptions> | null,
): EditIntentOptions {
  const defaults = buildDefaultEditIntentOptions();
  const outputPlatforms = Array.isArray(input?.outputPlatforms)
    ? input!.outputPlatforms.filter((item): item is OutputPlatform => includesValue(OUTPUT_PLATFORMS, item))
    : defaults.outputPlatforms;

  return {
    trimIntensity:
      typeof input?.trimIntensity === "string" && includesValue(TRIM_INTENSITIES, input.trimIntensity)
        ? input.trimIntensity
        : defaults.trimIntensity,
    packagingIntensity:
      typeof input?.packagingIntensity === "string" && includesValue(PACKAGING_INTENSITIES, input.packagingIntensity)
        ? input.packagingIntensity
        : defaults.packagingIntensity,
    subtitleStyle:
      typeof input?.subtitleStyle === "string" && includesValue(SUBTITLE_STYLES, input.subtitleStyle)
        ? input.subtitleStyle
        : defaults.subtitleStyle,
    hookType:
      typeof input?.hookType === "string" && includesValue(HOOK_TYPES, input.hookType)
        ? input.hookType
        : defaults.hookType,
    brollStrategy:
      typeof input?.brollStrategy === "string" && includesValue(BROLL_STRATEGIES, input.brollStrategy)
        ? input.brollStrategy
        : defaults.brollStrategy,
    aspectRatioStrategy:
      typeof input?.aspectRatioStrategy === "string" &&
      includesValue(ASPECT_RATIO_STRATEGIES, input.aspectRatioStrategy)
        ? input.aspectRatioStrategy
        : defaults.aspectRatioStrategy,
    audioStrategy:
      typeof input?.audioStrategy === "string" && includesValue(AUDIO_STRATEGIES, input.audioStrategy)
        ? input.audioStrategy
        : defaults.audioStrategy,
    outputPlatforms: outputPlatforms.length > 0 ? outputPlatforms : defaults.outputPlatforms,
  };
}

export function summarizeEditIntentOptions(options: EditIntentOptions) {
  return {
    trimLabel:
      options.trimIntensity === "conservative"
        ? "保守剪辑"
        : options.trimIntensity === "aggressive"
          ? "高压缩剪辑"
          : "平衡剪辑",
    packagingLabel:
      options.packagingIntensity === "minimal"
        ? "轻包装"
        : options.packagingIntensity === "high_energy"
          ? "高能包装"
          : "标准包装",
    subtitleLabel:
      options.subtitleStyle === "highlight_keywords"
        ? "关键词强调字幕"
        : options.subtitleStyle === "chapter_caption"
          ? "章节型字幕"
          : "清爽易读字幕",
    hookLabel:
      options.hookType === "counterintuitive"
        ? "反常识 Hook"
        : options.hookType === "result_first"
          ? "结果前置 Hook"
          : "直接问题 Hook",
    brollLabel:
      options.brollStrategy === "none"
        ? "不加 B-roll"
        : options.brollStrategy === "explanation_enhanced"
          ? "解释增强 B-roll"
          : "辅助切画面 B-roll",
    aspectRatioLabel:
      options.aspectRatioStrategy === "portrait_primary"
        ? "竖屏优先"
        : options.aspectRatioStrategy === "landscape_safe"
          ? "横屏安全"
          : "平台自适应",
    audioLabel:
      options.audioStrategy === "voice_plus_dynamic_bgm"
        ? "人声 + 动态 BGM"
        : options.audioStrategy === "voice_plus_light_bgm"
          ? "人声 + 轻 BGM"
          : "人声优先干净音频",
    platformLabel: options.outputPlatforms.join(" / "),
  };
}

export function recommendEditIntentOptions(input: {
  transcriptText: string;
  chapterCount?: number;
  standoutQuoteCount?: number;
  removalSuggestionCount?: number;
}): EditIntentRecommendation {
  const text = input.transcriptText.trim();
  const options = buildDefaultEditIntentOptions();

  if ((input.removalSuggestionCount ?? 0) >= 3) {
    options.trimIntensity = "aggressive";
  } else if ((input.removalSuggestionCount ?? 0) === 0) {
    options.trimIntensity = "conservative";
  }

  if ((input.chapterCount ?? 0) >= 3 || (input.standoutQuoteCount ?? 0) >= 2) {
    options.packagingIntensity = "standard";
    options.subtitleStyle = "chapter_caption";
    options.hookType = "result_first";
  }

  if (text.includes("为什么") || text.includes("问题") || text.includes("怎么")) {
    options.hookType = "direct_problem";
  }

  if (text.includes("不是") && text.includes("而是")) {
    options.hookType = "counterintuitive";
  }

  if ((input.chapterCount ?? 0) >= 2) {
    options.brollStrategy = "explanation_enhanced";
  }

  if (text.includes("演示") || text.includes("操作") || text.includes("流程")) {
    options.aspectRatioStrategy = "platform_adaptive";
    options.brollStrategy = "supporting_cutaways";
  }

  if ((input.standoutQuoteCount ?? 0) >= 2) {
    options.audioStrategy = "voice_plus_light_bgm";
  }

  return {
    options,
    reasons: {
      trimIntensity:
        options.trimIntensity === "aggressive"
          ? "当前 transcript 里可压缩片段较多，适合更积极地收紧节奏。"
          : options.trimIntensity === "conservative"
            ? "当前 transcript 删除建议较少，先保持保守剪辑，避免误删关键信息。"
            : "内容有一定信息密度，也保留了自然表达空间，先用平衡剪辑最稳。",
      packagingIntensity:
        options.packagingIntensity === "standard"
          ? "当前内容已经具备章节和重点表达，适合标准包装来帮助理解。"
          : "当前内容更适合轻包装，避免形式感盖过信息本身。",
      subtitleStyle:
        options.subtitleStyle === "chapter_caption"
          ? "内容具备章节结构，用章节型字幕更利于快速理解。"
          : options.subtitleStyle === "highlight_keywords"
            ? "内容适合通过关键词强调来强化记忆点。"
            : "当前内容以可读性优先，先保持清爽字幕最稳。",
      hookType:
        options.hookType === "counterintuitive"
          ? "文案存在“不是…而是…”的反差结构，适合反常识 Hook。"
          : options.hookType === "result_first"
            ? "章节和结论比较明确，适合先抛结果再展开。"
            : "当前内容以问题导入更自然，先用直接问题 Hook。",
      brollStrategy:
        options.brollStrategy === "explanation_enhanced"
          ? "内容有多段解释和章节，适合加入解释增强型 B-roll。"
          : options.brollStrategy === "supporting_cutaways"
            ? "内容里包含流程或演示信息，适合用辅助切画面支撑理解。"
            : "当前内容以口播主体为主，不建议强行添加 B-roll。",
      aspectRatioStrategy:
        options.aspectRatioStrategy === "platform_adaptive"
          ? "当前目标是多平台分发，建议用平台自适应策略。"
          : options.aspectRatioStrategy === "portrait_primary"
            ? "当前内容更偏短视频主阵地，建议以竖屏优先。"
            : "当前内容需要兼顾横屏安全区域，建议保留横屏安全策略。",
      audioStrategy:
        options.audioStrategy === "voice_plus_light_bgm"
          ? "内容里已有多个重点表达，轻 BGM 可以提气但不干扰理解。"
          : options.audioStrategy === "voice_plus_dynamic_bgm"
            ? "内容节奏偏强，适合动态 BGM 带动情绪。"
            : "当前内容以信息清晰度优先，先保持人声优先的干净音频。",
      outputPlatforms: "当前 raw-video P0 仍以多平台复用为目标，默认保留微信视频号 / 小红书 / 抖音 / B站。",
    },
  };
}

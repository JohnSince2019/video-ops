import {
  CLEAN_KNOWLEDGE_TALK_DEFAULT_PROPS,
  WAVEFORM_STYLES,
  type WaveformStyle,
  type CleanKnowledgeTalkCaptionCue,
  type CleanKnowledgeTalkChapter,
  type CleanKnowledgeTalkProps,
  type CleanKnowledgeTalkQuote,
} from "./clean-knowledge-talk-props";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeFrame(value: unknown, fallback: number) {
  return Number.isFinite(value) ? Math.max(0, Math.round(Number(value))) : fallback;
}

function normalizeFrameRange<T extends {startFrame: number; endFrame: number}>(item: T): T {
  if (item.endFrame > item.startFrame) {
    return item;
  }

  return {
    ...item,
    endFrame: item.startFrame + 1,
  };
}

function normalizeChapter(value: unknown, fallback: CleanKnowledgeTalkChapter): CleanKnowledgeTalkChapter {
  if (!isObject(value)) {
    return fallback;
  }

  return normalizeFrameRange({
    title: normalizeText(value.title, fallback.title),
    summary: normalizeText(value.summary, fallback.summary),
    startFrame: normalizeFrame(value.startFrame, fallback.startFrame),
    endFrame: normalizeFrame(value.endFrame, fallback.endFrame),
  });
}

function normalizeQuote(value: unknown, fallback: CleanKnowledgeTalkQuote): CleanKnowledgeTalkQuote {
  if (!isObject(value)) {
    return fallback;
  }

  return normalizeFrameRange({
    text: normalizeText(value.text, fallback.text),
    reason: normalizeText(value.reason, fallback.reason),
    startFrame: normalizeFrame(value.startFrame, fallback.startFrame),
    endFrame: normalizeFrame(value.endFrame, fallback.endFrame),
  });
}

function normalizeCue(value: unknown, fallback: CleanKnowledgeTalkCaptionCue): CleanKnowledgeTalkCaptionCue {
  if (!isObject(value)) {
    return fallback;
  }

  return normalizeFrameRange({
    text: normalizeText(value.text, fallback.text),
    startFrame: normalizeFrame(value.startFrame, fallback.startFrame),
    endFrame: normalizeFrame(value.endFrame, fallback.endFrame),
  });
}

export type CleanKnowledgeTalkPropsValidationResult =
  | {valid: true; value: CleanKnowledgeTalkProps}
  | {valid: false; errors: string[]};

export function normalizeCleanKnowledgeTalkProps(input: unknown): CleanKnowledgeTalkProps {
  const fallback = CLEAN_KNOWLEDGE_TALK_DEFAULT_PROPS;
  const source = isObject(input) ? input : {};

  const waveformStyle: WaveformStyle =
    typeof source.waveformStyle === "string" && WAVEFORM_STYLES.includes(source.waveformStyle as WaveformStyle)
      ? (source.waveformStyle as WaveformStyle)
      : fallback.waveformStyle;

  const chapters = Array.isArray(source.chapters) && source.chapters.length > 0
    ? source.chapters.map((chapter, index) => normalizeChapter(chapter, fallback.chapters[index] ?? fallback.chapters.at(-1)!))
    : fallback.chapters;
  const standoutQuotes = Array.isArray(source.standoutQuotes) && source.standoutQuotes.length > 0
    ? source.standoutQuotes.map((quote, index) => normalizeQuote(quote, fallback.standoutQuotes[index] ?? fallback.standoutQuotes.at(-1)!))
    : fallback.standoutQuotes;
  const captionCues = Array.isArray(source.captionCues) && source.captionCues.length > 0
    ? source.captionCues.map((cue, index) => normalizeCue(cue, fallback.captionCues[index] ?? fallback.captionCues.at(-1)!))
    : fallback.captionCues;

  return {
    title: normalizeText(source.title, fallback.title),
    speaker: normalizeText(source.speaker, fallback.speaker),
    hook: normalizeText(source.hook, fallback.hook),
    topicLabel: normalizeText(source.topicLabel, fallback.topicLabel),
    accentColor: normalizeText(source.accentColor, fallback.accentColor),
    runtimeLabel: normalizeText(source.runtimeLabel, fallback.runtimeLabel),
    chapters,
    standoutQuotes,
    captionCues,
    cta: normalizeText(source.cta, fallback.cta),
    speakerFootnote: normalizeText(source.speakerFootnote, fallback.speakerFootnote),
    waveformStyle,
  };
}

export function validateCleanKnowledgeTalkProps(input: unknown): CleanKnowledgeTalkPropsValidationResult {
  const errors: string[] = [];

  if (!isObject(input)) {
    return {valid: false, errors: ["Props must be an object."]};
  }

  const requiredStrings = [
    "title",
    "speaker",
    "hook",
    "topicLabel",
    "accentColor",
    "runtimeLabel",
    "cta",
    "speakerFootnote",
  ] as const;
  for (const key of requiredStrings) {
    if (typeof input[key] !== "string" || input[key].trim() === "") {
      errors.push(`${key} must be a non-empty string.`);
    }
  }

  if (typeof input.waveformStyle !== "string" || !WAVEFORM_STYLES.includes(input.waveformStyle as (typeof WAVEFORM_STYLES)[number])) {
    errors.push(`waveformStyle must be one of: ${WAVEFORM_STYLES.join(", ")}.`);
  }

  const collections: Array<{
    key: "chapters" | "standoutQuotes" | "captionCues";
    min: number;
  }> = [
    {key: "chapters", min: 1},
    {key: "standoutQuotes", min: 1},
    {key: "captionCues", min: 1},
  ];

  for (const collection of collections) {
    const items = input[collection.key];
    if (!Array.isArray(items) || items.length < collection.min) {
      errors.push(`${collection.key} must contain at least ${collection.min} item(s).`);
      continue;
    }

    items.forEach((item, index) => {
      if (!isObject(item)) {
        errors.push(`${collection.key}[${index}] must be an object.`);
        return;
      }
      if (typeof item.startFrame !== "number" || !Number.isFinite(item.startFrame) || item.startFrame < 0) {
        errors.push(`${collection.key}[${index}].startFrame must be a non-negative number.`);
      }
      if (typeof item.endFrame !== "number" || !Number.isFinite(item.endFrame) || item.endFrame <= Number(item.startFrame ?? 0)) {
        errors.push(`${collection.key}[${index}].endFrame must be greater than startFrame.`);
      }

      const textKeys =
        collection.key === "chapters"
          ? (["title", "summary"] as const)
          : collection.key === "standoutQuotes"
            ? (["text", "reason"] as const)
            : (["text"] as const);
      for (const textKey of textKeys) {
        if (typeof item[textKey] !== "string" || item[textKey].trim() === "") {
          errors.push(`${collection.key}[${index}].${textKey} must be a non-empty string.`);
        }
      }
    });
  }

  if (errors.length > 0) {
    return {valid: false, errors};
  }

  return {valid: true, value: input as CleanKnowledgeTalkProps};
}

export function assertValidCleanKnowledgeTalkProps(input: unknown) {
  const result = validateCleanKnowledgeTalkProps(input);
  if (!result.valid) {
    throw new Error(`Invalid CleanKnowledgeTalk props: ${result.errors.join(" | ")}`);
  }

  return result.value;
}

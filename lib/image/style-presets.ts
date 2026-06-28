export const STYLE_PRESET_IDS = ["john_vertical_comic"] as const;
export type StylePresetId = (typeof STYLE_PRESET_IDS)[number];

export const PERSONA_PRESET_IDS = ["john_persona_v1"] as const;
export type PersonaPresetId = (typeof PERSONA_PRESET_IDS)[number];

export type StylePreset = {
  id: StylePresetId;
  label: string;
  chineseLabel: string;
  shortDescription: string;
  chineseDescription: string;
  chineseConsistencyNote: string;
  promptDirectives: string[];
};

export type PersonaPreset = {
  id: PersonaPresetId;
  label: string;
  chineseLabel: string;
  referenceImagePath: string;
  description: string;
  chineseDescription: string;
  chineseConsistencyNote: string;
  promptDirectives: string[];
};

const STYLE_PRESETS: Record<StylePresetId, StylePreset> = {
  john_vertical_comic: {
    id: "john_vertical_comic",
    label: "John Vertical Comic Explainer",
    chineseLabel: "John 竖屏讲解风格",
    shortDescription: "Warm vertical comic explainer scenes for short-form knowledge videos.",
    chineseDescription: "适合知识讲解短视频的暖色竖屏插画讲解风格。",
    chineseConsistencyNote: "所有场景都要保持竖屏讲解构图、下三分之一字幕安全区和统一的编辑插画气质。",
    promptDirectives: [
      "Use a vertical 9:16 storyboard composition for short-form video.",
      "Visual language: warm editorial comic illustration with clean line work and expressive facial acting.",
      "Keep strong foreground subject separation and leave safe space for subtitles at the lower third.",
      "Favor office, gym, home-office, and creator-workbench scenes that support a knowledge explainer format.",
      "Do not imitate platform UI, account avatars, watermarks, progress bars, or any screenshot chrome.",
    ],
  },
};

const PERSONA_PRESETS: Record<PersonaPresetId, PersonaPreset> = {
  john_persona_v1: {
    id: "john_persona_v1",
    label: "John Persona v1",
    chineseLabel: "John 专属人物形象",
    referenceImagePath: "assets/reference-images/john-persona-v1.png",
    description: "John's clean-cut comic persona for AI + productivity explainers.",
    chineseDescription: "面向 AI 与效率主题讲解的 John 专属插画人物形象。",
    chineseConsistencyNote: "不同场景里都必须还是同一个 John，只允许姿势、镜头和环境变化，不允许人物身份漂移。",
    promptDirectives: [
      "Main character is John's comic persona: black hair, sharp jawline, calm and focused expression, clean shirt styling.",
      "Keep the same hero identity consistent across scenes while changing pose, camera angle, and environment.",
      "The frame must be an original illustration inspired by the persona reference, not a direct copy of the source image.",
    ],
  },
};

export function getStylePreset(stylePresetId: string): StylePreset {
  const preset = STYLE_PRESETS[stylePresetId as StylePresetId];
  if (!preset) {
    throw new Error(`Unknown style preset "${stylePresetId}".`);
  }
  return preset;
}

export function getPersonaPreset(personaPresetId: string): PersonaPreset {
  const preset = PERSONA_PRESETS[personaPresetId as PersonaPresetId];
  if (!preset) {
    throw new Error(`Unknown persona preset "${personaPresetId}".`);
  }
  return preset;
}

export function formatStylePresetLabel(stylePresetId: string) {
  return getStylePreset(stylePresetId).chineseLabel;
}

export function formatPersonaPresetLabel(personaPresetId: string) {
  return getPersonaPreset(personaPresetId).chineseLabel;
}

export function buildVisualConsistencySummary(input: {
  stylePresetId: string;
  personaPresetId: string;
}) {
  const stylePreset = getStylePreset(input.stylePresetId);
  const personaPreset = getPersonaPreset(input.personaPresetId);

  return {
    styleLabel: stylePreset.chineseLabel,
    styleDescription: stylePreset.chineseDescription,
    styleConsistencyNote: stylePreset.chineseConsistencyNote,
    personaLabel: personaPreset.chineseLabel,
    personaDescription: personaPreset.chineseDescription,
    personaConsistencyNote: personaPreset.chineseConsistencyNote,
    combinedNarrative:
      `${stylePreset.chineseLabel}：${stylePreset.chineseConsistencyNote} ` +
      `${personaPreset.chineseLabel}：${personaPreset.chineseConsistencyNote}`,
  };
}

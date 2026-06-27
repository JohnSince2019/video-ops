export const VOICE_PRESET_IDS = [
  "male_coach_deep",
  "male_clear_teacher",
  "female_warm_narrator",
  "female_energetic_creator",
  "male_storytelling_soft",
] as const;

export type VoicePresetId = (typeof VOICE_PRESET_IDS)[number];

export type VoicePreset = {
  id: VoicePresetId;
  label: string;
  ttsVoice: string;
  gender: "male" | "female";
  tone: string;
  useCase: string;
  description: string;
};

export const CUSTOM_VOICE_MODE = "custom_reference" as const;
export type VoiceMode = VoicePresetId | typeof CUSTOM_VOICE_MODE;

const VOICE_PRESETS: Record<VoicePresetId, VoicePreset> = {
  male_coach_deep: {
    id: "male_coach_deep",
    label: "John Coach Male",
    ttsVoice: "zh-CN-male-yunze",
    gender: "male",
    tone: "steady",
    useCase: "fitness coaching / decisive explainers",
    description: "沉稳、有带练感，适合方法论和动作纠正类视频。",
  },
  male_clear_teacher: {
    id: "male_clear_teacher",
    label: "Clear Teacher Male",
    ttsVoice: "zh-CN-male-yunxiao",
    gender: "male",
    tone: "clear",
    useCase: "tutorial / framework explanation",
    description: "清爽、讲解感强，适合知识拆解和 SOP 教学。",
  },
  female_warm_narrator: {
    id: "female_warm_narrator",
    label: "Warm Narrator Female",
    ttsVoice: "zh-CN-female-yunyang",
    gender: "female",
    tone: "warm",
    useCase: "narration / calm storytelling",
    description: "温和自然，适合旁白和节奏平稳的说明类内容。",
  },
  female_energetic_creator: {
    id: "female_energetic_creator",
    label: "Energetic Creator Female",
    ttsVoice: "zh-CN-female-yunxi",
    gender: "female",
    tone: "energetic",
    useCase: "hook / creator style intro",
    description: "更有活力，适合开场钩子和短视频创作者表达。",
  },
  male_storytelling_soft: {
    id: "male_storytelling_soft",
    label: "Storytelling Male",
    ttsVoice: "zh-CN-male-yunfan",
    gender: "male",
    tone: "soft",
    useCase: "story / reflective recap",
    description: "偏柔和叙事，适合复盘、成长故事和经验分享。",
  },
};

export function getVoicePreset(voicePresetId: string): VoicePreset {
  const preset = VOICE_PRESETS[voicePresetId as VoicePresetId];
  if (!preset) {
    throw new Error(`Unknown voice preset "${voicePresetId}".`);
  }
  return preset;
}

export function listVoicePresets() {
  return VOICE_PRESET_IDS.map((id) => VOICE_PRESETS[id]);
}

export function isCustomVoiceMode(voiceMode: string) {
  return voiceMode === CUSTOM_VOICE_MODE;
}

export function getCustomVoiceAuthorizationNotice() {
  return "Only clone John's own voice or a voice with explicit permission. Do not clone unauthorized third-party voices.";
}

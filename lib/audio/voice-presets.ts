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
  providerId: "cosyvoice-mlx" | "f5-tts" | "melotts";
  gender: "male" | "female";
  tone: string;
  useCase: string;
  description: string;
  chineseLabel: string;
  chineseUseCase: string;
};

export const CUSTOM_VOICE_MODE = "custom_reference" as const;
export type VoiceMode = VoicePresetId | typeof CUSTOM_VOICE_MODE;

const VOICE_PRESETS: Record<VoicePresetId, VoicePreset> = {
  male_coach_deep: {
    id: "male_coach_deep",
    label: "John Coach Male",
    ttsVoice: "zh-CN-male-yunze",
    providerId: "cosyvoice-mlx",
    gender: "male",
    tone: "steady",
    useCase: "fitness coaching / decisive explainers",
    description: "沉稳、有带练感，适合方法论和动作纠正类视频。",
    chineseLabel: "男声教练沉稳",
    chineseUseCase: "训练讲解 / 方法论 / 动作纠错",
  },
  male_clear_teacher: {
    id: "male_clear_teacher",
    label: "Clear Teacher Male",
    ttsVoice: "zh-CN-male-yunxiao",
    providerId: "cosyvoice-mlx",
    gender: "male",
    tone: "clear",
    useCase: "tutorial / framework explanation",
    description: "清爽、讲解感强，适合知识拆解和 SOP 教学。",
    chineseLabel: "男声老师清晰",
    chineseUseCase: "知识拆解 / SOP 教学 / 框架说明",
  },
  female_warm_narrator: {
    id: "female_warm_narrator",
    label: "Warm Narrator Female",
    ttsVoice: "zh-CN-female-yunyang",
    providerId: "cosyvoice-mlx",
    gender: "female",
    tone: "warm",
    useCase: "narration / calm storytelling",
    description: "温和自然，适合旁白和节奏平稳的说明类内容。",
    chineseLabel: "女声旁白温和",
    chineseUseCase: "旁白总结 / 平稳叙述 / 节奏舒缓内容",
  },
  female_energetic_creator: {
    id: "female_energetic_creator",
    label: "Energetic Creator Female",
    ttsVoice: "zh-CN-female-yunxi",
    providerId: "f5-tts",
    gender: "female",
    tone: "energetic",
    useCase: "hook / creator style intro",
    description: "更有活力，适合开场钩子和短视频创作者表达。",
    chineseLabel: "女声创作者活力",
    chineseUseCase: "开场钩子 / 节奏快的创作者表达",
  },
  male_storytelling_soft: {
    id: "male_storytelling_soft",
    label: "Storytelling Male",
    ttsVoice: "zh-CN-male-yunfan",
    providerId: "melotts",
    gender: "male",
    tone: "soft",
    useCase: "story / reflective recap",
    description: "偏柔和叙事，适合复盘、成长故事和经验分享。",
    chineseLabel: "男声叙事柔和",
    chineseUseCase: "成长故事 / 复盘 / 经验分享",
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
  return "只能克隆 John 本人的声音，或你已经明确获得授权的声音。不要克隆未授权的第三方声音。";
}

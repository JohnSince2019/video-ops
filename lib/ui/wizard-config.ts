import {
  RENDER_PROFILES,
  SUPPORTED_PLATFORMS,
  type RenderProfile,
  type SupportedPlatform,
} from "../types/manifest.js";
import {
  PERSONA_PRESET_IDS,
  STYLE_PRESET_IDS,
  type PersonaPresetId,
  type StylePresetId,
} from "../image/style-presets.js";
import {
  CUSTOM_VOICE_MODE,
  VOICE_PRESET_IDS,
  getVoicePreset,
  isCustomVoiceMode,
  type VoiceMode,
  type VoicePresetId,
} from "../audio/voice-presets.js";
import {
  TTS_PROVIDER_IDS,
  getTtsProviderProfile,
  type TtsProviderProfile,
} from "../audio/tts-providers.js";

export const SCRIPT_MODES = ["markdown", "plain_text"] as const;

export type ScriptMode = (typeof SCRIPT_MODES)[number];

export type WizardConfigInput = {
  title?: string;
  platform?: string;
  renderProfile?: string;
  author?: string;
  ownerToken?: string;
  scriptText?: string;
  scriptMode?: string;
  stylePreset?: string;
  personaPreset?: string;
  voiceMode?: string;
  ttsProviderId?: string;
  customVoiceReference?: string;
};

export type WizardConfigDraft = {
  title: string;
  platform: SupportedPlatform;
  renderProfile: RenderProfile;
  author: string;
  ownerToken: string;
  scriptText: string;
  scriptMode: ScriptMode;
  stylePreset: StylePresetId;
  personaPreset: PersonaPresetId;
  voiceMode: VoiceMode;
  customVoiceReference?: string;
  ttsVoice: string;
  ttsProviderId: TtsProviderProfile["id"];
  estimatedScenes: number;
};

export type WizardSummary = {
  title: string;
  platform: SupportedPlatform;
  renderProfile: RenderProfile;
  author: string;
  scriptMode: ScriptMode;
  stylePreset: StylePresetId;
  personaPreset: PersonaPresetId;
  voiceMode: VoiceMode;
  customVoiceReference?: string;
  ttsVoice: string;
  ttsProviderId: TtsProviderProfile["id"];
  ttsProviderProfile: TtsProviderProfile;
  estimatedScenes: number;
  scriptCharacters: number;
  checklist: string[];
};

const DEFAULT_PLATFORM: SupportedPlatform = "douyin";
const DEFAULT_RENDER_PROFILE: RenderProfile = "standard";
const DEFAULT_SCRIPT_MODE: ScriptMode = "plain_text";
const DEFAULT_STYLE_PRESET: StylePresetId = "john_vertical_comic";
const DEFAULT_PERSONA_PRESET: PersonaPresetId = "john_persona_v1";
const DEFAULT_VOICE_MODE: VoicePresetId = "male_coach_deep";

function estimateScenes(scriptText: string, scriptMode: ScriptMode) {
  const normalized = scriptText.trim();
  if (!normalized) {
    return 0;
  }

  const explicitSceneMarkers = normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => /^scene\s+(\d+|[a-z0-9_-]+)/i.test(line)).length;

  if (explicitSceneMarkers > 0) {
    return explicitSceneMarkers;
  }

  if (scriptMode === "markdown") {
    const semanticHeadings = normalized
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => /^#{1,6}\s+/.test(line))
      .map((line) => line.replace(/^#{1,6}\s+/, "").trim())
      .filter(Boolean);

    const sceneLikeHeadings = semanticHeadings.filter((heading) =>
      /(开场|钩子|正文|结尾|cta|总结|步骤|场景|镜头)/i.test(heading),
    );

    if (sceneLikeHeadings.length > 0) {
      return sceneLikeHeadings.length;
    }

    if (semanticHeadings.length > 0) {
      return Math.max(1, Math.min(semanticHeadings.length, 5));
    }
  }

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (paragraphs.length > 1) {
    return paragraphs.length;
  }

  const sentences = normalized
    .split(/[。！？!?；;]+/u)
    .map((item) => item.trim())
    .filter(Boolean);

  return Math.max(1, sentences.length);
}

export function validateWizardConfig(input: WizardConfigInput) {
  const errors: string[] = [];
  const title = input.title?.trim() ?? "";
  const platform = input.platform?.trim() ?? DEFAULT_PLATFORM;
  const renderProfile = input.renderProfile?.trim() ?? DEFAULT_RENDER_PROFILE;
  const author = input.author?.trim() ?? "";
  const ownerToken = input.ownerToken?.trim() ?? "";
  const scriptText = input.scriptText?.trim() ?? "";
  const scriptMode = input.scriptMode?.trim() ?? DEFAULT_SCRIPT_MODE;
  const stylePreset = input.stylePreset?.trim() ?? DEFAULT_STYLE_PRESET;
  const personaPreset = input.personaPreset?.trim() ?? DEFAULT_PERSONA_PRESET;
  const voiceMode = input.voiceMode?.trim() ?? DEFAULT_VOICE_MODE;
  const requestedTtsProviderId = input.ttsProviderId?.trim();
  const customVoiceReference = input.customVoiceReference?.trim();

  if (!title) {
    errors.push("title is required");
  }

  if (!SUPPORTED_PLATFORMS.includes(platform as SupportedPlatform)) {
    errors.push(`platform must be one of: ${SUPPORTED_PLATFORMS.join(", ")}`);
  }

  if (!RENDER_PROFILES.includes(renderProfile as RenderProfile)) {
    errors.push(`renderProfile must be one of: ${RENDER_PROFILES.join(", ")}`);
  }

  if (!SCRIPT_MODES.includes(scriptMode as ScriptMode)) {
    errors.push(`scriptMode must be one of: ${SCRIPT_MODES.join(", ")}`);
  }

  if (!STYLE_PRESET_IDS.includes(stylePreset as StylePresetId)) {
    errors.push(`stylePreset must be one of: ${STYLE_PRESET_IDS.join(", ")}`);
  }

  if (!PERSONA_PRESET_IDS.includes(personaPreset as PersonaPresetId)) {
    errors.push(`personaPreset must be one of: ${PERSONA_PRESET_IDS.join(", ")}`);
  }

  const isPresetVoice = VOICE_PRESET_IDS.includes(voiceMode as VoicePresetId);
  if (!isPresetVoice && !isCustomVoiceMode(voiceMode)) {
    errors.push(`voiceMode must be one of: ${[...VOICE_PRESET_IDS, CUSTOM_VOICE_MODE].join(", ")}`);
  }

  if (isCustomVoiceMode(voiceMode) && !customVoiceReference) {
    errors.push("customVoiceReference is required when voiceMode is custom_reference");
  }

  if (requestedTtsProviderId && !TTS_PROVIDER_IDS.includes(requestedTtsProviderId as TtsProviderProfile["id"])) {
    errors.push(`ttsProviderId must be one of: ${TTS_PROVIDER_IDS.join(", ")}`);
  }

  const resolvedProviderId = requestedTtsProviderId
    || (isCustomVoiceMode(voiceMode) ? "cosyvoice-mlx" : getVoicePreset(voiceMode as VoicePresetId).providerId);

  if (isCustomVoiceMode(voiceMode)) {
    const providerProfile = getTtsProviderProfile(resolvedProviderId);
    if (!providerProfile.supportsVoiceCloning) {
      errors.push(`ttsProviderId "${resolvedProviderId}" does not support custom voice cloning`);
    }
  }

  if (!author) {
    errors.push("author is required");
  }

  if (!ownerToken) {
    errors.push("ownerToken is required");
  }

  if (!scriptText) {
    errors.push("scriptText is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function normalizeWizardConfig(input: WizardConfigInput): WizardConfigDraft {
  const validation = validateWizardConfig(input);
  if (!validation.valid) {
    throw new Error(`Invalid wizard config: ${validation.errors.join(" | ")}`);
  }

  const scriptMode = (input.scriptMode?.trim() ?? DEFAULT_SCRIPT_MODE) as ScriptMode;
  const scriptText = input.scriptText!.trim();
  const voiceMode = (input.voiceMode?.trim() ?? DEFAULT_VOICE_MODE) as VoiceMode;
  const ttsVoice = isCustomVoiceMode(voiceMode)
    ? "custom-reference-voice"
    : getVoicePreset(voiceMode).ttsVoice;
  const inferredTtsProviderId = isCustomVoiceMode(voiceMode)
    ? "cosyvoice-mlx"
    : getVoicePreset(voiceMode).providerId;
  const ttsProviderId = (input.ttsProviderId?.trim() || inferredTtsProviderId) as TtsProviderProfile["id"];

  return {
    title: input.title!.trim(),
    platform: (input.platform?.trim() ?? DEFAULT_PLATFORM) as SupportedPlatform,
    renderProfile: (input.renderProfile?.trim() ?? DEFAULT_RENDER_PROFILE) as RenderProfile,
    author: input.author!.trim(),
    ownerToken: input.ownerToken!.trim(),
    scriptText,
    scriptMode,
    stylePreset: (input.stylePreset?.trim() ?? DEFAULT_STYLE_PRESET) as StylePresetId,
    personaPreset: (input.personaPreset?.trim() ?? DEFAULT_PERSONA_PRESET) as PersonaPresetId,
    voiceMode,
    customVoiceReference: input.customVoiceReference?.trim() || undefined,
    ttsVoice,
    ttsProviderId,
    estimatedScenes: estimateScenes(scriptText, scriptMode),
  };
}

export function summarizeWizardConfig(input: WizardConfigDraft): WizardSummary {
  const providerProfile = getTtsProviderProfile(input.ttsProviderId);
  return {
    title: input.title,
    platform: input.platform,
    renderProfile: input.renderProfile,
    author: input.author,
    scriptMode: input.scriptMode,
    stylePreset: input.stylePreset,
    personaPreset: input.personaPreset,
    voiceMode: input.voiceMode,
    customVoiceReference: input.customVoiceReference,
    ttsVoice: input.ttsVoice,
    ttsProviderId: input.ttsProviderId,
    ttsProviderProfile: providerProfile,
    estimatedScenes: input.estimatedScenes,
    scriptCharacters: input.scriptText.length,
    checklist: [
      `Platform: ${input.platform}`,
      `Render profile: ${input.renderProfile}`,
      `Script mode: ${input.scriptMode}`,
      `Style preset: ${input.stylePreset}`,
      `Persona preset: ${input.personaPreset}`,
      `Voice mode: ${input.voiceMode}`,
      `TTS voice: ${input.ttsVoice}`,
      `TTS provider: ${input.ttsProviderId}`,
      `Custom voice reference: ${input.customVoiceReference ?? "none"}`,
      `Estimated scenes: ${input.estimatedScenes}`,
    ],
  };
}

export const SUPPORTED_PLATFORMS = ["douyin", "xiaohongshu", "videox"] as const;
export type SupportedPlatform = (typeof SUPPORTED_PLATFORMS)[number];

export const RENDER_PROFILES = ["draft", "standard", "high_quality"] as const;
export type RenderProfile = (typeof RENDER_PROFILES)[number];

export const SCRIPT_TYPES = ["narration", "caption", "dialogue"] as const;
export type ScriptType = (typeof SCRIPT_TYPES)[number];

export const SCENE_MOODS = ["inspiring", "calm", "exciting", "humorous"] as const;
export type SceneMood = (typeof SCENE_MOODS)[number];

export type SceneAudioConfig = {
  tts_voice: string;
  bgm?: string;
  reference_audio_path?: string;
};

export type ContentScene = {
  id: string;
  scene_hash: string;
  prompt_hash: string;
  duration_ms: number;
  narration: string;
  script_type: ScriptType;
  mood: SceneMood;
  visual_hint?: string;
  audio: SceneAudioConfig;
};

export type ContentMetadata = {
  created_at: string;
  author: string;
  copyright_license: string;
};

export type ContentManifest = {
  $schema: string;
  id: string;
  title: string;
  platform: SupportedPlatform;
  renderProfile: RenderProfile;
  scenes: ContentScene[];
  metadata: ContentMetadata;
};

import type { SceneMood } from "../types/manifest.js";

export type BgmTempo = "slow" | "mid" | "fast";

export type BgmPreset = {
  id: string;
  title: string;
  mood: SceneMood;
  tempo: BgmTempo;
  useCase: string;
  localPath: string;
};

export const BGM_PRESETS: BgmPreset[] = [
  { id: "upbeat-lofi-001", title: "Upbeat Lofi Sprint", mood: "inspiring", tempo: "mid", useCase: "productivity intro", localPath: "assets/bgm/upbeat-lofi-001.mp3" },
  { id: "focused-lofi-001", title: "Focused Flow", mood: "calm", tempo: "slow", useCase: "deep work narration", localPath: "assets/bgm/focused-lofi-001.mp3" },
  { id: "victory-pop-001", title: "Victory Pop", mood: "exciting", tempo: "fast", useCase: "success recap", localPath: "assets/bgm/victory-pop-001.mp3" },
  { id: "comic-bounce-001", title: "Comic Bounce", mood: "humorous", tempo: "mid", useCase: "light joke transition", localPath: "assets/bgm/comic-bounce-001.mp3" },
  { id: "zen-breath-001", title: "Zen Breath", mood: "calm", tempo: "slow", useCase: "reflection segment", localPath: "assets/bgm/zen-breath-001.mp3" },
  { id: "momentum-drive-001", title: "Momentum Drive", mood: "inspiring", tempo: "fast", useCase: "call to action", localPath: "assets/bgm/momentum-drive-001.mp3" },
  { id: "curious-steps-001", title: "Curious Steps", mood: "humorous", tempo: "mid", useCase: "story setup", localPath: "assets/bgm/curious-steps-001.mp3" },
  { id: "quiet-sunrise-001", title: "Quiet Sunrise", mood: "calm", tempo: "slow", useCase: "morning routine", localPath: "assets/bgm/quiet-sunrise-001.mp3" },
  { id: "spark-launch-001", title: "Spark Launch", mood: "exciting", tempo: "fast", useCase: "hook opening", localPath: "assets/bgm/spark-launch-001.mp3" },
  { id: "steady-progress-001", title: "Steady Progress", mood: "inspiring", tempo: "mid", useCase: "step-by-step walkthrough", localPath: "assets/bgm/steady-progress-001.mp3" },
  { id: "lab-groove-001", title: "Lab Groove", mood: "humorous", tempo: "mid", useCase: "experiment montage", localPath: "assets/bgm/lab-groove-001.mp3" },
  { id: "bright-board-001", title: "Bright Boardroom", mood: "inspiring", tempo: "mid", useCase: "business summary", localPath: "assets/bgm/bright-board-001.mp3" },
  { id: "pulse-run-001", title: "Pulse Run", mood: "exciting", tempo: "fast", useCase: "high-energy montage", localPath: "assets/bgm/pulse-run-001.mp3" },
  { id: "soft-rain-001", title: "Soft Rain Focus", mood: "calm", tempo: "slow", useCase: "quiet explanation", localPath: "assets/bgm/soft-rain-001.mp3" },
  { id: "cheerful-clicks-001", title: "Cheerful Clicks", mood: "humorous", tempo: "fast", useCase: "playful demo", localPath: "assets/bgm/cheerful-clicks-001.mp3" },
  { id: "hero-rise-001", title: "Hero Rise", mood: "inspiring", tempo: "fast", useCase: "big finish", localPath: "assets/bgm/hero-rise-001.mp3" },
  { id: "city-bounce-001", title: "City Bounce", mood: "exciting", tempo: "mid", useCase: "urban vlog pacing", localPath: "assets/bgm/city-bounce-001.mp3" },
  { id: "smile-loop-001", title: "Smile Loop", mood: "humorous", tempo: "slow", useCase: "friendly aside", localPath: "assets/bgm/smile-loop-001.mp3" },
  { id: "clarity-line-001", title: "Clarity Line", mood: "calm", tempo: "mid", useCase: "framework explanation", localPath: "assets/bgm/clarity-line-001.mp3" },
  { id: "ignite-now-001", title: "Ignite Now", mood: "exciting", tempo: "fast", useCase: "ending push", localPath: "assets/bgm/ignite-now-001.mp3" },
];

export function listBgmPresets() {
  return [...BGM_PRESETS];
}

export function findBgmPresets(filters: {
  mood?: SceneMood;
  useCase?: string;
}) {
  return BGM_PRESETS.filter((item) => {
    if (filters.mood && item.mood !== filters.mood) {
      return false;
    }
    if (filters.useCase && !item.useCase.toLowerCase().includes(filters.useCase.toLowerCase())) {
      return false;
    }
    return true;
  });
}

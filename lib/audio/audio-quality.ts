export type AudioQualityInput = {
  durationMs: number;
  averageAmplitude: number;
  silenceRatio: number;
};

export type AudioQualityResult = {
  passed: boolean;
  reasons: Array<"duration_too_short" | "amplitude_too_low" | "too_silent">;
  metrics: {
    durationMs: number;
    averageAmplitude: number;
    silenceRatio: number;
  };
};

const MIN_DURATION_MS = 1000;
const MIN_AMPLITUDE = 0.05;
const MAX_SILENCE_RATIO = 0.85;

export function validateAudioQuality(input: AudioQualityInput): AudioQualityResult {
  if (
    !Number.isFinite(input.durationMs) ||
    !Number.isFinite(input.averageAmplitude) ||
    !Number.isFinite(input.silenceRatio)
  ) {
    throw new Error("Audio quality input must contain finite numeric values.");
  }

  if (input.durationMs <= 0) {
    throw new Error("Audio duration must be a positive number.");
  }

  if (input.averageAmplitude < 0 || input.averageAmplitude > 1) {
    throw new Error("Audio amplitude must be between 0 and 1.");
  }

  if (input.silenceRatio < 0 || input.silenceRatio > 1) {
    throw new Error("Audio silence ratio must be between 0 and 1.");
  }

  const reasons: AudioQualityResult["reasons"] = [];

  if (input.durationMs < MIN_DURATION_MS) {
    reasons.push("duration_too_short");
  }

  if (input.averageAmplitude < MIN_AMPLITUDE) {
    reasons.push("amplitude_too_low");
  }

  if (input.silenceRatio > MAX_SILENCE_RATIO) {
    reasons.push("too_silent");
  }

  return {
    passed: reasons.length === 0,
    reasons,
    metrics: {
      durationMs: input.durationMs,
      averageAmplitude: input.averageAmplitude,
      silenceRatio: input.silenceRatio,
    },
  };
}

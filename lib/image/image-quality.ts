export type ImageQualityInput = {
  width: number;
  height: number;
  averageBrightness: number;
};

export type ImageQualityResult = {
  passed: boolean;
  reasons: Array<"dimension_too_small" | "too_dark" | "too_bright">;
  metrics: {
    width: number;
    height: number;
    averageBrightness: number;
  };
};

const MIN_DIMENSION = 256;
const MIN_BRIGHTNESS = 40;
const MAX_BRIGHTNESS = 215;

export function validateImageQuality(input: ImageQualityInput): ImageQualityResult {
  if (!Number.isFinite(input.width) || !Number.isFinite(input.height) || !Number.isFinite(input.averageBrightness)) {
    throw new Error("Image quality input must contain finite numeric values.");
  }

  if (input.width <= 0 || input.height <= 0) {
    throw new Error("Image dimensions must be positive numbers.");
  }

  if (input.averageBrightness < 0 || input.averageBrightness > 255) {
    throw new Error("Image brightness must be between 0 and 255.");
  }

  const reasons: ImageQualityResult["reasons"] = [];

  if (input.width < MIN_DIMENSION || input.height < MIN_DIMENSION) {
    reasons.push("dimension_too_small");
  }

  if (input.averageBrightness < MIN_BRIGHTNESS) {
    reasons.push("too_dark");
  }

  if (input.averageBrightness > MAX_BRIGHTNESS) {
    reasons.push("too_bright");
  }

  return {
    passed: reasons.length === 0,
    reasons,
    metrics: {
      width: input.width,
      height: input.height,
      averageBrightness: input.averageBrightness,
    },
  };
}

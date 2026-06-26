export type JobUsage = {
  gptImageCalls?: number;
  wanxCalls?: number;
  ttsDurationSecs?: number;
};

export type CostBreakdown = {
  gptImageUsd: number;
  wanxUsd: number;
  ttsUsd: number;
  totalUsd: number;
};

const GPT_IMAGE_CALL_USD = 0.04;
const WANX_CALL_USD = 0.015;
const TTS_SECOND_USD = 0.0002;

function roundUsd(value: number) {
  return Math.round(value * 10000) / 10000;
}

export function estimateJobCost(usage: JobUsage): CostBreakdown {
  const gptImageUsd = roundUsd((usage.gptImageCalls ?? 0) * GPT_IMAGE_CALL_USD);
  const wanxUsd = roundUsd((usage.wanxCalls ?? 0) * WANX_CALL_USD);
  const ttsUsd = roundUsd((usage.ttsDurationSecs ?? 0) * TTS_SECOND_USD);
  const totalUsd = roundUsd(gptImageUsd + wanxUsd + ttsUsd);

  return {
    gptImageUsd,
    wanxUsd,
    ttsUsd,
    totalUsd,
  };
}

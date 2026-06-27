import { validateAudioQuality } from "../lib/audio/audio-quality.ts";

const result = validateAudioQuality({
  durationMs: 800,
  averageAmplitude: 0.02,
  silenceRatio: 0.92,
});

console.log(JSON.stringify(result, null, 2));

import { validateImageQuality } from "../lib/image/image-quality.ts";

const result = validateImageQuality({
  width: 320,
  height: 180,
  averageBrightness: 28,
});

console.log(JSON.stringify(result, null, 2));

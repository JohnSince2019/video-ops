import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { TtsRunner } from "./cosyvoice-client.js";

const execFileAsync = promisify(execFile);
const EXEC_OPTIONS = { maxBuffer: 10 * 1024 * 1024 };

export async function detectMlxAudioAvailability(pythonBin = process.env.VIDEO_OPS_TTS_PYTHON || "python3") {
  try {
    const { stdout } = await execFileAsync(
      pythonBin,
      [
        "-c",
        [
          "import importlib.util",
          "print('1' if importlib.util.find_spec(\"mlx_audio\") else '0')",
        ].join(";"),
      ],
      EXEC_OPTIONS,
    );
    return stdout.trim() === "1";
  } catch {
    return false;
  }
}

export function createUnavailableMlxRunner(pythonBin = process.env.VIDEO_OPS_TTS_PYTHON || "python3"): TtsRunner {
  return async () => ({
    success: false,
    error: `mlx-audio is unavailable for ${pythonBin}`,
  });
}

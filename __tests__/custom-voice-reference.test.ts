import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import test from "node:test";

import {
  buildCustomVoiceReferenceAbsolutePath,
  saveCustomVoiceReference,
} from "../lib/audio/custom-voice-reference.js";

test("custom voice reference save writes audio bytes to a stable file path", async () => {
  const sample = Buffer.from("RIFFdemo", "utf8").toString("base64");
  const saved = await saveCustomVoiceReference({
    filename: "john-demo.wav",
    mimeType: "audio/wav",
    base64: sample,
  });

  const stat = await fs.stat(saved.absolutePath);
  assert.equal(saved.filename.endsWith(".wav"), true);
  assert.equal(saved.relativeUrl.includes("/api/custom-voice-reference/file/"), true);
  assert.equal(stat.size > 0, true);
  assert.equal(buildCustomVoiceReferenceAbsolutePath(saved.filename), saved.absolutePath);
});

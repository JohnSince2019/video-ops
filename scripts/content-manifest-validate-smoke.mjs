import fs from "node:fs";
import path from "node:path";

import {
  CONTENT_MANIFEST_SCHEMA_ID,
  validateContentManifest,
} from "../lib/validation/content-manifest-schema.ts";

const inputPath = process.argv[2];

const fallbackManifest = {
  $schema: CONTENT_MANIFEST_SCHEMA_ID,
  id: "manifest-smoke-001",
  title: "Smoke Validation Demo",
  platform: "douyin",
  renderProfile: "standard",
  scenes: [
    {
      id: "scene-001",
      scene_hash: "scene-hash-smoke-001",
      prompt_hash: "prompt-hash-smoke-001",
      duration_ms: 4000,
      narration: "先校验输入，再交给后面的模块。",
      script_type: "narration",
      mood: "inspiring",
      visual_hint: "流程图被高亮显示",
      audio: {
        tts_voice: "zh-CN-female-yunyang",
      },
    },
  ],
  metadata: {
    created_at: "2026-06-26T00:00:00.000Z",
    author: "John",
    copyright_license: "commercial",
  },
};

const manifest = inputPath
  ? JSON.parse(fs.readFileSync(path.resolve(process.cwd(), inputPath), "utf8"))
  : fallbackManifest;

const result = validateContentManifest(manifest);
console.log(JSON.stringify(result, null, 2));

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { attachPreviewArtifactsToSourceMetadata, generateSourceVideoPreviewArtifacts } from "../lib/raw-video/source-video-preview.js";
import { renderJobArtifacts } from "../lib/video/local-renderer.js";

const manifest = {
  $schema: "https://video-ops.example.com/manifest-v1.schema.json",
  id: "manifest-source-preview-test",
  title: "Source Preview Test",
  platform: "douyin" as const,
  renderProfile: "draft" as const,
  scenes: [
    {
      id: "scene-001",
      scene_hash: "scene-hash-001",
      prompt_hash: "prompt-hash-001",
      duration_ms: 1800,
      narration: "第一幕",
      script_type: "narration" as const,
      mood: "calm" as const,
      visual_hint: "测试画面一",
      audio: { tts_voice: "zh-CN-male-yunze" },
    },
  ],
  metadata: {
    created_at: new Date("2026-06-28T00:00:00.000Z").toISOString(),
    author: "John",
    copyright_license: "commercial",
  },
};

test("source-video preview generation creates proxy, thumbnail, and keyframes", async () => {
  const workspaceRoot = mkdtempSync(path.join(tmpdir(), "video-ops-source-preview-"));
  const fixture = await renderJobArtifacts({
    jobId: "job-source-preview-fixture",
    manifest,
    mode: "ffmpeg",
  });

  const sourceVideoPath = "output/jobs/job-source-preview-fixture/video.mp4";
  const absoluteSourcePath = path.join(workspaceRoot, sourceVideoPath);
  await import("node:fs/promises").then((fs) =>
    fs.mkdir(path.dirname(absoluteSourcePath), { recursive: true }).then(() => fs.copyFile(fixture.outputPackage.video.path, absoluteSourcePath)),
  );

  const previews = await generateSourceVideoPreviewArtifacts({
    workspaceRoot,
    sourceVideoPath,
    proxyPath: "output/jobs/job-source-preview-fixture/proxy/proxy.mp4",
    thumbnailPath: "output/jobs/job-source-preview-fixture/proxy/thumbnail.jpg",
    keyframesDir: "output/jobs/job-source-preview-fixture/frames/keyframes",
  });

  assert.equal(existsSync(path.join(workspaceRoot, previews.proxyPath)), true);
  assert.equal(existsSync(path.join(workspaceRoot, previews.thumbnailPath)), true);
  assert.equal(previews.keyframePaths.length > 0, true);
  assert.equal(existsSync(path.join(workspaceRoot, previews.keyframePaths[0]!)), true);
});

test("source-video preview metadata attachment persists preview artifact paths", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "video-ops-preview-meta-"));
  const metadataPath = path.join(dir, "source-video.json");
  const previews = {
    proxyPath: "output/jobs/job-preview/proxy/proxy.mp4",
    thumbnailPath: "output/jobs/job-preview/proxy/thumbnail.jpg",
    keyframePaths: ["output/jobs/job-preview/frames/keyframes/frame-001.jpg"],
  };

  await import("node:fs/promises").then((fs) =>
    fs.writeFile(metadataPath, JSON.stringify({ id: "sv-1", jobId: "job-1" }, null, 2), "utf8"),
  );

  const updated = await attachPreviewArtifactsToSourceMetadata(metadataPath, previews);
  const persisted = JSON.parse(readFileSync(metadataPath, "utf8"));

  assert.equal(updated.previewArtifacts.proxyPath, previews.proxyPath);
  assert.equal(updated.previewArtifacts.keyframePaths[0], previews.keyframePaths[0]);
  assert.equal(persisted.previewArtifacts.thumbnailPath, previews.thumbnailPath);
});

import assert from "node:assert/strict";
import {existsSync, mkdtempSync, readFileSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import test from "node:test";

import {buildJobAssetPaths} from "../lib/assets/job-assets.js";
import {renderRawVideoWithRemotion} from "../lib/raw-video/raw-video-renderer.js";

test("renderRawVideoWithRemotion renders a validated CleanKnowledgeTalk mp4 from transcript analysis", async () => {
  const workspaceRoot = mkdtempSync(path.join(tmpdir(), "video-ops-remotion-renderer-"));
  const jobId = "job-remotion-renderer";
  const outputPaths = buildJobAssetPaths(jobId);
  const projectRoot = process.cwd();

  const result = await renderRawVideoWithRemotion({
    workspaceRoot,
    remotionRoot: path.join(projectRoot, "remotion"),
    jobId,
    title: "你不是缺 AI 工具",
    transcriptAnalysis: {
      topic: "AI 高输出系统",
      summary: "把工作素材接住、整理、复用。",
      chapters: [
        {title: "问题识别", startMs: 0, endMs: 3200, summary: "先识别问题"},
        {title: "方法拆解", startMs: 3200, endMs: 7600, summary: "再给方法"},
      ],
      standoutQuotes: [
        {text: "你不是缺 AI 工具。", startMs: 600, endMs: 2600, reason: "用作 Hook"},
        {text: "你是缺一套高输出操作系统。", startMs: 3600, endMs: 6900, reason: "用作收束"},
      ],
      removalSuggestions: [],
      glossaryReplacements: [],
      providerMetadata: {stage: "analysis", provider: "raw-video-heuristic-analyzer", mode: "primary"},
    },
    outputPath: outputPaths.videoPath,
    propsPath: outputPaths.remotionPropsPath,
    metadataPath: outputPaths.remotionRenderMetadataPath,
  });

  assert.equal(result.jobId, jobId);
  assert.equal(result.compositionId, "CleanKnowledgeTalk");
  assert.equal(existsSync(path.join(workspaceRoot, result.outputPath)), true);
  assert.equal(existsSync(path.join(workspaceRoot, result.propsPath)), true);
  assert.equal(existsSync(path.join(workspaceRoot, result.metadataPath!)), true);
  assert.equal(result.probe.hasAudio, true);
  assert.equal(result.probe.hasVideo, true);
  assert.equal(result.probe.durationSec > 5, true);

  const props = JSON.parse(readFileSync(path.join(workspaceRoot, result.propsPath), "utf8"));
  assert.equal(props.title, "你不是缺 AI 工具");
  assert.equal(props.chapters.length, 2);
  assert.equal(props.standoutQuotes.length, 2);
  assert.equal(props.captionCues.length, 2);

  const metadata = JSON.parse(readFileSync(path.join(workspaceRoot, result.metadataPath!), "utf8"));
  assert.equal(metadata.compositionId, "CleanKnowledgeTalk");
  assert.equal(metadata.outputPath, outputPaths.videoPath);
  assert.equal(metadata.propsPath, outputPaths.remotionPropsPath);
});

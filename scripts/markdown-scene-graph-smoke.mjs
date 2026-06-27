import fs from "node:fs";
import path from "node:path";

import { parseMarkdownToSceneGraph, sceneGraphToJson } from "../lib/parser/markdown-scene-graph.ts";

const inputPath = process.argv[2];

const fallbackMarkdown = `
# Video Ops Markdown Demo
platform: douyin
renderProfile: draft
author: John
copyright_license: commercial

## Scene: Opening
duration_ms: 3500
script_type: narration
mood: inspiring
visual_hint: 创作者打开电脑开始规划今天的视频
tts_voice: zh-CN-female-yunyang
今天给你看一套可以直接复用的 AI 视频生产流程。
`;

const markdown = inputPath
  ? fs.readFileSync(path.resolve(process.cwd(), inputPath), "utf8")
  : fallbackMarkdown;

const sceneGraph = parseMarkdownToSceneGraph(markdown);
console.log(sceneGraphToJson(sceneGraph));

import fs from "node:fs";
import path from "node:path";

import { parseTextToSceneGraph } from "../lib/parser/text-fallback.ts";

const inputPath = process.argv[2];
const fallbackText = "先把高频重复动作抽出来。再让 AI 根据固定 SOP 自动执行。最后用人工验收把结果卡住。";

const input = inputPath
  ? fs.readFileSync(path.resolve(process.cwd(), inputPath), "utf8")
  : fallbackText;

const manifest = parseTextToSceneGraph(input, {
  title: "TXT Smoke Demo",
  author: "John",
});

console.log(JSON.stringify(manifest, null, 2));

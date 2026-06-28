import {access} from "node:fs/promises";
import {execFile} from "node:child_process";
import path from "node:path";
import {promisify} from "node:util";

const execFileAsync = promisify(execFile);

const workspaceRoot = process.cwd();
const remotionRoot = path.join(workspaceRoot, "remotion");
const outputPath = path.join(workspaceRoot, "tmp", "remotion-smoke", "clean-knowledge-talk.mp4");

await execFileAsync("npm", ["run", "typecheck"], {
  cwd: remotionRoot,
  maxBuffer: 20 * 1024 * 1024,
});

await execFileAsync("npm", ["run", "render:smoke"], {
  cwd: remotionRoot,
  maxBuffer: 20 * 1024 * 1024,
});

await access(outputPath);
console.log(JSON.stringify({outputPath}, null, 2));

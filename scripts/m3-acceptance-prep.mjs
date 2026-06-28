import assert from "node:assert/strict";
import path from "node:path";
import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { chromium } from "playwright";

const execFileAsync = promisify(execFile);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const fixturePath = path.join(repoRoot, "fixtures", "bench-press-shoulder-pain-script.txt");
const acceptanceDir = path.join(repoRoot, "tmp", "acceptance");
const appUrl = process.env.VIDEO_OPS_E2E_URL ?? "http://localhost:3003/";
const chromePath =
  process.env.CHROME_EXECUTABLE_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function ensureFixture() {
  const content = await fs.readFile(fixturePath, "utf8");
  assert.match(content, /title:\s*卧推肩疼/i, "Fixture script content mismatch");
  return fixturePath;
}

async function ensureAcceptanceDir() {
  await fs.mkdir(acceptanceDir, { recursive: true });
  return acceptanceDir;
}

async function checkServerHealth() {
  const response = await fetch(appUrl);
  assert.equal(response.ok, true, `App not reachable at ${appUrl}`);
  const html = await response.text();
  assert.match(html, /视频工作台|VideoOps/i, "Workbench HTML did not match expected page");
}

async function runWizardE2E() {
  let lastError = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const { stdout, stderr } = await execFileAsync("npm", ["run", "wizard:e2e"], {
        cwd: repoRoot,
        env: process.env,
        maxBuffer: 20 * 1024 * 1024,
      });

      const jsonMatches = [...stdout.matchAll(/\{\s*"ok":\s*(true|false)[\s\S]*?\n\}/g)];
      const lastJsonText = jsonMatches.at(-1)?.[0] ?? null;
      const parsed = lastJsonText ? JSON.parse(lastJsonText) : null;
      const previewMatch = stdout.match(/"videoSrc":\s*"([^"]+\.mp4)"/);
      return {
        stdout,
        stderr,
        attempt,
        previewVideoSrc: previewMatch?.[1] ?? null,
        parsedResult: parsed?.result ?? null,
      };
    } catch (error) {
      lastError = error;
      if (attempt === 2) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error("wizard:e2e failed unexpectedly");
}

async function refreshAcceptanceScreenshots() {
  const fixture = await fs.readFile(fixturePath, "utf8");
  const browser = await chromium.launch({
    headless: true,
    executablePath: chromePath,
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

  try {
    await page.goto(appUrl, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".step-item", { timeout: 10000 });
    const hasProviderSelectOnInitial = await page.locator("#ttsProviderIdVisible").count().catch(() => 0);
    const initialShot = await page.screenshot({ fullPage: true });
    await fs.writeFile(path.join(acceptanceDir, "workbench-initial.png"), initialShot);

    await page.locator("#scriptText").fill(fixture);
    await page.locator("#validateBtn").click();
    await page.waitForFunction(() => {
      const value = document.querySelector("#derivedTitle")?.textContent?.trim();
      return value && value !== "等待脚本解析";
    }, { timeout: 10000 });
    await page.goto(`${appUrl}?step=voice_generation`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('.voice-card[data-voice-mode="male_clear_teacher"] .voice-apply-btn', { timeout: 10000 });
    await page.locator("#ttsProviderIdVisible").selectOption("f5-tts");
    const selectedProviderBeforePreset = await page.locator("#ttsProviderIdVisible").inputValue();
    await page.locator('.voice-card[data-voice-mode="male_clear_teacher"] .voice-apply-btn').click();
    const selectedProviderAfterPreset = await page.locator("#ttsProviderId").inputValue();
    const createJobResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/jobs") && response.request().method() === "POST",
    );
    await page.locator("#createJobBtn").click();
    const createJobResponse = await createJobResponsePromise;
    const createJobPayload = await createJobResponse.json();
    assert.equal(createJobPayload.ok, true);
    const completedJobDetail = await page.waitForFunction(
      async (jobId) => {
        const response = await fetch(`/api/jobs/${jobId}`);
        if (!response.ok) return null;
        const detail = await response.json();
        return detail?.state === "COMPLETED" ? detail : null;
      },
      createJobPayload.job.id,
      { timeout: 60000 },
    ).then((handle) => handle.jsonValue());
    await page.goto(`${appUrl}?step=video_assembly`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".main-title h2", { timeout: 10000 });

    const completedShot = await page.screenshot({ fullPage: true });
    await fs.writeFile(path.join(acceptanceDir, "workbench-completed.png"), completedShot);
    return {
      hasProviderSelectOnInitial: Boolean(hasProviderSelectOnInitial),
      selectedProviderBeforePreset,
      selectedProviderAfterPreset,
      createdJobId: createJobPayload.job.id,
      completedJobState: completedJobDetail?.state ?? null,
      completedPreviewUrl: completedJobDetail?.previewUrl ?? null,
    };
  } finally {
    await browser.close();
  }
}

async function main() {
  const fixture = await ensureFixture();
  const acceptanceRoot = await ensureAcceptanceDir();
  await checkServerHealth();
  const result = await runWizardE2E();
  const screenshotMeta = await refreshAcceptanceScreenshots();

  const summary = {
    generatedAt: new Date().toISOString(),
    fixture,
    acceptanceRoot,
    appUrl,
    reranWizardE2E: true,
    wizardE2EAttempt: result.attempt,
    latestPreviewVideoSrc: result.previewVideoSrc,
    refreshedAcceptanceScreenshots: true,
    providerSelectionEvidence: screenshotMeta,
    screenshots: {
      initial: path.join(acceptanceRoot, "workbench-initial.png"),
      completed: path.join(acceptanceRoot, "workbench-completed.png"),
    },
    wizardE2ESummary: result.parsedResult
      ? {
          stepTitles: result.parsedResult.stepTitles ?? [],
        navigationChecks: result.parsedResult.navigationChecks ?? [],
        qualitySummary: result.parsedResult.qualitySummary ?? [],
        costSummary: result.parsedResult.costSummary ?? [],
        ttsStrategySummary: result.parsedResult.ttsStrategySummary ?? [],
        latestPreviewLinks: result.parsedResult.preview?.previewLinks ?? [],
      }
      : null,
  };

  await fs.writeFile(
    path.join(acceptanceRoot, "acceptance-report.json"),
    JSON.stringify(summary, null, 2),
  );

  console.log(JSON.stringify(summary, null, 2));
  if (result.stdout.trim()) {
    console.log(result.stdout.trim());
  }
  if (result.stderr.trim()) {
    console.error(result.stderr.trim());
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exitCode = 1;
});

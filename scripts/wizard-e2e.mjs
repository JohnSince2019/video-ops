import assert from "node:assert/strict";
import path from "node:path";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const APP_URL = process.env.VIDEO_OPS_E2E_URL ?? "http://localhost:3003/";
const CHROME_PATH =
  process.env.CHROME_EXECUTABLE_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const TEST_SCRIPT_PATH = path.resolve(scriptDir, "../fixtures/bench-press-shoulder-pain-script.txt");

async function text(page, selector) {
  return (await page.locator(selector).innerText()).trim();
}

async function activeStepTitle(page) {
  return page.locator(".main-title h2").innerText();
}

async function clickStepAndAssert(page, stepId, expectedTitle) {
  await page.locator(`.step-item[data-step-id="${stepId}"]`).click();
  await page.waitForFunction(
    (expected) => document.querySelector(".main-title h2")?.textContent?.trim() === expected,
    expectedTitle,
    { timeout: 10000 },
  );
}

async function assertPrevStep(page, expectedTitle) {
  const prev = page.locator("#prevStepBtn");
  await prev.click();
  await page.waitForFunction(
    (expected) => document.querySelector(".main-title h2")?.textContent?.trim() === expected,
    expectedTitle,
    { timeout: 10000 },
  );
}

async function waitForJsonJobState(page, expectedState, timeout = 15000) {
  await page.waitForFunction(
    ({ selector, expected }) => {
      const el = document.querySelector(selector);
      if (!el) return false;
      try {
        const payload = JSON.parse(el.textContent || "{}");
        return payload.state === expected;
      } catch {
        return false;
      }
    },
    { selector: "#jobStatus", expected: expectedState },
    { timeout },
  );
}

async function waitForEventContains(page, text, timeout = 30000) {
  await page.waitForFunction(
    (expected) => {
      return Array.from(document.querySelectorAll("#jobEvents .event-item-compact")).some((item) =>
        item.textContent?.includes(expected),
      );
    },
    text,
    { timeout },
  );
}

async function collectEventTexts(page) {
  return (await page.locator("#jobEvents .event-item-compact").allInnerTexts()).map((item) => item.trim());
}

async function main() {
  const TEST_SCRIPT = await fs.readFile(TEST_SCRIPT_PATH, "utf8");
  const customVoiceFixturePath = "/tmp/video-ops-custom-voice-e2e.wav";
  const customVoiceFixture = Buffer.from(
    "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
    "base64",
  );
  await fs.writeFile(customVoiceFixturePath, customVoiceFixture);

  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH,
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  const result = {
    appUrl: APP_URL,
    extracted: {},
    stepTitles: [],
    navigationChecks: [],
    voicePreview: {},
    stateTimeline: [],
    preview: {},
    qualitySummary: [],
    costSummary: [],
    ttsStrategySummary: [],
  };

  try {
    await page.goto(APP_URL, { waitUntil: "domcontentloaded" });
    console.log("[e2e] opened app");

    await page.waitForSelector(".step-item");
    console.log("[e2e] step rail visible");
    const stepTitles = await page.locator(".step-item .step-title").allInnerTexts();
    result.stepTitles = stepTitles.map((item) => item.trim());
    assert.deepEqual(result.stepTitles, ["素材收集", "分镜确认", "图像生成", "声音应用", "合成预览", "合规发布"]);
    assert.equal((await activeStepTitle(page)).trim(), "素材收集");

    const navigationPlan = [
      { stepId: "storyboard_generation", title: "分镜确认", backTo: "素材收集" },
      { stepId: "image_generation", title: "图像生成", backTo: "分镜确认" },
      { stepId: "voice_generation", title: "声音应用", backTo: "图像生成" },
      { stepId: "video_assembly", title: "合成预览", backTo: "声音应用" },
      { stepId: "preview_publish", title: "合规发布", backTo: "合成预览" },
    ];

    for (const item of navigationPlan) {
      await clickStepAndAssert(page, item.stepId, item.title);
      const currentUrl = page.url();
      assert.match(currentUrl, /\?step=/);
      result.navigationChecks.push({
        action: `goto:${item.stepId}`,
        title: (await activeStepTitle(page)).trim(),
        url: currentUrl,
      });
      await assertPrevStep(page, item.backTo);
      result.navigationChecks.push({
        action: `back-from:${item.stepId}`,
        title: (await activeStepTitle(page)).trim(),
        url: page.url(),
      });
    }

    await page.goto(APP_URL, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#scriptText");

    await page.locator("#scriptText").fill(TEST_SCRIPT);
    await page.locator("#loadDemoBtn").click();
    console.log("[e2e] script filled and demo loaded");

    await page.waitForFunction(() => {
      const title = document.querySelector("#derivedTitle")?.textContent?.trim();
      const status = document.querySelector("#status")?.textContent?.trim();
      return Boolean(title && title !== "等待脚本解析" && status === "草稿校验通过");
    }, { timeout: 30000 });
    console.log("[e2e] derived fields rendered");

    result.extracted = {
      title: await text(page, "#derivedTitle"),
      hook: await text(page, "#derivedHook"),
      summary: await text(page, "#derivedSummary"),
      duration: await text(page, "#derivedDuration"),
      scenes: await page.locator(".scene-row").count(),
      status: await text(page, "#status"),
      storyboardCards: await page.locator(".story-scene").count(),
    };

    assert.match(result.extracted.title, /卧推肩疼/);
    assert.equal(result.extracted.scenes, 3);
    assert.equal(result.extracted.duration, "30 秒");
    assert.ok(result.extracted.storyboardCards >= 3);

    await page.goto(`${APP_URL}?step=voice_generation`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('.voice-card[data-voice-mode="male_clear_teacher"]');
    await page.locator("#ttsProviderIdVisible").selectOption("f5-tts");
    await page.waitForFunction(() => {
      return document.querySelector("#ttsProviderId")?.value === "f5-tts";
    }, { timeout: 10000 });

    await page.locator('.voice-card[data-voice-mode="male_clear_teacher"] .voice-apply-btn').click();
    const selectedVoice = await page.locator("#voiceMode").inputValue();
    assert.equal(selectedVoice, "male_clear_teacher");
    assert.equal(await page.locator("#ttsProviderId").inputValue(), "cosyvoice-mlx");
    console.log("[e2e] voice applied");

    const previewResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/voice-preview?voiceMode=male_clear_teacher"),
    );
    await page.locator('.voice-card[data-voice-mode="male_clear_teacher"] .voice-preview-btn').click();
    const previewResponse = await previewResponsePromise;
    const previewPayload = await previewResponse.json();
    assert.equal(previewPayload.ok, true);
    assert.equal(previewPayload.isPreviewPlaceholder, false);
    assert.match(previewPayload.previewUrl, /\.wav$/);
    await waitForEventContains(page, "正在试听", 15000);
    result.voicePreview = {
      voiceMode: previewPayload.voiceMode,
      previewUrl: previewPayload.previewUrl,
      isPreviewPlaceholder: previewPayload.isPreviewPlaceholder,
      usedFallback: previewPayload.usedFallback,
    };
    console.log("[e2e] voice preview connected");

    const customUploadResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/custom-voice-reference") && response.request().method() === "POST",
    );
    await page.locator("#customVoiceFile").setInputFiles(customVoiceFixturePath);
    const customUploadResponse = await customUploadResponsePromise;
    const customUploadPayload = await customUploadResponse.json();
    assert.equal(customUploadPayload.ok, true);
    assert.match(customUploadPayload.filename, /\.wav$/);

    await page.locator("#applyCustomVoiceBtn").click();
    assert.equal(await page.locator("#voiceMode").inputValue(), "custom_reference");

    const customPreviewResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/voice-preview?voiceMode=custom_reference"),
    );
    await page.locator("#previewCustomVoiceBtn").click();
    const customPreviewResponse = await customPreviewResponsePromise;
    const customPreviewPayload = await customPreviewResponse.json();
    assert.equal(customPreviewPayload.ok, true);
    assert.equal(customPreviewPayload.voiceMode, "custom_reference");
    assert.match(customPreviewPayload.previewUrl, /\/api\/custom-voice-reference\/file\//);
    await waitForEventContains(page, "正在试听：自定义声音", 15000);
    result.voicePreview.customReference = {
      filename: customUploadPayload.filename,
      previewUrl: customPreviewPayload.previewUrl,
    };
    console.log("[e2e] custom voice upload and preview connected");

    const createJobResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/jobs") && response.request().method() === "POST",
    );
    await page.locator("#createJobBtn").click();
    console.log("[e2e] create job clicked");

    const createJobResponse = await createJobResponsePromise;
    const createJobPayload = await createJobResponse.json();
    assert.equal(createJobPayload.ok, true);
    assert.match(createJobPayload.job.id, /^job-/);

    await page.waitForFunction(
      (jobId) => {
        return document.querySelector("#currentTaskChip")?.textContent?.trim() === jobId;
      },
      createJobPayload.job.id,
      { timeout: 15000 },
    );
    console.log("[e2e] job id visible");

    await waitForEventContains(page, "解析中", 30000);
    await waitForEventContains(page, "COMPLETED", 30000);
    console.log("[e2e] completed event observed");

    const eventTexts = await collectEventTexts(page);
    const statesToObserve = ["解析中", "AI_PROCESSING", "ASSEMBLING", "RENDERING", "COMPLETED"];
    for (const state of statesToObserve) {
      assert.ok(eventTexts.some((item) => item.includes(state)), `missing event state: ${state}`);
      result.stateTimeline.push({
        state,
        jobStateChip: await text(page, "#jobStateChip"),
        jobStepChip: await text(page, "#jobStepChip"),
        activeStepLabels: (await page.locator(".step-item .step-status-label").allInnerTexts()).map((item) => item.trim()),
      });
    }

    await waitForJsonJobState(page, "COMPLETED", 30000);
    console.log("[e2e] job status completed");

    await page.waitForSelector("#previewStage video", { timeout: 30000 });
    console.log("[e2e] preview video rendered");
    await page.waitForFunction(() => {
      return Array.from(document.querySelectorAll("#jobQualitySummary .quality-item")).some((item) =>
        item.textContent?.includes("文件大小："),
      );
    }, { timeout: 30000 });
    await page.waitForFunction(() => {
      return Array.from(document.querySelectorAll("#jobCostSummary .quality-item")).some((item) =>
        item.textContent?.includes("总成本："),
      );
    }, { timeout: 30000 });
    await page.waitForFunction(() => {
      return Array.from(document.querySelectorAll("#jobTtsStrategySummary .quality-item")).some((item) =>
        item.textContent?.includes("TTS 引擎："),
      );
    }, { timeout: 30000 });
    const videoSrc = await page.locator("#previewStage video").getAttribute("src");
    const previewLinks = await page.locator("#previewLinks a").allInnerTexts();
    const finalStatusLabels = await page.locator(".step-item .step-status-label").allInnerTexts();

    result.preview = {
      videoSrc,
      previewLinks: previewLinks.map((item) => item.trim()),
      finalStatusLabels: finalStatusLabels.map((item) => item.trim()),
      currentTask: await text(page, "#currentTaskChip"),
      heroStatus: await text(page, "#heroStatus"),
      createdJobId: createJobPayload.job.id,
    };

    result.qualitySummary = (await page.locator("#jobQualitySummary .quality-item").allInnerTexts()).map((item) =>
      item.trim(),
    );
    result.costSummary = (await page.locator("#jobCostSummary .quality-item").allInnerTexts()).map((item) =>
      item.trim(),
    );
    result.ttsStrategySummary = (await page.locator("#jobTtsStrategySummary .quality-item").allInnerTexts()).map((item) =>
      item.trim(),
    );

    assert.ok(videoSrc && videoSrc.endsWith(".mp4"));
    assert.ok(result.preview.previewLinks.includes("打开 MP4"));
    assert.ok(result.preview.previewLinks.includes("下载 MP4"));
    assert.ok(result.preview.previewLinks.includes("元数据 JSON"));
    assert.deepEqual(result.preview.finalStatusLabels, ["已通过", "已通过", "已通过", "已通过", "已通过", "当前步骤"]);
    assert.ok(result.qualitySummary.some((item) => item.includes("文件大小：")), "missing file size summary");
    assert.ok(result.qualitySummary.some((item) => item.includes("时长：")), "missing duration summary");
    assert.ok(result.qualitySummary.some((item) => item.includes("分辨率：")), "missing resolution summary");
    assert.ok(result.qualitySummary.some((item) => item.includes("音频：")), "missing audio summary");
    assert.ok(result.qualitySummary.some((item) => item.includes("字幕：")), "missing subtitle summary");
    assert.ok(result.qualitySummary.some((item) => item.includes("渲染模式：")), "missing fallback summary");
    assert.ok(result.qualitySummary.some((item) => item.includes("合规：")), "missing compliance summary");
    assert.ok(result.costSummary.some((item) => item.includes("GPT Image：")), "missing gpt image cost");
    assert.ok(result.costSummary.some((item) => item.includes("Wanx：")), "missing wanx cost");
    assert.ok(result.costSummary.some((item) => item.includes("TTS：")), "missing tts cost");
    assert.ok(result.costSummary.some((item) => item.includes("总成本：")), "missing total cost");
    assert.ok(result.ttsStrategySummary.some((item) => item.includes("声音模式：")), "missing tts voice mode summary");
    assert.ok(result.ttsStrategySummary.some((item) => item.includes("TTS 引擎：")), "missing tts provider summary");
    assert.ok(result.ttsStrategySummary.some((item) => item.includes("音色策略：")), "missing tts cloning summary");
    assert.ok(result.ttsStrategySummary.some((item) => item.includes("部署策略：")), "missing tts deployment summary");

    for (const item of [
      { stepId: "asset_intake", title: "素材收集" },
      { stepId: "storyboard_generation", title: "分镜确认" },
      { stepId: "image_generation", title: "图像生成" },
      { stepId: "voice_generation", title: "声音应用" },
      { stepId: "video_assembly", title: "合成预览" },
      { stepId: "preview_publish", title: "合规发布" },
    ]) {
      console.log("[e2e] navigating to step", item.stepId);
      await page.goto(`${APP_URL}${item.stepId === "asset_intake" ? "" : `?step=${item.stepId}`}`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".main-title h2");
      assert.equal((await activeStepTitle(page)).trim(), item.title);
    }

    console.log(JSON.stringify({ ok: true, result }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : null,
  }, null, 2));
  process.exitCode = 1;
});

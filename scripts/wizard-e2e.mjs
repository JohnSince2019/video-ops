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

async function createCompletedJob(page) {
  const createJobResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/jobs") && response.request().method() === "POST",
  );
  await page.locator("#createJobBtn").click();
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

  await waitForJsonJobState(page, "COMPLETED", 30000);
  return createJobPayload;
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
    gatePanels: {},
    voicePreview: {},
    stateTimeline: [],
    preview: {},
    qualitySummary: [],
    costSummary: [],
    ttsStrategySummary: [],
    jobsDashboard: {},
  };

  try {
    const resetResponse = await fetch(new URL("/api/dev/reset-jobs", APP_URL), { method: "POST" });
    assert.equal(resetResponse.ok, true);

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
    await page.locator("#validateBtn").click();
    console.log("[e2e] script filled and validation triggered");

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
      titleInputValue: await page.locator("#title").inputValue(),
      authorInputValue: await page.locator("#author").inputValue(),
      ownerTokenValue: await page.locator("#ownerToken").inputValue(),
    };

    assert.match(result.extracted.title, /卧推肩疼/);
    assert.equal(result.extracted.scenes, 3);
    assert.equal(result.extracted.duration, "30 秒");
    assert.ok(result.extracted.storyboardCards >= 3);
    assert.match(result.extracted.titleInputValue, /卧推肩疼/);
    assert.equal(result.extracted.authorInputValue, "John");
    assert.equal(result.extracted.ownerTokenValue, "john-ai-lab");

    result.gatePanels.assetIntake = {
      sectionTitles: (await page.locator(".gate-card").nth(1).locator(".mini-section-title").allInnerTexts()).map((item) => item.trim()),
      currentVoiceRoute: await text(page, "#activeTtsRouteLabel"),
      activePlatformSummary: await text(page, "#visiblePlatformSummaryLabel"),
      firstSceneLabels: (await page.locator(".scene-row").first().locator(".scene-row-label").allInnerTexts()).map((item) => item.trim()),
      firstStoryboardConsistencyText: await page.locator(".story-scene").first().innerText(),
    };
    assert.ok(result.gatePanels.assetIntake.sectionTitles.includes("当前门槛"));
    assert.ok(result.gatePanels.assetIntake.sectionTitles.includes("当前已完成"));
    assert.match(result.gatePanels.assetIntake.currentVoiceRoute, /路线/);
    assert.match(result.gatePanels.assetIntake.activePlatformSummary, /微信视频号|小红书|抖音/);
    assert.deepEqual(result.gatePanels.assetIntake.firstSceneLabels, ["这一段的核心表达", "观众会看到什么", "建议占用时长"]);
    assert.match(result.gatePanels.assetIntake.firstStoryboardConsistencyText, /统一风格：John 竖屏讲解风格 \/ John 专属人物形象/);
    assert.match(result.gatePanels.assetIntake.firstStoryboardConsistencyText, /一致性规则：/);

    await page.goto(`${APP_URL}?step=voice_generation`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('.voice-card[data-voice-mode="male_clear_teacher"]');
    result.gatePanels.voiceGeneration = {
      voiceRole: await text(page, "#activeVoiceRoleLabel"),
      voicePreviewCapability: await text(page, "#activeVoicePreviewCapabilityLabel"),
      voiceSaasFit: await text(page, "#activeVoiceSaasFitLabel"),
      routeBehaviorTitle: await text(page, "#routeBehaviorTitle"),
      routeBehaviorNote: await text(page, "#routeBehaviorNote"),
      providerStrategyCount: await page.locator(".provider-strategy-card").count(),
      auditionTarget: await text(page, "#voiceAuditionTargetLabel"),
      appliedTarget: await text(page, "#voiceAppliedTargetLabel"),
      customReferenceState: await text(page, "#customVoiceReferenceStateLabel"),
      finalRoute: await text(page, "#voiceFinalRouteLabel"),
    };
    assert.equal(result.gatePanels.voiceGeneration.providerStrategyCount, 3);
    assert.match(result.gatePanels.voiceGeneration.voiceRole, /主链路|产线|兜底/);
    assert.match(result.gatePanels.voiceGeneration.voicePreviewCapability, /试听|快速确认|批量生成/);
    assert.match(result.gatePanels.voiceGeneration.voiceSaasFit, /SaaS|本地生产|worker/);
    assert.match(result.gatePanels.voiceGeneration.routeBehaviorTitle, /路线/);
    assert.match(result.gatePanels.voiceGeneration.routeBehaviorNote, /试听|任务创建后|工作台/);
    assert.match(result.gatePanels.voiceGeneration.auditionTarget, /暂未试听/);
    assert.match(result.gatePanels.voiceGeneration.appliedTarget, /男声教练沉稳/);
    assert.match(result.gatePanels.voiceGeneration.customReferenceState, /还没有上传|暂未启用/);
    assert.match(result.gatePanels.voiceGeneration.finalRoute, /默认中文解说路线|第一阶段默认主链路/);

    await page.locator('.provider-strategy-card[data-provider-id="f5-tts"]').click();
    await page.waitForFunction(() => {
      return document.querySelector("#ttsProviderId")?.value === "f5-tts";
    }, { timeout: 10000 });
    assert.match(await text(page, "#routeBehaviorTitle"), /高拟真正式产线/);
    assert.match(await text(page, "#routeBehaviorNote"), /正式生产|最终结果/);
    assert.equal(await page.locator('.voice-card[data-voice-mode="female_energetic_creator"] .voice-preview-btn').isDisabled(), true);

    await page.locator("#ttsProviderIdVisible").selectOption("f5-tts");
    await page.waitForFunction(() => {
      return document.querySelector("#ttsProviderId")?.value === "f5-tts";
    }, { timeout: 10000 });

    await page.locator('.voice-card[data-voice-mode="male_clear_teacher"] .voice-apply-btn').click();
    const selectedVoice = await page.locator("#voiceMode").inputValue();
    assert.equal(selectedVoice, "male_clear_teacher");
    assert.equal(await page.locator("#ttsProviderId").inputValue(), "cosyvoice-mlx");
    assert.match(await text(page, "#voiceAppliedTargetLabel"), /男声老师清晰/);
    assert.match(await text(page, "#voiceFinalRouteLabel"), /默认中文解说路线|第一阶段默认主链路/);
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
    assert.match(await text(page, "#voiceAuditionTargetLabel"), /男声老师清晰.*预设声音试听/);
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
    assert.match(await text(page, "#customVoiceReferenceStateLabel"), /已准备参考音频/);

    await page.locator("#applyCustomVoiceBtn").click();
    assert.equal(await page.locator("#voiceMode").inputValue(), "custom_reference");
    await page.waitForFunction(() => {
      return /已应用你的声音/.test(document.querySelector("#voiceAppliedTargetLabel")?.textContent || "");
    }, { timeout: 10000 });
    await page.waitForFunction(() => {
      return /自定义声音克隆路线/.test(document.querySelector("#voiceFinalRouteLabel")?.textContent || "");
    }, { timeout: 10000 });
    assert.match(await text(page, "#voiceAppliedTargetLabel"), /已应用你的声音/);
    assert.match(await text(page, "#voiceFinalRouteLabel"), /自定义声音克隆路线/);

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
    await page.waitForFunction(() => {
      return /你的声音.*参考音频试听/.test(document.querySelector("#voiceAuditionTargetLabel")?.textContent || "");
    }, { timeout: 10000 });
    await page.waitForFunction(() => {
      return /已应用自定义参考/.test(document.querySelector("#customVoiceReferenceStateLabel")?.textContent || "");
    }, { timeout: 10000 });
    assert.match(await text(page, "#voiceAuditionTargetLabel"), /你的声音.*参考音频试听/);
    assert.match(await text(page, "#customVoiceReferenceStateLabel"), /已应用自定义参考/);
    result.voicePreview.customReference = {
      filename: customUploadPayload.filename,
      previewUrl: customPreviewPayload.previewUrl,
    };
    console.log("[e2e] custom voice upload and preview connected");

    const createJobPayload = await createCompletedJob(page);
    console.log("[e2e] create job clicked");
    console.log("[e2e] job id visible");

    console.log("[e2e] completed event observed");

    const eventTexts = await collectEventTexts(page);
    assert.ok(eventTexts.length >= 5, "expected at least five visible task events");
    const expectedEventHints = ["已创建任务", "任务完成"];
    for (const hint of expectedEventHints) {
      assert.ok(eventTexts.some((text) => text.includes(hint)), `missing event hint: ${hint}`);
    }
    result.stateTimeline = eventTexts.slice(0, 5).map((item) => ({
      state: item,
      jobStateChip: "",
      jobStepChip: "",
      activeStepLabels: [],
    }));
    result.stateTimeline[0].jobStateChip = await text(page, "#jobStateChip");
    result.stateTimeline[0].jobStepChip = await text(page, "#jobStepChip");
    result.stateTimeline[0].activeStepLabels = (await page.locator(".step-item .step-status-label").allInnerTexts()).map((item) => item.trim());

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
    result.visualConsistencySummary = (await page.locator("#jobVisualConsistencySummary .quality-item").allInnerTexts()).map((item) =>
      item.trim(),
    );
    result.publishReadinessSummary = (await page.locator("#publishReadinessSummary .quality-item").allInnerTexts()).map((item) =>
      item.trim(),
    );
    result.deliveryPackageSummary = (await page.locator("#deliveryPackageSummary .quality-item").allInnerTexts()).map((item) =>
      item.trim(),
    );

    assert.ok(videoSrc && videoSrc.endsWith(".mp4"));
    assert.ok(result.preview.previewLinks.includes("打开 MP4"));
    assert.ok(result.preview.previewLinks.includes("下载 MP4"));
    assert.ok(result.preview.previewLinks.includes("元数据 JSON"));
    assert.ok(result.preview.previewLinks.includes("字幕 SRT"));
    assert.ok(result.preview.previewLinks.includes("字幕 VTT"));
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
    assert.ok(result.visualConsistencySummary.some((item) => item.includes("当前画面风格：John 竖屏讲解风格")), "missing visual style summary");
    assert.ok(result.visualConsistencySummary.some((item) => item.includes("当前人物形象：John 专属人物形象")), "missing persona summary");
    assert.ok(result.visualConsistencySummary.some((item) => item.includes("统一规则：")), "missing visual consistency rule");
    assert.ok(result.publishReadinessSummary.some((item) => item.includes("具备发布条件") || item.includes("可以发") || item.includes("不能发")), "missing publish readiness status");
    assert.ok(result.publishReadinessSummary.some((item) => item.includes("下一步：")), "missing publish next action");
    assert.ok(result.deliveryPackageSummary.some((item) => item.includes("主交付物：可直接播放的 MP4 成片")), "missing delivery package mp4 summary");
    assert.ok(result.deliveryPackageSummary.some((item) => item.includes("字幕交付：")), "missing delivery subtitle summary");
    assert.ok(result.deliveryPackageSummary.some((item) => item.includes("元数据：")), "missing delivery metadata summary");

    await page.goto(`${APP_URL}?step=voice_generation`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('.voice-card[data-voice-mode="female_energetic_creator"]');
    await page.locator("#ttsProviderIdVisible").selectOption("f5-tts");
    await page.waitForFunction(() => document.querySelector("#ttsProviderId")?.value === "f5-tts", { timeout: 10000 });
    await page.locator('.voice-card[data-voice-mode="female_energetic_creator"] .voice-apply-btn').click();
    await page.waitForFunction(() => document.querySelector("#voiceMode")?.value === "female_energetic_creator", { timeout: 10000 });
    const secondJobPayload = await createCompletedJob(page);
    assert.notEqual(secondJobPayload.job.id, createJobPayload.job.id);

    await page.goto(`${APP_URL}?step=voice_generation`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('.voice-card[data-voice-mode="male_clear_teacher"]');
    await page.evaluate(() => {
      const input = document.querySelector("#customVoiceReference");
      if (input) input.value = "";
    });
    await page.locator("#ttsProviderIdVisible").selectOption("cosyvoice-mlx");
    await page.waitForFunction(() => document.querySelector("#ttsProviderId")?.value === "cosyvoice-mlx", { timeout: 10000 });
    await page.locator('.voice-card[data-voice-mode="male_clear_teacher"] .voice-apply-btn').click();
    await page.waitForFunction(() => document.querySelector("#voiceMode")?.value === "male_clear_teacher", { timeout: 10000 });
    const thirdJobPayload = await createCompletedJob(page);
    assert.notEqual(thirdJobPayload.job.id, secondJobPayload.job.id);

    await page.goto(`${APP_URL}jobs`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".job-group", { timeout: 30000 });
    const jobGroups = await page.locator(".job-group").evaluateAll((nodes) =>
      nodes.map((group) => ({
        title: group.querySelector(".job-group-title span:last-child")?.textContent?.trim() ?? "",
        hint: group.querySelector(".job-group-hint")?.textContent?.trim() ?? "",
        count: group.querySelectorAll(".job-row").length,
      })),
    );
    const readyLanes = await page.locator(".job-ready-lane").evaluateAll((nodes) =>
      nodes.map((lane) => ({
        title: lane.querySelector(".job-ready-lane-title")?.textContent?.trim() ?? "",
        hint: lane.querySelector(".job-ready-lane-hint")?.textContent?.trim() ?? "",
        count: lane.querySelectorAll(".job-row").length,
      })),
    );
    const prioritySignals = (await page.locator(".job-priority-signal").allInnerTexts()).map((item) => item.trim());
    const reviewModeLabels = (await page.locator(".job-mode-chip").allInnerTexts()).map((item) => item.trim());
    const summaryChipTexts = (await page.locator(".job-summary-chip").allInnerTexts()).map((item) => item.trim());
    const leadPick = {
      title: await text(page, "#leadPickTitle"),
      rank: await text(page, "#leadPickRank"),
      mode: await text(page, "#leadPickMode"),
      reason: await text(page, "#leadPickReason"),
      firstCheck: await text(page, "#leadPickFirstCheck"),
      priority: await text(page, "#leadPickPriority"),
      relationTitleOnLead: "",
      relationBodyOnLead: "",
      relationTitleOnFollowup: "",
      relationBodyOnFollowup: "",
    };
    await page.locator("#leadPickCard").click();
    await page.waitForFunction(() => {
      const leadTitle = document.querySelector("#leadPickTitle")?.textContent?.trim();
      const titleValue = document.querySelector("#detailTitleValue")?.textContent?.trim();
      return Boolean(leadTitle && titleValue);
    }, { timeout: 30000 });
    leadPick.detailTitleAfterClick = await page.locator("#detailTitleValue").innerText();
    leadPick.relationTitleOnLead = await text(page, "#acceptanceRelationTitle");
    leadPick.relationBodyOnLead = await text(page, "#acceptanceRelationBody");
    const jobRowCount = await page.locator(".job-row").count();
    assert.ok(jobRowCount > 1, "expected multiple job rows so followup banner can be exercised");
    await page.locator(".job-row").nth(1).click();
    await page.waitForSelector("#leadFollowupBanner.active", { timeout: 30000 });
    leadPick.followupVisible = await page.locator("#leadFollowupBanner").isVisible();
    leadPick.relationTitleOnFollowup = await text(page, "#acceptanceRelationTitle");
    leadPick.relationBodyOnFollowup = await text(page, "#acceptanceRelationBody");
    await page.locator("#leadFollowupBtn").click();
    await page.waitForFunction(() => {
      const leadTitle = document.querySelector("#leadPickTitle")?.textContent?.trim();
      const detailTitle = document.querySelector("#detailTitleValue")?.textContent?.trim();
      return Boolean(leadTitle && detailTitle && leadTitle === detailTitle);
    }, { timeout: 30000 });
    leadPick.detailTitleAfterFollowup = await page.locator("#detailTitleValue").innerText();
    const acceptanceHero = {
      title: await text(page, "#acceptanceHeroTitle"),
      mode: await text(page, "#acceptanceModeChip"),
      chip: await text(page, "#acceptanceHeroChip"),
      body: await text(page, "#acceptanceHeroBody"),
      primaryAction: await text(page, "#acceptancePrimaryAction"),
      secondaryAction: await text(page, "#acceptanceSecondaryAction"),
      checks: (await page.locator("#acceptanceChecks .acceptance-check-item").allInnerTexts()).map((item) => item.trim()),
      blocker: await text(page, "#acceptanceBlocker"),
      nextAction: await text(page, "#acceptanceNextAction"),
    };
    const reviewContextSummary = (await page.locator("#reviewContextSummary .summary-item").allInnerTexts()).map((item) => item.trim());
    const focusCardCount = await page.locator(".job-focus-card").count();
    const focusTexts = (await page.locator(".job-focus-text").allInnerTexts()).map((item) => item.trim());
    result.jobsDashboard = {
      groups: jobGroups,
      readyLanes,
      prioritySignals,
      reviewModeLabels,
      summaryChipTexts,
      leadPick,
      reviewContextSummary,
      acceptanceHero,
      focusCardCount,
      focusTexts,
    };
    assert.ok(jobGroups.length >= 1, "expected at least one grouped jobs section");
    assert.ok(jobGroups.some((item) => item.title === "可验收"), "expected a ready-for-review group");
    assert.ok(jobGroups.some((item) => item.title === "历史已完成"), "expected a persisted history group");
    assert.ok(jobGroups.every((item) => item.count >= 1), "expected every visible group to contain jobs");
    assert.ok(readyLanes.length >= 1, "expected ready-for-review lanes inside jobs dashboard");
    assert.ok(readyLanes.some((item) => item.title === "优先人工验收"), "expected a priority review lane");
    assert.ok(readyLanes.every((item) => item.count >= 1), "expected each visible ready lane to contain jobs");
    assert.ok(prioritySignals.length >= 1, "expected visible priority reason signals");
    assert.ok(prioritySignals.some((item) => /自定义声音|正式产线|高质量档位/.test(item)), "expected recognizable priority reason signal");
    assert.ok(reviewModeLabels.length >= 1, "expected visible review mode labels on job cards");
    assert.ok(reviewModeLabels.some((item) => /自定义声音验收|正式发布验收|常规验收模式|谨慎验收模式/.test(item)), "expected meaningful review mode labels");
    assert.ok(reviewModeLabels.some((item) => /优先人工验收第 \d+ 位|普通验收第 \d+ 位/.test(item)), "expected visible review rank labels on job cards");
    assert.match(leadPick.title, /\S+/);
    assert.match(leadPick.rank, /优先人工验收第 \d+ 位|普通验收第 \d+ 位/);
    assert.match(leadPick.mode, /自定义声音验收|正式发布验收|常规验收模式|谨慎验收模式|进度观察模式|故障处理模式/);
    assert.match(leadPick.reason, /因为/);
    assert.match(leadPick.firstCheck, /第一眼先验：/);
    assert.match(leadPick.priority, /当前优先级：/);
    assert.equal(leadPick.detailTitleAfterClick.trim(), leadPick.title.trim());
    assert.equal(leadPick.followupVisible, true);
    assert.equal(leadPick.detailTitleAfterFollowup.trim(), leadPick.title.trim());
    assert.match(leadPick.relationTitleOnLead, /推荐优先验收任务/);
    assert.match(leadPick.relationBodyOnLead, /优先人工验收第 1 位|第一眼先验/);
    assert.match(leadPick.relationTitleOnFollowup, /不是推荐任务/);
    assert.match(leadPick.relationBodyOnFollowup, /系统推荐先看的是|优先人工验收第 1 位/);
    assert.ok(summaryChipTexts.some((item) => /第一眼先验：/.test(item)), "expected visible first-check summary chip");
    assert.ok(summaryChipTexts.some((item) => /当前优先级：/.test(item)), "expected visible review-priority summary chip");
    assert.ok(reviewContextSummary.some((item) => /当前分组：/.test(item)), "expected right-side review context bucket summary");
    assert.ok(reviewContextSummary.some((item) => /当前分道：/.test(item)), "expected right-side review context lane summary");
    assert.ok(reviewContextSummary.some((item) => /当前顺位：/.test(item)), "expected right-side review rank summary");
    assert.ok(reviewContextSummary.some((item) => /第一眼先验：/.test(item)), "expected right-side first-check summary");
    assert.ok(reviewContextSummary.some((item) => /当前优先级：/.test(item)), "expected right-side review-priority summary");
    assert.match(acceptanceHero.title, /建议现在优先人工验收|可以开始人工验收|可以人工验收，但要谨慎/);
    assert.match(acceptanceHero.mode, /自定义声音验收|正式发布验收|常规验收模式|谨慎验收模式|进度观察模式|故障处理模式/);
    assert.match(acceptanceHero.chip, /可验收判断|先处理问题|先看进度/);
    assert.match(acceptanceHero.primaryAction, /先听声音|先看成片|先修音频|先查错误|先看进度/);
    assert.match(acceptanceHero.secondaryAction, /再看成片|再听细节|再决定是否重跑|再回看成片|再等成片落地/);
    assert.ok(acceptanceHero.checks.length >= 2, "expected at least two acceptance checks");
    assert.match(acceptanceHero.nextAction, /下一步建议/);
    assert.ok(focusCardCount >= 1, "expected at least one acceptance focus card");
    assert.ok(
      focusTexts.some((item) => /人工验收|声音|音色|fallback|成片|节奏/.test(item)),
      "expected at least one visible acceptance focus summary",
    );

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

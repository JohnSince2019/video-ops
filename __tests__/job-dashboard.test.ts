import assert from "node:assert/strict";
import test from "node:test";

import { buildJobDetailView, buildJobListView } from "../lib/ui/job-dashboard.js";

test("task list normalization exposes state, platform, profile, progress, and updated time", () => {
  const list = buildJobListView([
    {
      id: "job-001",
      title: "AI 效率视频",
      state: "AI_PROCESSING",
      platform: "douyin",
      renderProfile: "standard",
      updatedAt: "2026-06-27T02:10:00.000Z",
      progress: 42,
      lastCheckpoint: {
        ttsProviderId: "f5-tts",
        ttsRouteLabel: "高拟真 SaaS 生产路线",
      },
    },
  ]);

  assert.equal(list[0]?.title, "AI 效率视频");
  assert.equal(list[0]?.state, "AI_PROCESSING");
  assert.equal(list[0]?.platform, "douyin");
  assert.equal(list[0]?.platformLabel, "抖音");
  assert.equal(list[0]?.renderProfile, "standard");
  assert.equal(list[0]?.renderProfileLabel, "标准");
  assert.equal(list[0]?.progressLabel, "42%");
  assert.equal(list[0]?.updatedLabel, "2026-06-27 02:10");
  assert.equal(list[0]?.stateLabel, "AI 处理中");
  assert.equal(list[0]?.ttsProviderLabel, "F5-TTS");
  assert.equal(list[0]?.ttsRouteLabel, "高拟真 SaaS 生产路线");
});

test("task detail output includes step, progress, errors, checkpoint, and outputs", () => {
  const detail = buildJobDetailView({
    id: "job-002",
    title: "副业视频任务",
    state: "FAILED",
    platform: "xiaohongshu",
    renderProfile: "high_quality",
    updatedAt: "2026-06-27T03:00:00.000Z",
    createdAt: "2026-06-27T02:00:00.000Z",
    progress: 73,
    currentStep: "tts_generation",
    lastCheckpoint: { step: "image_generation", scene: 3, voiceMode: "male_clear_teacher", ttsProviderId: "cosyvoice-mlx", ttsRouteLabel: "默认中文解说路线" },
    qualitySummary: {
      fileSizeBytes: 1_572_864,
      durationSec: 14.2,
      resolution: "1080x1920",
      audioPresence: true,
      subtitleStatus: "planned",
      fallbackStatus: "fallback",
      fallbackReason: "ffmpeg render failed",
      complianceStatus: "allowed",
      complianceViolations: 0,
    },
    costSummary: {
      gptImageUsd: 0.12,
      wanxUsd: 0.015,
      ttsUsd: 0.024,
      totalUsd: 0.159,
    },
    errors: [{ stepName: "tts_generation", errorMessage: "cosyvoice timeout", retryCount: 2 }],
    outputs: [{ kind: "cover", path: "output/cover.png" }],
  });

  assert.equal(detail.state, "FAILED");
  assert.equal(detail.stateLabel, "失败");
  assert.equal(detail.progress, 73);
  assert.equal(detail.currentStep, "生成配音音频");
  assert.equal(detail.errorSummary[0], "生成配音音频：cosyvoice timeout（已重试 2 次）");
  assert.equal(detail.outputsSummary[0], "封面图：output/cover.png");
  assert.match(detail.checkpointSummary, /image_generation/);
  assert.equal(detail.checkpointReadableSummary[0], "当前阶段：生成画面素材");
  assert.equal(detail.checkpointReadableSummary.includes("TTS 路线：默认中文解说路线"), true);
  assert.equal(detail.ttsStrategySummary.voiceModeLabel, "男声老师清晰");
  assert.equal(detail.ttsStrategySummary.providerLabel, "CosyVoice MLX");
  assert.equal(detail.ttsStrategySummary.routeLabel, "默认中文解说路线");
  assert.equal(detail.ttsStrategySummary.cloningLabel, "使用预设音色");
  assert.equal(detail.ttsStrategySummary.deploymentLabel, "本地与云端都可落地");
  assert.equal(detail.qualitySummary.fileSizeLabel, "1.50 MB");
  assert.equal(detail.qualitySummary.durationLabel, "14.2s");
  assert.equal(detail.qualitySummary.fallbackStatusLabel, "使用 fallback · ffmpeg render failed");
  assert.equal(detail.qualitySummary.complianceStatusLabel, "通过");
  assert.equal(detail.costSummary.totalUsd, "$0.1590");
});

test("task detail checkpoint summary includes custom voice reference when present", () => {
  const detail = buildJobDetailView({
    id: "job-004",
    title: "自定义声音视频",
    state: "QUEUED",
    platform: "douyin",
    renderProfile: "standard",
    updatedAt: "2026-06-27T03:00:00.000Z",
    createdAt: "2026-06-27T02:00:00.000Z",
    progress: 0,
    currentStep: "waiting_for_worker",
    lastCheckpoint: {
      step: "wizard_submission",
      voiceMode: "custom_reference",
      customVoiceReference: "john-custom-reference.wav",
      ttsVoice: "custom-reference-voice",
      ttsProviderId: "cosyvoice-mlx",
      ttsRouteLabel: "自定义声音克隆路线",
    },
    outputs: [],
    errors: [],
  });

  assert.match(detail.checkpointSummary, /john-custom-reference\.wav/);
  assert.match(detail.checkpointSummary, /custom-reference-voice/);
  assert.equal(detail.ttsStrategySummary.cloningLabel, "使用参考音频克隆");
  assert.equal(detail.ttsStrategySummary.routeLabel, "自定义声音克隆路线");
});

test("unknown state and missing fields fall back to safe display values", () => {
  const list = buildJobListView([
    {
      id: "job-003",
      state: "SOMETHING_NEW",
    },
  ]);
  const detail = buildJobDetailView({
    id: "job-003",
    state: "SOMETHING_NEW",
  });

  assert.equal(list[0]?.title, "未命名任务 1");
  assert.equal(list[0]?.state, "UNKNOWN");
  assert.equal(list[0]?.stateLabel, "未知");
  assert.equal(list[0]?.platform, "unknown-platform");
  assert.equal(list[0]?.platformLabel, "未知平台");
  assert.equal(list[0]?.renderProfile, "unknown-profile");
  assert.equal(list[0]?.renderProfileLabel, "未知档位");
  assert.equal(detail.state, "UNKNOWN");
  assert.equal(detail.stateLabel, "未知");
  assert.equal(detail.platform, "未知平台");
  assert.equal(detail.renderProfile, "未知档位");
  assert.equal(detail.currentStep, "当前暂无执行步骤");
  assert.equal(detail.errorSummary[0], "当前没有错误记录。");
  assert.equal(detail.outputsSummary[0], "当前还没有可用产物。");
  assert.equal(detail.ttsStrategySummary.providerLabel, "未设置");
  assert.equal(detail.qualitySummary.fileSizeLabel, "未生成");
  assert.equal(detail.costSummary.totalUsd, "$0.0000");
});

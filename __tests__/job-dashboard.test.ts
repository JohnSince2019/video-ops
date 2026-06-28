import assert from "node:assert/strict";
import test from "node:test";

import { buildAcceptanceLead, buildJobDetailView, buildJobListView } from "../lib/ui/job-dashboard.js";

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
        ttsRouteRoleLabel: "高拟真正式产线",
      },
      qualitySummary: {
        fallbackStatus: "fallback",
        fallbackReason: "ffmpeg render failed",
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
  assert.equal(list[0]?.routeRoleLabel, "高拟真正式产线");
  assert.equal(list[0]?.renderSourceLabel, "当前产物来自 fallback 渲染链路");
  assert.match(list[0]?.rerunRecommendationLabel || "", /重跑|fallback/);
  assert.match(list[0]?.acceptanceFocusLabel || "", /fallback|主链路|正式发布质量/);
  assert.equal(list[0]?.priorityBucket, "running");
  assert.equal(list[0]?.priorityBucketLabel, "处理中");
  assert.equal(list[0]?.reviewModeLabel, "进度观察模式");
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
  assert.equal(detail.ttsStrategySummary.routeRoleLabel, "未设置");
  assert.equal(detail.ttsStrategySummary.cloningLabel, "使用预设音色");
  assert.equal(detail.ttsStrategySummary.deploymentLabel, "本地与云端都可落地");
  assert.equal(detail.ttsStrategySummary.acceptanceHint, "未设置");
  assert.equal(detail.visualConsistencySummary.styleLabel, "未设置");
  assert.equal(detail.routeOutcomeSummary.qualityFocusLabel, "优先关注自然度、清晰度和是否符合当前工作台预期。");
  assert.equal(detail.routeOutcomeSummary.costInterpretationLabel, "这类路线适合在试听效率和生产成本之间保持平衡。");
  assert.equal(detail.routeOutcomeSummary.acceptancePriorityLabel, "可以先听工作台试听，再结合成片做最终验收。");
  assert.equal(detail.qualitySummary.fileSizeLabel, "1.50 MB");
  assert.equal(detail.qualitySummary.durationLabel, "14.2s");
  assert.equal(detail.qualitySummary.fallbackStatusLabel, "使用 fallback · ffmpeg render failed");
  assert.equal(detail.qualitySummary.complianceStatusLabel, "通过");
  assert.equal(detail.costSummary.totalUsd, "$0.1590");
  assert.equal(detail.resilienceSummary.renderSourceLabel, "当前产物来自 fallback 渲染链路");
  assert.match(detail.resilienceSummary.fallbackInterpretationLabel, /fallback/);
  assert.match(detail.resilienceSummary.rerunRecommendationLabel, /人工验收|重跑/);
  assert.equal(detail.acceptanceAssistant.heroLabel, "暂时不建议人工验收");
  assert.match(detail.acceptanceAssistant.blockerLabel, /当前阻塞/);
  assert.equal(detail.acceptanceAssistant.reviewModeLabel, "故障处理模式");
  assert.equal(detail.acceptanceAssistant.primaryActionLabel, "先查错误");
  assert.equal(detail.acceptanceAssistant.secondaryActionLabel, "再决定是否重跑");
});

test("checkpoint readable summary surfaces stage narration when provided", () => {
  const detail = buildJobDetailView({
    id: "job-006",
    title: "阶段说明任务",
    state: "RENDERING",
    platform: "douyin",
    renderProfile: "standard",
    updatedAt: "2026-06-27T06:00:00.000Z",
    createdAt: "2026-06-27T05:00:00.000Z",
    progress: 82,
    currentStep: "ffmpeg_render",
    lastCheckpoint: {
      step: "ffmpeg_render",
      progress: 82,
      stageNarration: "正在输出成片，稍后可以直接预览并进入人工验收。",
    },
    outputs: [],
    errors: [],
  });

  assert.equal(detail.checkpointReadableSummary.includes("当前说明：正在输出成片，稍后可以直接预览并进入人工验收。"), true);
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
      ttsRouteRoleLabel: "自定义声音保真路线",
      ttsAcceptanceHint: "先确认参考音频是否足够稳定，再重点验收音色一致性和辨识度。",
    },
    outputs: [],
    errors: [],
  });

  assert.match(detail.checkpointSummary, /john-custom-reference\.wav/);
  assert.match(detail.checkpointSummary, /custom-reference-voice/);
  assert.equal(detail.ttsStrategySummary.cloningLabel, "使用参考音频克隆");
  assert.equal(detail.ttsStrategySummary.routeLabel, "自定义声音克隆路线");
  assert.equal(detail.ttsStrategySummary.routeRoleLabel, "自定义声音保真路线");
  assert.equal(detail.ttsStrategySummary.acceptanceHint, "先确认参考音频是否足够稳定，再重点验收音色一致性和辨识度。");
  assert.equal(detail.routeOutcomeSummary.qualityFocusLabel, "优先关注音色一致性、辨识度和参考音频复现程度。");
  assert.equal(detail.routeOutcomeSummary.costInterpretationLabel, "这类路线的成本解释要结合音色保真价值，而不只看单次语音价格。");
  assert.equal(detail.routeOutcomeSummary.acceptancePriorityLabel, "先确认声音像不像本人，再看整体视频节奏和画面是否匹配。");
  assert.equal(detail.resilienceSummary.renderSourceLabel, "当前还没有明确的渲染来源结论");
  assert.equal(detail.resilienceSummary.fallbackInterpretationLabel, "当前还没有足够信息解释渲染来源是否发生了降级。");
  assert.match(detail.resilienceSummary.rerunRecommendationLabel, /参考音频|人工验收/);
  assert.equal(detail.acceptanceAssistant.heroLabel, "先关注进度，不急着人工验收");
  assert.match(detail.acceptanceAssistant.readinessLabel, /还在处理中|先看阶段进展/);
  assert.equal(detail.acceptanceAssistant.reviewModeLabel, "进度观察模式");
  assert.equal(detail.acceptanceAssistant.primaryActionLabel, "先看进度");
});

test("task detail surfaces visual consistency summary in plain Chinese when style and persona exist", () => {
  const detail = buildJobDetailView({
    id: "job-visual",
    title: "统一风格任务",
    state: "COMPLETED",
    platform: "douyin",
    renderProfile: "standard",
    updatedAt: "2026-06-28T02:00:00.000Z",
    createdAt: "2026-06-28T01:00:00.000Z",
    progress: 100,
    currentStep: "done",
    lastCheckpoint: {
      step: "done",
      stylePreset: "john_vertical_comic",
      personaPreset: "john_persona_v1",
      ttsProviderId: "cosyvoice-mlx",
      ttsRouteLabel: "默认中文解说路线",
    },
    qualitySummary: {
      audioPresence: true,
      subtitleStatus: "planned",
      fallbackStatus: "primary",
      complianceStatus: "allowed",
      complianceViolations: 0,
    },
    outputs: [],
    errors: [],
  });

  assert.equal(detail.visualConsistencySummary.styleLabel, "John 竖屏讲解风格");
  assert.equal(detail.visualConsistencySummary.personaLabel, "John 专属人物形象");
  assert.match(detail.visualConsistencySummary.styleDescription, /暖色竖屏插画讲解风格/);
  assert.match(detail.visualConsistencySummary.personaDescription, /John 专属插画人物形象/);
  assert.match(detail.visualConsistencySummary.consistencyRule, /同一个 John|竖屏讲解构图/);
});

test("premium production route with fallback surfaces stronger rerun guidance", () => {
  const detail = buildJobDetailView({
    id: "job-005",
    title: "高拟真正式产线任务",
    state: "COMPLETED",
    platform: "douyin",
    renderProfile: "high_quality",
    updatedAt: "2026-06-27T05:00:00.000Z",
    createdAt: "2026-06-27T04:00:00.000Z",
    progress: 100,
    currentStep: "done",
    lastCheckpoint: {
      step: "done",
      voiceMode: "female_energetic_creator",
      ttsProviderId: "f5-tts",
      ttsRouteLabel: "高拟真 SaaS 生产路线",
      ttsRouteRoleLabel: "高拟真正式产线",
      ttsAcceptanceHint: "更适合听最终产物效果，不以页面即时试听作为主要验收方式。",
    },
    qualitySummary: {
      fileSizeBytes: 2_048_000,
      durationSec: 18.3,
      resolution: "1080x1920",
      audioPresence: true,
      subtitleStatus: "planned",
      fallbackStatus: "fallback",
      fallbackReason: "ffmpeg render failed",
      complianceStatus: "allowed",
      complianceViolations: 0,
    },
    costSummary: {
      gptImageUsd: 0.2,
      wanxUsd: 0,
      ttsUsd: 0.04,
      totalUsd: 0.24,
    },
    outputs: [{ kind: "video", path: "output/video.mp4" }],
    errors: [],
  });

  assert.equal(detail.routeOutcomeSummary.qualityFocusLabel, "优先关注最终成片自然度与整体观感，不用过度依赖即时试听。");
  assert.match(detail.resilienceSummary.fallbackInterpretationLabel, /正式产线质量/);
  assert.match(detail.resilienceSummary.rerunRecommendationLabel, /建议修复主链路后重跑/);
  assert.equal(detail.acceptanceAssistant.heroLabel, "可以人工验收，但要谨慎");
  assert.equal(detail.acceptanceAssistant.reviewModeLabel, "谨慎验收模式");
  assert.match(detail.acceptanceAssistant.nextActionLabel, /重跑主链路|谨慎/);
  assert.equal(detail.acceptanceAssistant.primaryActionLabel, "先看成片");
  assert.equal(detail.acceptanceAssistant.secondaryActionLabel, "再判断是否重跑");
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
  assert.equal(detail.acceptanceAssistant.heroLabel, "先关注进度，不急着人工验收");
});

test("task list acceptance focus highlights custom voice and completed priorities", () => {
  const list = buildJobListView([
    {
      id: "job-custom",
      title: "John 音色任务",
      state: "COMPLETED",
      platform: "douyin",
      renderProfile: "standard",
      lastCheckpoint: {
        voiceMode: "custom_reference",
        ttsRouteRoleLabel: "自定义声音保真路线",
      },
      qualitySummary: {
        audioPresence: true,
        subtitleStatus: "planned",
        fallbackStatus: "primary",
      },
    },
    {
      id: "job-completed",
      title: "普通已完成任务",
      state: "COMPLETED",
      platform: "douyin",
      renderProfile: "standard",
      lastCheckpoint: {
        voiceMode: "male_clear_teacher",
        ttsRouteRoleLabel: "第一阶段默认主链路",
      },
      qualitySummary: {
        audioPresence: true,
        subtitleStatus: "planned",
        fallbackStatus: "primary",
      },
    },
  ]);

  assert.match(list[0]?.acceptanceFocusLabel || "", /像不像本人|画面节奏/);
  assert.match(list[1]?.acceptanceFocusLabel || "", /人工验收|声音和镜头节奏/);
  assert.equal(list[0]?.priorityBucket, "ready");
  assert.equal(list[1]?.priorityBucket, "ready");
  assert.equal(list[0]?.readyLane, "priority_review");
  assert.equal(list[0]?.readyLaneLabel, "优先人工验收");
  assert.deepEqual(list[0]?.prioritySignals, ["自定义声音"]);
  assert.equal(list[0]?.reviewModeLabel, "自定义声音验收");
  assert.equal(list[1]?.readyLane, "standard_review");
  assert.equal(list[1]?.readyLaneLabel, "普通验收");
  assert.deepEqual(list[1]?.prioritySignals, []);
  assert.equal(list[1]?.reviewModeLabel, "常规验收模式");
  assert.equal(list[0]?.firstCheckLabel, "先验音色像不像本人");
  assert.equal(list[0]?.reviewPriorityLabel, "优先听声音");
  assert.equal(list[0]?.reviewRank, 1);
  assert.equal(list[0]?.reviewRankLabel, "优先人工验收第 1 位");
  assert.equal(list[1]?.firstCheckLabel, "先验声音和节奏");
  assert.equal(list[1]?.reviewPriorityLabel, "可以常规验收");
  assert.equal(list[1]?.reviewRank, 1);
  assert.equal(list[1]?.reviewRankLabel, "普通验收第 1 位");
});

test("task list priority bucket distinguishes attention, queued, and ready states", () => {
  const list = buildJobListView([
    {
      id: "job-attention",
      title: "缺字幕任务",
      state: "COMPLETED",
      qualitySummary: {
        audioPresence: true,
        subtitleStatus: "missing",
        fallbackStatus: "primary",
      },
    },
    {
      id: "job-queued",
      title: "等待任务",
      state: "QUEUED",
    },
    {
      id: "job-ready",
      title: "标准成片",
      state: "COMPLETED",
      qualitySummary: {
        audioPresence: true,
        subtitleStatus: "planned",
        fallbackStatus: "primary",
      },
    },
  ]);
  const byId = Object.fromEntries(list.map((item) => [item.id, item]));

  assert.equal(byId["job-attention"]?.priorityBucket, "attention");
  assert.equal(byId["job-attention"]?.priorityBucketLabel, "优先关注");
  assert.equal(byId["job-attention"]?.readyLane, null);
  assert.equal(byId["job-queued"]?.priorityBucket, "queued");
  assert.equal(byId["job-queued"]?.priorityBucketLabel, "待开始");
  assert.equal(byId["job-queued"]?.readyLane, null);
  assert.equal(byId["job-ready"]?.priorityBucket, "ready");
  assert.equal(byId["job-ready"]?.priorityBucketLabel, "可验收");
  assert.equal(byId["job-ready"]?.readyLane, "standard_review");
  assert.equal(byId["job-ready"]?.readyLaneLabel, "普通验收");
  assert.deepEqual(byId["job-ready"]?.prioritySignals, []);
});

test("older standard completed jobs remain distinguishable from recommended review targets", () => {
  const list = buildJobListView([
    {
      id: "job-priority",
      title: "自定义声音优先任务",
      state: "COMPLETED",
      renderProfile: "standard",
      qualitySummary: {
        audioPresence: true,
        subtitleStatus: "planned",
        fallbackStatus: "primary",
      },
      lastCheckpoint: {
        voiceMode: "custom_reference",
        ttsRouteRoleLabel: "自定义声音保真路线",
      },
    },
    {
      id: "job-history-a",
      title: "历史标准任务 A",
      state: "COMPLETED",
      renderProfile: "standard",
      updatedAt: "2026-06-28T01:00:00.000Z",
      qualitySummary: {
        audioPresence: true,
        subtitleStatus: "planned",
        fallbackStatus: "primary",
      },
      lastCheckpoint: {
        voiceMode: "male_clear_teacher",
        ttsRouteRoleLabel: "第一阶段默认主链路",
      },
    },
    {
      id: "job-history-b",
      title: "历史标准任务 B",
      state: "COMPLETED",
      renderProfile: "standard",
      updatedAt: "2026-06-27T01:00:00.000Z",
      qualitySummary: {
        audioPresence: true,
        subtitleStatus: "planned",
        fallbackStatus: "primary",
      },
      lastCheckpoint: {
        voiceMode: "male_clear_teacher",
        ttsRouteRoleLabel: "第一阶段默认主链路",
      },
    },
  ]);

  assert.equal(list[0]?.id, "job-priority");
  assert.equal(list[0]?.readyLane, "priority_review");
  assert.equal(list[1]?.readyLane, "standard_review");
  assert.equal(list[2]?.readyLane, "standard_review");
  assert.equal(list[1]?.reviewRankLabel, "普通验收第 1 位");
  assert.equal(list[2]?.reviewRankLabel, "普通验收第 2 位");
});

test("high quality completed tasks are promoted into priority review lane", () => {
  const list = buildJobListView([
    {
      id: "job-hq",
      title: "高质量成片",
      state: "COMPLETED",
      renderProfile: "high_quality",
      qualitySummary: {
        audioPresence: true,
        subtitleStatus: "planned",
        fallbackStatus: "primary",
      },
      lastCheckpoint: {
        voiceMode: "male_clear_teacher",
        ttsRouteRoleLabel: "第一阶段默认主链路",
      },
    },
  ]);

  assert.equal(list[0]?.priorityBucket, "ready");
  assert.equal(list[0]?.readyLane, "priority_review");
  assert.equal(list[0]?.readyLaneLabel, "优先人工验收");
  assert.deepEqual(list[0]?.prioritySignals, ["高质量档位"]);
  assert.equal(list[0]?.reviewModeLabel, "正式发布验收");
});

test("premium production route exposes multiple priority signals", () => {
  const list = buildJobListView([
    {
      id: "job-premium",
      title: "正式发布任务",
      state: "COMPLETED",
      renderProfile: "high_quality",
      qualitySummary: {
        audioPresence: true,
        subtitleStatus: "planned",
        fallbackStatus: "primary",
      },
      lastCheckpoint: {
        voiceMode: "female_energetic_creator",
        ttsRouteRoleLabel: "高拟真正式产线",
      },
    },
  ]);

  assert.equal(list[0]?.readyLane, "priority_review");
  assert.deepEqual(list[0]?.prioritySignals, ["正式产线", "高质量档位"]);
  assert.equal(list[0]?.firstCheckLabel, "先验成片自然度");
  assert.equal(list[0]?.reviewPriorityLabel, "优先看发布质量");
});

test("job list sorts higher-review-priority tasks before standard completed tasks", () => {
  const list = buildJobListView([
    {
      id: "job-standard",
      title: "标准成片",
      state: "COMPLETED",
      renderProfile: "standard",
      qualitySummary: {
        audioPresence: true,
        subtitleStatus: "planned",
        fallbackStatus: "primary",
      },
      lastCheckpoint: {
        voiceMode: "male_clear_teacher",
        ttsRouteRoleLabel: "第一阶段默认主链路",
      },
    },
    {
      id: "job-custom",
      title: "自定义声音成片",
      state: "COMPLETED",
      renderProfile: "standard",
      qualitySummary: {
        audioPresence: true,
        subtitleStatus: "planned",
        fallbackStatus: "primary",
      },
      lastCheckpoint: {
        voiceMode: "custom_reference",
        ttsRouteRoleLabel: "自定义声音保真路线",
      },
    },
  ]);

  assert.equal(list[0]?.id, "job-custom");
  assert.equal(list[1]?.id, "job-standard");
  assert.equal(list[0]?.reviewRankLabel, "优先人工验收第 1 位");
  assert.equal(list[1]?.reviewRankLabel, "普通验收第 1 位");
});

test("jobs in the same ready lane get increasing review ranks", () => {
  const list = buildJobListView([
    {
      id: "job-custom-a",
      title: "自定义声音 A",
      state: "COMPLETED",
      renderProfile: "standard",
      qualitySummary: {
        audioPresence: true,
        subtitleStatus: "planned",
        fallbackStatus: "primary",
      },
      lastCheckpoint: {
        voiceMode: "custom_reference",
        ttsRouteRoleLabel: "自定义声音保真路线",
      },
    },
    {
      id: "job-custom-b",
      title: "自定义声音 B",
      state: "COMPLETED",
      renderProfile: "high_quality",
      qualitySummary: {
        audioPresence: true,
        subtitleStatus: "planned",
        fallbackStatus: "primary",
      },
      lastCheckpoint: {
        voiceMode: "custom_reference",
        ttsRouteRoleLabel: "自定义声音保真路线",
      },
    },
  ]);

  assert.equal(list[0]?.readyLane, "priority_review");
  assert.equal(list[1]?.readyLane, "priority_review");
  assert.equal(list[0]?.reviewRank, 1);
  assert.equal(list[1]?.reviewRank, 2);
  assert.equal(list[0]?.reviewRankLabel, "优先人工验收第 1 位");
  assert.equal(list[1]?.reviewRankLabel, "优先人工验收第 2 位");
});

test("acceptance lead picks the highest-priority review target", () => {
  const list = buildJobListView([
    {
      id: "job-standard",
      title: "标准成片",
      state: "COMPLETED",
      renderProfile: "standard",
      qualitySummary: {
        audioPresence: true,
        subtitleStatus: "planned",
        fallbackStatus: "primary",
      },
      lastCheckpoint: {
        voiceMode: "male_clear_teacher",
        ttsRouteRoleLabel: "第一阶段默认主链路",
      },
    },
    {
      id: "job-custom",
      title: "自定义声音成片",
      state: "COMPLETED",
      renderProfile: "standard",
      qualitySummary: {
        audioPresence: true,
        subtitleStatus: "planned",
        fallbackStatus: "primary",
      },
      lastCheckpoint: {
        voiceMode: "custom_reference",
        ttsRouteRoleLabel: "自定义声音保真路线",
      },
    },
  ]);

  const lead = buildAcceptanceLead(list);

  assert.equal(lead?.jobId, "job-custom");
  assert.equal(lead?.reviewRankLabel, "优先人工验收第 1 位");
  assert.equal(lead?.firstCheckLabel, "先验音色像不像本人");
  assert.equal(lead?.reviewPriorityLabel, "优先听声音");
  assert.match(lead?.reasonLabel || "", /自定义声音|更值得先人工把关/);
});

test("completed standard task gets ready-for-acceptance assistant guidance", () => {
  const detail = buildJobDetailView({
    id: "job-standard-ready",
    title: "标准成片",
    state: "COMPLETED",
    platform: "douyin",
    renderProfile: "standard",
    updatedAt: "2026-06-27T05:00:00.000Z",
    createdAt: "2026-06-27T04:00:00.000Z",
    progress: 100,
    currentStep: "done",
    lastCheckpoint: {
      step: "done",
      voiceMode: "male_clear_teacher",
      ttsProviderId: "cosyvoice-mlx",
      ttsRouteLabel: "默认中文解说路线",
      ttsRouteRoleLabel: "第一阶段默认主链路",
    },
    qualitySummary: {
      fileSizeBytes: 1_048_576,
      durationSec: 20.4,
      resolution: "1080x1920",
      audioPresence: true,
      subtitleStatus: "planned",
      fallbackStatus: "primary",
      complianceStatus: "allowed",
      complianceViolations: 0,
    },
    outputs: [{ kind: "video", path: "output/video.mp4" }],
    errors: [],
  });

  assert.equal(detail.acceptanceAssistant.heroLabel, "可以开始人工验收");
  assert.match(detail.acceptanceAssistant.readinessLabel, /具备基本验收条件/);
  assert.match(detail.acceptanceAssistant.nextActionLabel, /声音、字幕、画面顺序/);
  assert.equal(detail.acceptanceAssistant.reviewModeLabel, "常规验收模式");
  assert.equal(detail.acceptanceAssistant.primaryActionLabel, "先听声音");
  assert.equal(detail.acceptanceAssistant.secondaryActionLabel, "再看成片");
  assert.equal(detail.reviewContext.bucketLabel, "可验收");
  assert.equal(detail.reviewContext.laneLabel, "普通验收");
  assert.equal(detail.reviewContext.reviewRankLabel, "普通验收第 1 位");
  assert.equal(detail.reviewContext.firstCheckLabel, "先验声音和节奏");
  assert.equal(detail.reviewContext.reviewPriorityLabel, "可以常规验收");
  assert.equal(detail.reviewContext.reviewModeLabel, "常规验收模式");
});

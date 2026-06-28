# Changelog

所有 video-ops 的"用户可感知"变更记录在此。

格式参考 [Keep a Changelog](https://keepachangelog.com/)。

## [Unreleased]

### In Progress

- 阶段 1.1：Git 基座（首次提交 + dev 分支推送）— ✅ 已完成（含 main 推送）
- ~~阶段 1.2：LLM Gateway Wanx2.1-t2i-plus 接入~~ → ✅ **2026-06-22 15:20 完成**
- ~~阶段 1.3：图模矩阵文档同步~~ → ✅ **2026-06-22 15:40 完成**
- 阶段 2.2：Linear 导入 → ✅ **2026-06-22 19:00 完成**（39 issues / 5 Cycles / 3 Milestones）
- 阶段 2.3：Milestone 配置 → ✅ **2026-06-22 19:00 完成**（3 Milestones 创建 + 39 issues 全量关联）
- 项目管理文档：Sprint 执行计划 + Milestone 进度追踪 → ✅ **2026-06-22 19:20 完成**（`project-manager/milestones/`）
- 公众号系列：AI 图文短视频自动混剪系统开发与变现实录（业务线 2026-06-22 13:45 激活）
- 公众号双轨机制：素材层（`/Users/john/Desktop/AI/Solutions/content/`）+ 生产层（ContentOps wizard s1-s10），2026-06-22 14:35 确认
- 素材层路径统一迁移（2026-06-24）：`video-ops/content/` → `/Users/john/Desktop/AI/Solutions/content/`

### Completed (Pre-Release)
- 2026-06-28：完成 Linear Project `video-ops · 原始视频生产流水线` 的 `VIDEO-RAW-M0` 到 `VIDEO-RAW-M6` 共 7 个 milestones、29 张 issues（`JOH-141` 到 `JOH-169`），正式落地 `raw_video_edit` 第二生产流水线。
- 2026-06-28：补齐 `RawVideoStyleGuide`、`jobMode`、`SourceVideo`、Whisper transcript、subtitle timeline、transcript analyzer、EditIntent options、EDL、clip review、FFmpeg clean edit、loudness normalization、quality gate、AI Critic、Remotion packaging、Jobs detail package display 等 raw-video P0 全链路能力。
- 2026-06-28：完成 `raw_video_edit` 真实本地 HTTP 闭环验证：`POST /api/raw-video/jobs -> GET /api/jobs/:id` 可从 source video 自动推进到 final MP4、metadata、supporting artifacts、quality reports 与 Jobs 详情预览。
- 2026-06-28：修复 raw-video created-job lifecycle 写 EDL / metadata 时未自动创建父目录导致的 `ENOENT` 问题，确保真实 API 创建任务不再在 `render_failed` 失败。
- 2026-06-28：完成交付级验证：`npm test` 228/228 通过，`npm run remotion:smoke` 通过，`npm run renderer:smoke` 通过，`DATABASE_URL=... npm run prisma:validate` 通过。
- 2026-06-22：环境基线验证（FFmpeg 8.1 / Python 3.11.15 / Docker / PostgreSQL / LLM Gateway / gpt-image-2）
- 2026-06-22 13:00：阶段 1.1 Git 基座（仓库创建 + .gitignore / README / CHANGELOG + dev 推送 + main 推送）
- 2026-06-22 13:45：公众号 Day 0 素材 v0 落盘（`/Users/john/Desktop/AI/Solutions/content/2026-06-22-Day0.md`，待用户跑 ContentOps wizard s1-s10 重生成）
- 2026-06-22 14:35：Day 0 frontmatter 重标为"素材 v0" + MEMORY §8.3.2 "AI 不绕过 wizard" + §9 双轨机制
- 2026-06-22 15:20：**阶段 1.2 完成**：wanx-v1 异步图片生成接入 LLM Gateway。root cause = 原 `/compatible-mode/v1/images/generations` 404（API Key 不支持同步），正确路径 = `X-Dashscope-Async: enable` 异步 submit+poll。E2E 测试通过：wanx-v1 200（1 图），gpt-image-2 200（不变）。llm-gateway-provider push ac8f3f9 + aef7040。**注意**：PRD §2.3 写的 "Wanx2.1-t2i-plus" 已弃用，修订为 wanx-v1。
- 2026-06-22 15:40：**阶段 1.3 完成**：图模矩阵文档同步。将 MEMORY.md / PRD.md / WORKSPACE_MEMORY.md 中所有 "Wanx2.1-t2i-plus" 替换为 "wanx-v1（异步 X-Dashscope-Async）"，共修正 9 处。video-ops push 187a22f。
- 2026-06-22 16:00：**阶段 2.1 完成**：Backlog 拆解，`docs/BACKLOG.md` 创建完成，8 Epic / 34 items，4 Sprint 规划建议，commit 63f953a。

---

## 历史归档

格式：`## [版本] - YYYY-MM-DD`

未来里程碑按版本号（v0.1 / v0.5 / v1.0）记录。

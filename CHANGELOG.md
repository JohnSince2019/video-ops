# Changelog

所有 video-ops 的"用户可感知"变更记录在此。

格式参考 [Keep a Changelog](https://keepachangelog.com/)。

## [Unreleased]

### In Progress
- 阶段 1.1：Git 基座（首次提交 + dev 分支推送）— ✅ 已完成（含 main 推送）
- ~~阶段 1.2：LLM Gateway Wanx2.1-t2i-plus 接入~~ → ✅ **2026-06-22 15:20 完成**
- ~~阶段 1.3：图模矩阵文档同步~~ → ✅ **2026-06-22 15:40 完成**
- 公众号系列：AI 图文短视频自动混剪系统开发与变现实录（业务线 2026-06-22 13:45 激活）
- 公众号双轨机制：素材层（video-ops/content/）+ 生产层（ContentOps wizard s1-s10），2026-06-22 14:35 确认

### Completed (Pre-Release)
- 2026-06-22：环境基线验证（FFmpeg 8.1 / Python 3.11.15 / Docker / PostgreSQL / LLM Gateway / gpt-image-2）
- 2026-06-22 13:00：阶段 1.1 Git 基座（仓库创建 + .gitignore / README / CHANGELOG + dev 推送 + main 推送）
- 2026-06-22 13:45：公众号 Day 0 素材 v0 落盘（`content/2026-06-22-Day0.md`，待用户跑 ContentOps wizard s1-s10 重生成）
- 2026-06-22 14:35：Day 0 frontmatter 重标为"素材 v0" + MEMORY §8.3.2 "AI 不绕过 wizard" + §9 双轨机制
- 2026-06-22 15:20：**阶段 1.2 完成**：wanx-v1 异步图片生成接入 LLM Gateway。root cause = 原 `/compatible-mode/v1/images/generations` 404（API Key 不支持同步），正确路径 = `X-Dashscope-Async: enable` 异步 submit+poll。E2E 测试通过：wanx-v1 200（1 图），gpt-image-2 200（不变）。llm-gateway-provider push ac8f3f9 + aef7040。**注意**：PRD §2.3 写的 "Wanx2.1-t2i-plus" 已弃用，修订为 wanx-v1。
- 2026-06-22 15:40：**阶段 1.3 完成**：图模矩阵文档同步。将 MEMORY.md / PRD.md / WORKSPACE_MEMORY.md 中所有 "Wanx2.1-t2i-plus" 替换为 "wanx-v1（异步 X-Dashscope-Async）"，共修正 9 处。video-ops push 187a22f。
- 2026-06-22 16:00：**阶段 2.1 完成**：Backlog 拆解，`docs/BACKLOG.md` 创建完成，8 Epic / 34 items，4 Sprint 规划建议，commit 63f953a。

---

## 历史归档

格式：`## [版本] - YYYY-MM-DD`

未来里程碑按版本号（v0.1 / v0.5 / v1.0）记录。
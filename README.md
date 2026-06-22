# video-ops

> AI 图文短视频自动混剪系统 - **building in public**

## 项目目标

把一段文字（公众号文章 / 营销文案 / 教学讲稿）自动转成短视频：

```
输入：JSON 文案（narration + caption + dialogue）
  ↓
P0-P9 模块（文案解析 → 静帧生图 → TTS → 字幕 → 合成）
  ↓
输出：mp4 视频
```

## 技术栈

| 维度 | 选型 | 备注 |
|------|------|------|
| 前端 | Next.js + TypeScript | 复用 ContentOps 同源 |
| LLM 路由 | LLM Gateway (Hybrid 模式) | 本仓的上游 |
| 后端 Worker | Python (BullMQ 任务驱动) | FFmpeg + MoviePy + mlx-audio |
| TTS | CosyVoice 3.0 MLX | 本地 M4 推理，零样本音色克隆 |
| 字幕 | mlx-audio Whisper STT | 同 mlx-audio 库 |
| 视频渲染 | FFmpeg + MoviePy | 本地 M4 |
| 数据库 | PostgreSQL 16 | 复用 contentcreator-db |

## 文档导航

- `docs/PRD.md` - 产品需求文档
- `docs/ROADMAP.md` - 实施路线图（按 Sprint 推进）
- `MEMORY.md` - AI 跨会话记忆

## 开发状态

**当前阶段**：阶段 1.1 Git 基座（首次提交）

详细进度见 [docs/ROADMAP.md](docs/ROADMAP.md)

## 快速启动

（占位 - Sprint 0 完成后补全）

```bash
# 后续会支持
make install
make dev
```

## 贡献

- 主分支：`main`（受保护，必须 PR）
- 开发分支：`dev`（日常工作流）
- Commit 规范：Conventional Commits
- 任何代码改动当天必须 commit

## License

TBD

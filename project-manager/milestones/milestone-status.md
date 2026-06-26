# Milestone 状态追踪

> **用途**：快速查看各 Milestone / Sprint 的实时进度，作为每日 check-in 的主参考。
> **维护方式**：以 Linear 作为唯一进度源，本文件仅做本地镜像与阅读参考。

---

## 当前里程碑：M0 - Foundation（冲刺中）

**Sprint**：Sprint 0
**目标日期**：2026-06-27
**总 Issues**：14 | **已完成**：14 / 14
**总 SP**：11.0 | **已完成 SP**：11.0

---

### Sprint 0 进度板

| # | Linear | 标题 | P | SP | 状态 | 推进顺序 |
|---|--------|------|---|----|------|---------|
| 1 | JOH-40 | Prisma + PostgreSQL：数据库 Schema 初始化 | P1 | 1.0 | ✅ Completed | 1st |
| 2 | JOH-22 | BullMQ + Redis：任务队列初始化 | P1 | 1.0 | ✅ Completed | 2nd |
| 3 | JOH-37 | owner token 隔离：X-Owner-Token header + DB hash | P1 | 0.5 | ✅ Completed | 3rd |
| 4 | JOH-23 | JobState：状态机（7 个状态流转） | P1 | 1.0 | ✅ Completed | 4th |
| 5 | JOH-42 | GitHub Actions CI：lint + type-check + test + 覆盖率 >= 60% | P1 | 1.0 | ✅ Completed | 5th |
| 6 | JOH-24 | SSE 实时推送：任务进度 WebSocket | P2 | 1.0 | ✅ Completed | 6th |
| 7 | JOH-25 | 断点续跑：manifestHash + ownerToken 幂等检查 | P2 | 1.0 | ✅ Completed | 7th |
| 8 | JOH-26 | 成本估算：API 调用计数 + usd 估算 | P2 | 1.0 | ✅ Completed | 8th |
| 9 | JOH-27 | 队列积压保护：50 任务上限 + 内存 12GB 阈值 | P2 | 0.5 | ✅ Completed | 9th |
| 10 | JOH-38 | Upstash Redis Rate Limiting（20 req/min/IP） | P2 | 0.5 | ✅ Completed | 10th |
| 11 | JOH-41 | Docker：Redis + PostgreSQL 开发环境 docker-compose | P1 | 0.5 | ✅ Completed | 11th |
| 12 | JOH-39 | 合规检查：正则 + 关键词黑名单（Worker 端执行） | P2 | 1.0 | ✅ Completed | 12th |
| 13 | JOH-43 | GitHub Actions：secret-scan.yml 密钥泄露扫描 | P2 | 0.5 | ✅ Completed | 13th |
| 14 | JOH-44 | GitHub Actions：release.yml main 合并构建发布 | P2 | 0.5 | ✅ Completed | 14th |

**Sprint 0 关键路径**：`JOH-40 → JOH-22 → JOH-23`（必须按顺序完成）

---

### M0 - Foundation · Sprint 1（进行中）

**目标日期**：2026-07-25
**总 Issues**：13 | **已完成**：1 / 13
**总 SP**：13.5 | **已完成 SP**：0.5

| # | Linear | 标题 | P | SP | 状态 | 推进顺序 |
|---|--------|------|---|----|------|---------|
| 15 | JOH-10 | Schema 类型定义（`lib/types/manifest.ts`） | P2 | 0.5 | ✅ Completed | 1st |
| 16 | JOH-7 | TextParser：Markdown → SceneGraph 解析 | P1 | 2.0 | ⬜ Todo | 2nd |
| 17 | JOH-6 | TextParser：ContentManifest JSON Schema 验证 | P1 | 1.0 | ⬜ Todo | 3rd |
| 18 | JOH-11 | ImageGenerator：GPT Image 2 调用（P2） | P1 | 1.0 | ⬜ Todo | 4th |
| 19 | JOH-8 | TextParser：TXT 纯文本逐句切割（fallback） | P2 | 1.0 | ⬜ Todo | 5th |
| 20 | JOH-9 | TextParser：输出 scene_hash + prompt_hash 用于缓存键 | P2 | 0.5 | ⬜ Todo | 6th |
| 21 | JOH-12 | ImageGenerator：wanx-v1 调用（P3 Broll） | P2 | 1.0 | ⬜ Todo | 7th |
| 22 | JOH-13 | ImageGenerator：图片中间产物缓存（scene_hash） | P2 | 1.0 | ⬜ Todo | 8th |
| 23 | JOH-14 | TTSClient：CosyVoice 3.0 MLX 本地推理（P4） | P1 | 2.0 | ⬜ Todo | 9th |
| 24 | JOH-15 | TTSClient：零样本音色克隆（参考音频） | P2 | 1.0 | ⬜ Todo | 10th |
| 25 | JOH-18 | 资产缓存：Hash 键 + 过期策略 | P2 | 1.0 | ⬜ Todo | 11th |
| 26 | JOH-17 | BGM 音乐库：Pixabay 预设 20 首集成 | P2 | 1.0 | ⬜ Todo | 12th |
| 27 | JOH-16 | VideoAssembler：时间线组装 + 转场（P6） | P1 | 2.0 | ⬜ Todo | 13th |

**Sprint 1 关键路径**：`JOH-10 → JOH-7 → JOH-11 + JOH-14 → JOH-16`

---

### M1 - Core Pipeline · Sprint 2（未开始）

**目标日期**：2026-07-25（与 Sprint 1 同 Milestone）
**总 Issues**：7 | **已完成**：0 / 7
**总 SP**：6.5 | **已完成 SP**：0.0

| # | Linear | 标题 | P | SP | 状态 | 推进顺序 |
|---|--------|------|---|----|------|---------|
| 28 | JOH-19 | FFmpeg：三档渲染（draft/standard/high_quality） | P1 | 1.5 | ⬜ Todo | 1st |
| 29 | JOH-20 | 平台适配：抖音 / 小红书 / 视频号 元数据注入 | P2 | 1.0 | ⬜ Todo | 2nd |
| 30 | JOH-21 | 输出包：MP4 + 封面 + metadata.json | P2 | 0.5 | ⬜ Todo | 3rd |
| 31 | JOH-28 | 图片质量校验：尺寸 / 亮度检测 | P1 | 1.0 | ⬜ Todo | 4th |
| 32 | JOH-29 | 音频质量校验：振幅 / 时长 / 静音检测 | P1 | 1.0 | ⬜ Todo | 5th |
| 33 | JOH-30 | 自动重试：失败重跑（max 3 次）+ JobErrorLog | P2 | 1.0 | ⬜ Todo | 6th |
| 34 | JOH-31 | Worker crash → INTERRUPTED → 启动时 scan 恢复 | P2 | 0.5 | ⬜ Todo | 7th |

**Sprint 2 关键路径**：`JOH-19`（依赖 JOH-16）

---

### M2 - Product · Sprint 3（未开始）

**目标日期**：2026-08-22
**总 Issues**：5 | **已完成**：0 / 5
**总 SP**：4.5 | **已完成 SP**：0.0

| # | Linear | 标题 | P | SP | 状态 | 推进顺序 |
|---|--------|------|---|----|------|---------|
| 35 | JOH-32 | 视频制作向导（Wizard）：配置页 | P1 | 1.0 | ⬜ Todo | 1st |
| 36 | JOH-33 | 任务管理面板：列表 + 状态 + 详情 | P1 | 1.0 | ⬜ Todo | 2nd |
| 37 | JOH-34 | Storyboard 预览页：3 类可调参数 | P2 | 1.5 | ⬜ Todo | 3rd |
| 38 | JOH-35 | 复用 ContentOps Zen 设计系统 | P2 | 0.5 | ⬜ Todo | 4th |
| 39 | JOH-36 | 合规报告导出（JSON + PDF） | P2 | 1.0 | ⬜ Todo | 5th |

**Sprint 3 关键路径**：`JOH-32 → JOH-33 → JOH-34`

---

## 汇总仪表板

| Milestone | Sprint | Issues | Done | SP Total | SP Done | 目标日期 | 状态 |
|-----------|--------|--------|------|---------|---------|---------|------|
| M0 - Foundation | Sprint 0 | 14 | 14 | 11.0 | 11.0 | 2026-06-27 | ✅ 已完成 |
| M1 - Core Pipeline | Sprint 1 | 13 | 1 | 13.5 | 0.5 | — | 🔵 进行中 |
| M1 - Core Pipeline | Sprint 2 | 7 | 0 | 6.5 | 0.0 | — | ⌛ 等待 |
| M2 - Product | Sprint 3 | 5 | 0 | 4.5 | 0.0 | 2026-08-22 | ⬜ 未开始 |
| **总计** | | **39** | **15** | **35.5** | **11.5** | | |

---

## 状态符号说明

| 符号 | 含义 |
|------|------|
| 🔵 In Progress | 正在处理 |
| ⬜ Todo | 未开始 |
| ✅ Completed | 已完成 |
| ⌛ 等待 | 等待前置依赖完成 |
| ❌ Blocked | 被阻塞（需要人工介入）|

---

*最后更新：2026-06-26 19:20*

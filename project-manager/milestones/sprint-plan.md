# Sprint 执行计划 — Video-Ops

> **用途**：PM 主控面板，解决 Linear 序号（JOH-40 / JOH-22）看不出推进顺序的问题。
> **数据来源**：Linear API（2026-06-22 19:20）
> **维护方式**：每完成一个 issue 后更新 `is`（In Sprint）、`status` 列；新增 issue 后在此文件追加。

---

## 概览

| Milestone | Sprint | Issues | Total SP | 目标日期 | 状态 |
|-----------|--------|--------|---------|---------|------|
| M0 - Foundation | Sprint 0 | 14 | 11.0 | 2026-06-27 | 🔵 进行中 |
| M1 - Core Pipeline | Sprint 1 | 13 | 13.5 | — | ⬜ 未开始 |
| M1 - Core Pipeline | Sprint 2 | 7 | 6.5 | — | ⌛ 等待 |
| M2 - Product | Sprint 3 | 5 | 4.5 | 2026-08-22 | ⬜ 未开始 |
| **合计** | | **39** | **35.5 SP** | | |

---

## 关键路径（Critical Path）

```
JOH-40 (Prisma Schema)
    └─ JOH-22 (BullMQ) ──────────────────┐
        ├─ JOH-37 (owner token)           │
        ├─ JOH-23 (JobState 状态机)      │
        │   └─ JOH-25 (断点续跑)         │
        ├─ JOH-24 (SSE 推送)             │
        ├─ JOH-26 (成本估算)              │
        └─ JOH-27 (队列积压保护) ─────────┤
            └─ JOH-38 (Rate Limiting)    │
                                          │
JOH-10 (Schema 类型定义)                  │
    └─ JOH-7 (TextParser MD→SceneGraph) ─┤
        ├─ JOH-6 (JSON Schema 验证)       │
        ├─ JOH-8 (TXT fallback)           │
        └─ JOH-9 (scene_hash 输出)       │
                                          │
JOH-11 (GPT Image 2) ────────────────────┤
    ├─ JOH-12 (wanx Broll)               │
    ├─ JOH-13 (图片缓存)                  │
    ├─ JOH-18 (资产缓存)                  │
    └─ JOH-17 (BGM 音乐库)               │
                                          │
JOH-14 (CosyVoice TTS)                   │
    └─ JOH-15 (音色克隆)                  │
                                          │
JOH-16 (VideoAssembler) ←───────────────┘
    ├─ JOH-19 (FFmpeg 三档渲染)
    ├─ JOH-20 (平台元数据)
    └─ JOH-21 (输出包)
          │
          ├─ JOH-28 (图片质量校验)
          ├─ JOH-29 (音频质量校验)
          ├─ JOH-30 (自动重试)
          └─ JOH-31 (Worker crash 恢复)
                │
                ├─ JOH-32 (Wizard 配置页) ────────┐
                └─ JOH-33 (任务管理面板) ──────────┤
                    └─ JOH-34 (Storyboard 预览) ──┤
                        ├─ JOH-35 (设计系统)      │
                        └─ JOH-36 (合规报告)     │
```

---

## M0 - Foundation · Sprint 0

**目标**：Sprint 1 能开跑。所有依赖链的基座必须完成。
**目标日期**：2026-06-27
**总 SP**：11.0 | **完成**：0 / 14

### 阶段 0.1 · 数据库基座（关键路径，必须先做）

| # | Linear | 标题 | P | SP | 状态 | 推进原因 | 依赖 |
|---|--------|------|---|----|------|---------|------|
| 1 | JOH-40 | Prisma + PostgreSQL：数据库 Schema 初始化 | P1 | 1.0 | 🔵 In Progress | 所有模块都依赖 Schema；JobState / Asset / JobErrorLog 表必须先建 | 无 |
| 2 | JOH-37 | owner token 隔离：X-Owner-Token header + DB hash | P1 | 0.5 | ⬜ Todo | Auth 模块，Schema 建好后立刻做；不影响关键路径宽度 | JOH-40 |
| 3 | JOH-22 | BullMQ + Redis：任务队列初始化 | P1 | 1.0 | ⬜ Todo | 整个 Worker 调度核心；其余队列相关 tasks（JOH-23/24/25/26/27）全依赖它 | JOH-40 |

### 阶段 0.2 · 队列上层（依赖 JOH-22）

| # | Linear | 标题 | P | SP | 状态 | 推进原因 | 依赖 |
|---|--------|------|---|----|------|---------|------|
| 4 | JOH-23 | JobState：状态机（7 个状态流转） | P1 | 1.0 | ⬜ Todo | JobState 表 + 状态流转逻辑；断点续跑的基础 | JOH-22 |
| 5 | JOH-24 | SSE 实时推送：任务进度 WebSocket | P2 | 1.0 | ⬜ Todo | 用户体验层；队列就绪后做，不卡关键路径 | JOH-22 |
| 6 | JOH-25 | 断点续跑：manifestHash + ownerToken 幂等检查 | P2 | 1.0 | ⬜ Todo | 依赖 JobState 状态机；队列重跑逻辑 | JOH-23 |
| 7 | JOH-26 | 成本估算：API 调用计数 + usd 估算 | P2 | 1.0 | ⬜ Todo | 独立模块；队列就绪后可并行做 | JOH-22 |
| 8 | JOH-27 | 队列积压保护：50 任务上限 + 内存 12GB 阈值 | P2 | 0.5 | ⬜ Todo | 资源保护；队列初始化后立刻做 | JOH-22 |
| 9 | JOH-38 | Upstash Redis Rate Limiting（20 req/min/IP） | P2 | 0.5 | ⬜ Todo | 安全防护；队列积压保护之后做 | JOH-27 |

### 阶段 0.3 · 安全 + CI（可与 0.1-0.2 并行，不卡关键路径）

| # | Linear | 标题 | P | SP | 状态 | 推进原因 | 依赖 |
|---|--------|------|---|----|------|---------|------|
| 10 | JOH-42 | GitHub Actions CI：lint + type-check + test + 覆盖率 >= 60% | P1 | 1.0 | ⬜ Todo | 不依赖任何模块，随时可做；CI 跑通后每次 commit 自动检查 | 无 |
| 11 | JOH-41 | Docker：Redis + PostgreSQL 开发环境 docker-compose | P1 | 0.5 | ⬜ Todo | 复用现有容器（已在跑）；只需补 backup 配置 | 无 |
| 12 | JOH-39 | 合规检查：正则 + 关键词黑名单（Worker 端执行） | P2 | 1.0 | ⬜ Todo | 内容安全；独立模块，可与任何阶段并行 | 无 |
| 13 | JOH-43 | GitHub Actions：secret-scan.yml 密钥泄露扫描 | P2 | 0.5 | ⬜ Todo | CI 完成后追加；与 JOH-42 同一套 workflow | JOH-42 |
| 14 | JOH-44 | GitHub Actions：release.yml main 合并构建发布 | P2 | 0.5 | ⬜ Todo | CI 完成后追加；与 JOH-42 同一套 workflow | JOH-42 |

---

## M1 - Core Pipeline · Sprint 1

**目标**：端到端可生成 mp4（文案 → 图片 → 配音 → 合成）。
**前置**：Sprint 0 完成（JOH-40 / JOH-22 / JOH-23 必须完成）。
**总 SP**：13.5 | **完成**：0 / 13

### 阶段 1.1 · 内容解析（关键路径头部）

| # | Linear | 标题 | P | SP | 状态 | 推进原因 | 依赖 |
|---|--------|------|---|----|------|---------|------|
| 15 | JOH-10 | Schema 类型定义（`lib/types/manifest.ts`） | P2 | 0.5 | ⬜ Todo | 所有 pipeline 模块的输入类型基准；必须最先做 | 无 |
| 16 | JOH-7 | TextParser：Markdown → SceneGraph 解析 | P1 | 2.0 | ⬜ Todo | 整个 pipeline 的入口 P1；后续所有步骤的输入来源 | JOH-10 |
| 17 | JOH-6 | TextParser：ContentManifest JSON Schema 验证 | P1 | 1.0 | ⬜ Todo | JSON 格式的显式验证；标准入口格式 | JOH-10 |
| 18 | JOH-8 | TextParser：TXT 纯文本逐句切割（fallback） | P2 | 1.0 | ⬜ Todo | 最简场景兜底；内容解析模块完成后做 | JOH-7 |
| 19 | JOH-9 | TextParser：输出 scene_hash + prompt_hash 用于缓存键 | P2 | 0.5 | ⬜ Todo | 缓存键设计；ImageGenerator 依赖此 hash | JOH-7 |

### 阶段 1.2 · AI 生图（可与 1.1 并行）

| # | Linear | 标题 | P | SP | 状态 | 推进原因 | 依赖 |
|---|--------|------|---|----|------|---------|------|
| 20 | JOH-11 | ImageGenerator：GPT Image 2 调用（P2） | P1 | 1.0 | ⬜ Todo | 主图模，不依赖其他 AI 模块；可与内容解析并行开发 | 无 |
| 21 | JOH-12 | ImageGenerator：wanx-v1 调用（P3 Broll） | P2 | 1.0 | ⬜ Todo | Broll 装饰图；依赖 JOH-11 验证图模调用流程 | JOH-11 |
| 22 | JOH-13 | ImageGenerator：图片中间产物缓存（scene_hash） | P2 | 1.0 | ⬜ Todo | 避免重复调用图模；依赖 JOH-11 + JOH-9 | JOH-11, JOH-9 |

### 阶段 1.3 · TTS（关键路径后半段）

| # | Linear | 标题 | P | SP | 状态 | 推进原因 | 依赖 |
|---|--------|------|---|----|------|---------|------|
| 23 | JOH-14 | TTSClient：CosyVoice 3.0 MLX 本地推理（P4） | P1 | 2.0 | ⬜ Todo | 配音合成核心；FFmpeg 依赖音频时长参数 | JOH-7 |
| 24 | JOH-15 | TTSClient：零样本音色克隆（参考音频） | P2 | 1.0 | ⬜ Todo | 基于 JOH-14 扩展；克隆音色提升用户体验 | JOH-14 |

### 阶段 1.4 · 视频组装（关键路径终点）

| # | Linear | 标题 | P | SP | 状态 | 推进原因 | 依赖 |
|---|--------|------|---|----|------|---------|------|
| 25 | JOH-16 | VideoAssembler：时间线组装 + 转场（P6） | P1 | 2.0 | ⬜ Todo | 整个 pipeline 的汇合点；需要图片（P2）+ 音频（P4）都就绪 | JOH-11, JOH-14 |
| 26 | JOH-18 | 资产缓存：Hash 键 + 过期策略 | P2 | 1.0 | ⬜ Todo | 通用缓存层；Image 缓存依赖它，可与 VideoAssembler 并行 | JOH-13 |
| 27 | JOH-17 | BGM 音乐库：Pixabay 预设 20 首集成 | P2 | 1.0 | ⬜ Todo | 独立模块；AudioMixer 的 BGM 来源 | JOH-14 |

---

## M1 - Core Pipeline · Sprint 2

**目标**：渲染质量达标 + 任务可靠性。
**前置**：Sprint 1 完成（JOH-16 VideoAssembler 是关键依赖）。
**总 SP**：6.5 | **完成**：0 / 7

### 阶段 2.1 · 渲染输出（依赖 JOH-16）

| # | Linear | 标题 | P | SP | 状态 | 推进原因 | 依赖 |
|---|--------|------|---|----|------|---------|------|
| 28 | JOH-19 | FFmpeg：三档渲染（draft/standard/high_quality） | P1 | 1.5 | ⬜ Todo | 最终 MP4 输出；必须等 VideoAssembler + TTS 完成后做 | JOH-16 |
| 29 | JOH-20 | 平台适配：抖音 / 小红书 / 视频号 元数据注入 | P2 | 1.0 | ⬜ Todo | 平台分发准备；FFmpeg 完成后追加元数据 | JOH-19 |
| 30 | JOH-21 | 输出包：MP4 + 封面 + metadata.json | P2 | 0.5 | ⬜ Todo | 最终交付物；FFmpeg 完成后组装 | JOH-19 |

### 阶段 2.2 · 质量门禁（可与 2.1 并行）

| # | Linear | 标题 | P | SP | 状态 | 推进原因 | 依赖 |
|---|--------|------|---|----|------|---------|------|
| 31 | JOH-28 | 图片质量校验：尺寸 / 亮度检测 | P1 | 1.0 | ⬜ Todo | 在图模调用后立刻拦截低质量图片；ImageGenerator 就绪后做 | JOH-11 |
| 32 | JOH-29 | 音频质量校验：振幅 / 时长 / 静音检测 | P1 | 1.0 | ⬜ Todo | TTS 输出后立刻拦截静音/过短音频；TTS 就绪后做 | JOH-14 |
| 33 | JOH-30 | 自动重试：失败重跑（max 3 次）+ JobErrorLog | P2 | 1.0 | ⬜ Todo | 质量门禁的兜底机制；质量校验完成后追加重试逻辑 | JOH-28, JOH-29 |
| 34 | JOH-31 | Worker crash → INTERRUPTED → 启动时 scan 恢复 | P2 | 0.5 | ⬜ Todo | 可靠性保障；JOH-23 JobState 状态机完成后做 | JOH-23 |

---

## M2 - Product · Sprint 3

**目标**：用户可通过 Web UI 完整使用。
**前置**：Sprint 2 质量门禁完成（API 稳定）。
**总 SP**：4.5 | **完成**：0 / 5

### 阶段 3.1 · 核心 UI（顺序做，后依赖前）

| # | Linear | 标题 | P | SP | 状态 | 推进原因 | 依赖 |
|---|--------|------|---|----|------|---------|------|
| 35 | JOH-32 | 视频制作向导（Wizard）：配置页 | P1 | 1.0 | ⬜ Todo | 前端入口；用户第一步操作 | JOH-19, JOH-21 |
| 36 | JOH-33 | 任务管理面板：列表 + 状态 + 详情 | P1 | 1.0 | ⬜ Todo | 用户查看任务进度；依赖 JobState API | JOH-24, JOH-25 |
| 37 | JOH-34 | Storyboard 预览页：3 类可调参数 | P2 | 1.5 | ⬜ Todo | 渲染前预览；需要 VideoAssembler 中间产物 | JOH-16 |
| 38 | JOH-35 | 复用 ContentOps Zen 设计系统 | P2 | 0.5 | ⬜ Todo | 视觉一致性；Wizard 页面开发时同步引入 | JOH-32 |
| 39 | JOH-36 | 合规报告导出（JSON + PDF） | P2 | 1.0 | ⬜ Todo | 内容安全证明；依赖完整 pipeline 输出 | JOH-21, JOH-39 |

---

## 推荐 Sprint Planning 节奏

| Sprint | 建议容量 | 关键路径 issue |
|--------|---------|--------------|
| Sprint 0 | 11 SP | JOH-40 → JOH-22 → JOH-23 |
| Sprint 1 | 13.5 SP | JOH-10 → JOH-7 → JOH-11 + JOH-14 → JOH-16 |
| Sprint 2 | 6.5 SP | JOH-19（依赖 JOH-16）；其余可提前 |
| Sprint 3 | 4.5 SP | JOH-32 → JOH-33 → JOH-34 |

---

## 每日推进参考（2026-06-23 开始）

| 日 | 建议推进 | 对应 issue |
|----|---------|-----------|
| Day 1 | 完成 JOH-40，开始 JOH-22 | Prisma Schema → BullMQ |
| Day 2 | 完成 JOH-22，开始 JOH-23 + JOH-42 | 队列初始化 + CI |
| Day 3 | 完成 JOH-23，并行 JOH-37/24/26/27 | 状态机 + 队列上层 |
| Day 4 | 完成 Sprint 0 剩余 + CI 收尾 | JOH-39/41/43/44 |
| Day 5 | Sprint 1 启动：JOH-10 + JOH-11 | Schema 类型 + GPT Image 2 |

---

*最后更新：2026-06-22 19:20 · 数据来源：Linear API*

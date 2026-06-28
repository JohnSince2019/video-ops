# MEMORY.md — video-ops 项目跨会话记忆

> **本文件由 AI 维护。任何 AI 在开始 video-ops 相关会话时，必须先读本文件。**
> **不读本文件开始对话 = 必然失智。**
> **同时请先读 WORKSPACE_MEMORY.md 了解跨项目上下文。**

最后更新：2026-06-28 13:40（VIDEO-RAW-M0 ~ M6 完成，并补齐 raw_video_edit 真实 HTTP 闭环验证）

---

## 1. 项目概览

**产品名称**：video-ops（AI 图文短视频自动混剪系统）

**核心价值主张**：让内容创作者通过一份文案（Markdown/JSON）自动生成可发布的短视频（.mp4），输出到抖音 / 小红书 / 视频号。

**目标用户**：需要日更 / 周更短视频的自媒体创作者（个人 IP、企业号矩阵）。

**与 ContentOps 的关系**：
- ContentOps 负责图文内容（公众号 / 小红书图文）
- video-ops 负责视频内容（抖音 / 小红书视频 / 视频号）
- 两者共享 LLM Gateway 作为 AI 图片生成调用层
- LLM Gateway 无 TTS 能力，video-ops 独立使用 CosyVoice 3.0 MLX

**当前阶段**：原始 39 张 video-ops backlog 与后续 M3-M5 产品化闭环已完成；当前启动新 Linear Project `video-ops · 原始视频生产流水线`，目标是新增第二条 `raw_video_edit` 流水线。

**2026-06-28 新增执行边界**：
- 旧 `Video-Ops` Linear Project：`M0-M5` 已完成，当前无 active issue。
- 新 Linear Project：`video-ops · 原始视频生产流水线`，ID `c55541f4-c540-4ee0-8c22-3c5fb3819401`。
- 新 P0 范围：`VIDEO-RAW-M0` 到 `VIDEO-RAW-M6`，共 29 张 issues，Linear 编号 `JOH-141` 到 `JOH-169`。
- 新主线不是优化现有 `script_to_video`，而是新增 `raw_video_edit`：原始视频 -> 转写 -> 剪辑计划 -> 包装动效 -> 平台成片。
- 本地执行镜像：`video-ops/docs/linear/raw-video-pipeline.md`。
- 当前已完成：`JOH-141` 到 `JOH-169`。其中 `JOH-158` 已将 EDL 片段真实裁切为可复用的 clip mp4，`JOH-159` 已将 approved clips 拼接为 `clean-edit.mp4`，`JOH-160` 已产出 `clean-edit-normalized.mp4` 与响度报告，`JOH-161` 已产出 clean edit 质量探测报告，`JOH-162` 已落地 `remotion/` 子工程并完成本地 composition smoke render，`JOH-163` 已将 `CleanKnowledgeTalk` 升级为结构化知识口播模板，`JOH-164` 已定义 Remotion props schema 与 raw-video 转换入口，`JOH-165` 已把主系统接入 raw-video renderer bridge，`JOH-166` 已将 OutputPackage 扩展为统一的 raw-video 交付包契约，`JOH-167` 已落地自动质量门报告，`JOH-168` 已落地 explainable AI Critic 报告，`JOH-169` 已将 raw-video 成片包在 Jobs 详情中可视化展示。
- 2026-06-28 新增关键收口：`raw_video_edit` 不再只是“模块都写完了”，而是已经补齐创建任务后的真实生命周期闭环验证。通过本地 `POST /api/raw-video/jobs -> GET /api/jobs/:id` 真实回归，确认任务可从 source video 自动推进到 final MP4 / metadata / supporting artifacts / Jobs detail package display。
- 这次真实回归额外抓到一个重要 bug：服务端在创建态运行 raw-video lifecycle 时，写入 `output/jobs/<jobId>/edl/edit-decision-list.json` 前没有确保 `edl/` 目录存在，导致任务会在 `render_failed` 失败。现已在 `server.mjs` 修复为写 EDL / metadata 前先自动创建父目录。
- 当前结论：`VIDEO-RAW-M0` 到 `VIDEO-RAW-M6` 已全部完成，而且 `raw_video_edit` 已具备真实 API 闭环可运行性；下一步不应凭空新增 backlog，而应基于新的产品目标或新 Linear milestone 再启动后续阶段。

### 1.1 当前本地可运行入口（2026-06-27）

- `http://localhost:3003/`：Wizard 配置页
- `http://localhost:3003/jobs`：任务管理面板
- `http://localhost:3003/storyboard`：Storyboard 预览页
- `http://localhost:3003/compliance-report`：合规报告导出页
- `http://localhost:3003/demo`：SSE 进度流演示页

### 1.2 已补齐的重要模块（2026-06-27）

- TextParser：Markdown / TXT fallback / manifest schema / scene hash / prompt hash
- Image：GPT Image / wanx B-roll / cache / quality gate
- Audio：CosyVoice client / clone / quality gate / BGM preset library
- Video：timeline assembler / render plan / platform metadata / output package
- Job Infra：queue guard / state machine / idempotency / progress stream / retry / interrupted recovery / error log
- Product UI：Wizard / Jobs / Storyboard / Compliance export / shared Zen shell
- Delivery：Compliance report JSON + PDF export

---

## 2. 技术栈（已确认）

| 维度 | 选型 |
|------|------|
| 前端框架 | Next.js + TypeScript |
| 后端 Worker | Python（BullMQ 任务驱动）|
| 数据库 | Prisma + PostgreSQL（Docker）|
| 任务队列 | BullMQ + Redis |
| 图片生成 | GPT Image 2 + wanx-v1（经 LLM Gateway，wanx 异步 X-Dashscope-Async）|
| TTS | CosyVoice 3.0 MLX（mlx-audio v0.4.4+，本地 M4 推理）|
| 字幕 | mlx-audio Whisper STT（本地）|
| 视频渲染 | FFmpeg + MoviePy |
| 进度推送 | SSE + WebSocket Fallback |

### 2.1 关键外部依赖

| 依赖 | 安装方式 | 备注 |
|------|---------|------|
| FFmpeg | `brew install ffmpeg` | 必须 |
| mlx-audio | `pip install mlx-audio` | TTS + STT，v0.4.4+ |
| CosyVoice 模型 | mlx-audio 自动下载 | ~1.2 GB（4-bit 量化）|
| **LLM Gateway** | 本地运行 `npm start`（port 3000）| GPT Image 2 + wanx-v1（异步，2026-06-22 接入）|
| Redis | Docker | BullMQ 依赖 |
| PostgreSQL | Docker | 开发环境 |

### 2.2 环境基线（2026-06-22 验证通过）

| 组件 | 实际状态 | 验证方式 |
|------|---------|---------|
| **macOS** | 15.2 (arm64, Apple M4) | `sw_vers / uname` |
| **FFmpeg** | 8.1 + 21 个 homebrew 依赖齐全 | `ffmpeg -version` exit 0 |
| **Docker Desktop** | daemon running | `docker ps` 列出 2 个容器 |
| **PostgreSQL** | 已在 5432/5433 端口运行 | `contentcreator-db`, `contentcreator-db-test` |
| **LLM Gateway** | http://localhost:3000, Next.js 16.2.6 | `npm start` 后台运行 |
| **GPT Image 2** | ✅ 可用（packycode-image relay） | 实测 ~21s 生成 1024x1024 |
| **wanx-v1** | ✅ 可用（异步 X-Dashscope-Async） | 2026-06-22 接入完成 |
| **Imagen / Flux / DALL-E 3** | ❌ enabled=false | 备选 V2 |
| **Python** | 3.11.15 (conda env: video-ops-py) | `/opt/homebrew/bin/conda run -n video-ops-py python --version` |
| **mlx-audio** | 待安装（Sprint 0 P4 模块时） | — |

### 2.3 关键事实修正（影响 PRD 决策）

**PRD 第 3 条"AI 图片模型：GPT Image 2 + Wanx2.1" 修正（2026-06-22 阶段 1.2 完成）**：

- GPT Image 2：✅ 可用（packycode-image relay，实测 ~21s）
- wanx-v1：✅ 可用（异步 X-Dashscope-Async，2026-06-22 接入）
- dall-e-3 / imagen-3 / flux-1.1-pro：❌ enabled=false，V2 备选

**影响范围**：
- P2 ImageGenerator：✅ 用 gpt-image-2（已验证）
- P3 BrollGenerator：✅ 可用 wanx-v1 生成中国风装饰图（差异化达成）

**本节待办（2026-06-22 完成）**：✅ Sprint 0 已在 PRD.md §2 "技术栈"和 §5.2 "P2/P3 模块"更新为此修正。

### 2.4 Git 基座就绪（2026-06-22 13:00）

| 项 | 状态 | 验证 |
|---|------|------|
| 仓库 | https://github.com/JohnSince2019/video-ops.git | `git ls-remote` HEAD 命中 82746bd |
| 本地分支 | `main` + `dev` | `git branch -vv` |
| 远程分支 | `dev` 已推送 | `git push -u origin dev` exit 0 |
| 凭证机制 | HTTPS + macOS Keychain 缓存 PAT | `git ls-remote` 无需交互 |
| .gitignore | 通用模板（Node/Python/IDE/调试/ML 模型）| 已提交 |
| README.md | 项目说明 + 技术栈 + 状态指针 | 已提交 |
| CHANGELOG.md | Keep a Changelog 格式 | 已提交 |
| main 保护 | **未配置**（Web UI 操作）| 待办 |
| main 推送 | **未推送**（等保护配置完）| 待办 |

**首次 commit hash**：`82746bd chore: project init`（6 files / 1367 insertions）

**AI 协作约定（本节新增）**：
- 任何代码改动**当天必须 commit**（指南 §1.4）
- commit message 走 Conventional Commits：`feat / fix / docs / chore / refactor / test`
- dev 分支可直接 push；main 分支必须 PR
- MEMORY.md / CHANGELOG.md 与代码同步更新

---

## 3. 已确认技术决策（10 条 + 7 条 = 17 条）

以下决策已固化，不需要再讨论：

### 3.1 10 条 PRD 决策（产品/技术/架构）

1. **视频规格**：竖屏 1080x1920（9:16）/ 横屏 1920x1080（16:9），30 FPS，H.264，8 Mbps
2. **技术栈**：Next.js + TypeScript + Prisma + PostgreSQL + BullMQ + FFmpeg
3. **AI 图片模型**：GPT Image 2 + wanx-v1 via LLM Gateway（2026-06-22 wanx-v1 接入完成）
4. **TTS 方案**：CosyVoice 3.0 MLX 本地推理（M2 Max+，RTF ~0.5）
5. **ContentManifest JSON Schema v1**：标准入口格式（见 PRD.md §5）
6. **多平台规格矩阵**：抖音（15min/<100MB）/ 小红书（5min/<500MB）/ 视频号（30min/<1GB）
7. **JobState 状态机**：QUEUED → PARSING → AI_PROCESSING → ASSEMBLING → RENDERING → POST_PROCESSING → COMPLETED
8. **三档渲染 profile**：draft（720p/24fps/4Mbps）/ standard（1080p/30fps/8Mbps）/ high_quality（4K/60fps/12Mbps）
9. **中间产物保留策略**：所有 P1-P9 产出保留在 `assets/` 目录，便于排查
10. **断点续跑设计**：每个 P 模块完成后写入 `lastCheckpoint`，Worker 重启后扫描并续跑

### 3.2 7 条拍板决策（2026-06-22 拍板）

| # | 决策 | 实施细节 |
|---|------|---------|
| Q1 | **唇形同步：V2 再做** | V1 不包含，P5 LipsyncEngine 留 stub 但不调用任何模型 |
| Q2 | **BGM 音乐库：Pixabay Music** | 商用免费，预设 20 首 BGM（在 `assets/bgm/`），无需 API key |
| Q3 | **分发 API：V2 再做** | V1 只输出 MP4 + 封面 + 元数据，发布走手动上传 |
| Q4 | **用户认证：owner token** | HTTP header `X-Owner-Token`，DB 存 sha256 hash（不存明文）|
| Q5 | **合规检查：本地规则** | 正则 + 关键词黑名单（政治敏感/违禁词/版权），Worker 端执行 |
| Q6 | **Storyboard 可调：文字+字幕+转场** | 3 类可调，预览页实时切换，P6 渲染前应用 |
| Q7 | **前端 UI 风格：ContentOps Zen** | 复用 Zen 设计 tokens（间距/颜色/字体），开发更快 |

---

## 4. 开放决策项（已全部拍板）

> Sprint 0 开始前必须确认，否则影响 Epic 1/2 实现方向。
> **状态：7/7 全部拍板（2026-06-22），可启动 Sprint 0。**

详细拍板内容见 §3.2 第 11-17 行。

---

## 5. Pipeline（P1-P9，已确认）

```
INPUT（ContentManifest）
  ↓
P1 TextParser    → 解析 → SceneGraph
  ↓
P2 ImageGenerator → GPT Image 2 生成分镜图（经 LLM Gateway）
  ↓
P3 BrollGenerator → wanx-v1 生成装饰图（经 LLM Gateway）
  ↓
P4 TTSClient     → CosyVoice 3.0 MLX 配音合成（本地）
  ↓
P5 LipsyncEngine → 唇形同步（V1 不做，延后）
  ↓
P6 VideoAssembler → 按时间线组装片段 + 转场
  ↓
P7 SubtitleGenerator → Whisper STT 字幕（mlx-audio，本地）
  ↓
P8 AudioMixer    → 配音 + BGM 混音
  ↓
P9 Renderer      → FFmpeg 最终合成 MP4
  ↓
OUTPUT（MP4 + 封面 + 元数据 + 合规报告）
```

**重试策略**：任意 P 步骤失败，自动重试 3 次，间隔 5s / 15s / 60s。

---

## 6. 目录结构

```
video-ops/
├── CLAUDE.md                   ← AI 启动入口
├── MEMORY.md                   ← 本文件
├── CHANGELOG.md               ← 变更记录（尚未创建）
├── .gitignore
├── .github/workflows/          ← CI/CD（尚未创建）
├── .cursor/rules/             ← AI 协作规则（尚未创建）
├── scripts/                    ← 运维脚本（尚未创建）
├── docs/
│   ├── PRD.md                 ← 产品需求文档 v1.0
│   ├── ARCHITECTURE.md        ← 架构文档（尚未创建）
│   └── decisions/              ← ADR 决策记录（尚未创建）
├── prisma/
│   └── schema.prisma          ← PostgreSQL schema（尚未创建）
├── app/                       ← Next.js 前端（尚未创建）
│   ├── page.tsx
│   ├── wizard/               ← 视频制作向导
│   ├── jobs/                 ← 任务管理
│   └── settings/
├── lib/                       ← 业务逻辑（尚未创建）
├── worker/                    ← Python Worker（尚未创建）
│   ├── main.py
│   ├── pipeline/             ← P1-P9 各处理模块
│   └── validators/           ← 质量校验
├── assets/                    ← 媒体文件（gitignore，不提交）
│   ├── generated/
│   ├── cache/
│   ├── audio/
│   ├── video/
│   └── output/
└── tests/                    ← 测试（尚未创建）
    ├── unit/
    └── e2e/
```

---

## 7. 已知问题与限制（V1 明确不做）

以下功能延后到 v2：

- 唇形同步（Lipsync）：Feature 2.3，依赖额外模型
- 多平台一键发布 API：Epic 5
- NextAuth 完整用户体系：V1 用 owner token 隔离
- 国际化（i18n）：硬编码中文，v2 再迁移
- 视频编辑软件级别的手动剪辑：Storyboard 预览为最终形态
- 分发层 API：V2 再做

---

## 8. AI 协作约定

### 8.1 AI 必须做

1. **任何代码修改后**，追加到 MEMORY.md 对应分类
2. **每次发现新 bug**，记录到 MEMORY.md "已知问题" 分类
3. **每次做出新决策**，如不在 ADR 目录则记录到 MEMORY.md "技术决策" 分类
4. **PRD 更新时**，同步更新 MEMORY.md 的对应章节
5. **跨项目发现**，同步更新 WORKSPACE_MEMORY.md

### 8.2 AI 不能做

- 不能在 Sprint 0 前假设 Q1-Q7 的答案（这些是需要用户拍板的）
- 不能假设已有文件存在（先 `ls` / `grep` 验证再引用）
- 不能在没有文件证据时说"这段代码在某处"

### 8.3 每日沉淀约定（**新增 2026-06-22 13:45**）

> **触发条件**：用户说"今天就这样了，明天继续"或同义表达（"收工"、"暂停"、"结束并沉淀"）

**AI 收到触发词后，必须按 4 步执行**：

| 步骤 | 动作 | 产出 |
|------|------|------|
| 1 | 写"今日会话总结"到 MEMORY.md（追加时间戳小节） | MEMORY |
| 2 | 核查 MEMORY 工作清单覆盖率，生成**翻译报告**到 `content/` | `content/YYYY-MM-DD-DayN-翻译报告.md` |
| 3 | **询问用户写哪篇**：叙事稿 / 翻译报告 / 两个都要 | 用户决策 |
| 4 | commit + push dev 分支（指南 §1.4 强制） | Git |

> **关于翻译报告**：每次会话结束后，AI 必须对照 MEMORY.md 记录的全部工作项，检查 `content/` 已有的素材覆盖率，并输出一份结构化的翻译报告。这份报告显式记录"选了哪几个工作段入稿、丢了哪几个、为什么"——**这条隐式决策本身就是值得发布的素材**。

**翻译报告格式模板**（每次复制填入）：

```markdown
---
title: 翻译报告：Day N — MEMORY → 素材
date: YYYY-MM-DD
tags: [素材层, 翻译报告]
series: AI 图文短视频自动混剪系统开发与变现实录
status: 素材 v0（仅存档，非发布版）
---

## 今日 MEMORY 工作清单（X 项）

- [列出本次会话 MEMORY 记录的全部工作项]

## 素材覆盖率检查

| # | 工作项 | 是否入稿 | 入稿角度 | 读者为什么需要知道 |
|---|-------|---------|---------|-----------------|
| 1 | ...   | ✅ 是   | AI协作教训 | 演示"AI自信=核查义务" |
| 2 | ...   | ❌ 否   | —           | 被叙事框架过滤        |

## 被放弃的项（X 项）及原因

| # | 工作项 | 放弃原因 | 是否归入下篇 |
|---|-------|---------|------------|
| 1 | ...   | 在"教训文"框架里天然没有位置 | 是（可写PRD决策复盘）|

## 本篇叙事框架选择说明

- 选了哪个角度：...
- 为什么这个角度最适合今天的读者：...
- 哪些工作项在这个框架里天然是"噪音"：...

## 翻译损失清单

- 这篇漏掉了 **X 项**有价值的洞察
- 其中 **Y 项**是"过程洞察"（决策过程、踩坑、误判）
- 处理方式：[归入下篇 / 写进翻译报告 / 放弃]
- 最有价值但被放弃的一项是：...

## 公众号标题候选

- 《...》
- 《...》
```

**注意**：ROADMAP 版本号同步已纳入 AI 每次写 MEMORY 总结时的标准动作（见 §4.1.2），无需在 §8.3 单独列为一个步骤。

**公众号文章纪律**（§8.3.1）：
- **草稿默认落盘**到 `content/YYYY-MM-DD-主题.md`
- **AI 不替你发布**（用户审核前不动手推公众号）
- **TOC 优先级**：roadmap 当前阶段 > 公众号 > 业务讨论
- **不要在 roadmap 进行中发"蓝图文"**：等 Sprint 结束再发"进度文"
- **AI 不绕过 ContentOps wizard**（§8.3.2）：所有公众号发布必须经 wizard s1-s10 流程

**AI 不绕过 ContentOps wizard**（§8.3.2 — **新增 2026-06-22 14:35**）：

> **AI 在素材层（`/Users/john/Desktop/AI/Solutions/content/`）起草"素材 v0"是允许的。**
> **AI 永远不能在生产层（ContentOps wizard）替代用户跑 wizard。**
> **AI 永远不能直接把"素材 v0"标为"已发布"。**

原因：
1. ContentOps wizard 是**用户驱动的 10 步流程**，AI 无法替代 UI 操作
2. wizard 每步有 stepEvaluatorPrompts（key 从 2 开始，见 ContentOps briefing §3.2）评估质量
3. AI 跳过评估 = 跳过质量门 = 损害"品牌沉淀"目标
4. AI 不能访问 localhost:3002（ContentOps briefing §AI 不能做 #1）

**正确流程**：
```
1. AI 起草素材 v0 → `/Users/john/Desktop/AI/Solutions/content/YYYY-MM-DD-DayX-主题.md`
2. AI 提示用户："素材 v0 已就绪，请复制到 ContentOps wizard Step 1"
3. 用户在 UI 跑 wizard s1-s10（AI 不能替代）
4. AI 收到"已发布"信号后，更新素材 status: 素材 v0 → 素材 v2（已发布）
```

**反例**（AI 今天犯的错误，已记录在 Day 0 素材 v0 frontmatter）：
```
❌ AI 直接写"我替你写好了，可以直接发"
❌ AI 把素材 status 标为"草稿（待审）"而非"素材 v0（仅存档）"
❌ AI 没提示"需走 ContentOps wizard"
```

**为什么不写进 MEMORY 容易丢**：
- 公众号节奏最常见的失败模式是"承诺 → 拖延 → 死"
- 把节奏**显式化为触发词 + 4 步**可极大降低失约概率
- 用户今早 6 月 22 日决定启动公众号系列，但因为"想得太多"差点错过当天 Day 0 草稿

---

## 9. 公众号系列状态（**新增 2026-06-22 13:45**）

> 系列名：AI 图文短视频自动混剪系统开发与变现实录
> 起点：本会话决定启动
> 节奏：用户每日触发"今天就这样了"时，由 AI 起草草稿 + 翻译报告，用户决定写哪篇

| 维度 | 状态 |
|------|------|
| 业务线 | **已激活**（2026-06-22 13:45）|
| 终点目标 | 品牌沉淀（非直接变现）|
| 发布节奏 | 一天两篇（一周 14 篇）— 见 §8.3 |
| 第 1 篇 | 《当我让 AI 列"已完成的工作"，它漏了一半》— `content/2026-06-22-Day0.md` |
| 第 1 篇状态 | **素材 v0，pending wizard** |
| 第 2 篇 | 《技术日志和公众号之间，我掉了多少东西》— `content/2026-06-22-Day0-翻译报告.md` |
| 第 2 篇状态 | **素材 v0，pending wizard** |
| 用户决策 | 两个都要发（2026-06-22 20:56）|

### 公众号文章存哪里

```
video-ops/
  content/
    2026-06-22-Day0.md          ← 公众号第 1 篇草稿
    2026-06-XX-<主题>.md        ← 后续文章
    _template.md                 ← （待补）写作模板
```

### 公众号文章必须包含的元数据（frontmatter）

```yaml
---
title: 标题
subtitle: 副标题
date: YYYY-MM-DD
tags: [标签1, 标签2]
series: 系列名
episode: 编号（三位）
status: 草稿/已发布
target_word_count: 字数
---
```

### 双轨并存机制（**新增 2026-06-22 14:35**）

> 公众号系列**不绕过 ContentOps wizard**。但 AI 起草的素材**不能直接发布**。

| 层 | 位置 | 职责 | 谁写 |
|---|------|------|------|
| **素材层** | `/Users/john/Desktop/AI/Solutions/content/YYYY-MM-DD-DayX-主题.md` | 记录原始事件 / 关键细节 / 待组织材料 | AI 起草（草稿） |
| **生产层** | ContentOps wizard（s1-s10） | 10 步分步骤生成 + 评估 + 发布 | 用户在 UI 跑 wizard |

**素材 → 生产的转化流程**：

```
素材 v0（`/Users/john/Desktop/AI/Solutions/content/`）
    ↓ 用户把素材内容复制到 ContentOps wizard Step 1（素材收集）
    ↓ wizard 10 步分步生成（s1→s10）
    ↓ 每步通过 evaluateStep 评估（key=stepIdx+2，参见 ContentOps briefing §3）
    ↓ s10 发布到微信公众号
```

**为什么不让 AI 直接写发布版**：
1. ContentOps prompt v3.0 有**活人感/散文风/江湖气/啊哈瞬间/暗线**5 大创作基因（ContentOps briefing §Prompt 版本现状），AI 单次生成无法达到
2. wizard 的 stepEvaluatorPrompts **强制 6 维评估 + 3 大硬规则**（ContentOps briefing §v2.0）
3. 缺评估 = 缺质量保证 = 公众号读者体验崩塌
4. AI 跳过 wizard = 跳过质量门 = 损害品牌（与"品牌沉淀"目标冲突）

**素材层文件命名规范**（强制）：

```
YYYY-MM-DD-Day{N}-{主题}.md

例：
  2026-06-22-Day0-ai-collaboration-miss.md
  2026-06-23-Day1-image-model-matrix-sync.md
```

**素材层与生产层状态映射**：

| 素材层 status | 生产层 production_status | 含义 |
|--------------|--------------------------|------|
| 素材 v0 | 未启动 | AI 起草完毕，未进 wizard |
| 素材 v1 | 进行中 | 用户正在跑 wizard sN |
| 素材 v2 | 已发布 | 已发到公众号，保留素材作为历史 |

### 公众号系列与 roadmap 的关系

- **TOC 优先级**：roadmap 当前阶段 > 公众号 > 业务讨论
- **公众号素材来源**：roadmap 实际进展（不是"未来计划"）
- **公众号文章不进入 roadmap DoD**（不是工程任务）

---

## 9. 快速启动命令（待补充）

> Sprint 0 创建目录结构后补充

```bash
# 尚未验证，以下为预期命令
brew install ffmpeg
pip install mlx-audio
docker compose up -d   # Redis + PostgreSQL
npm install
npx prisma migrate dev
npm run dev            # Next.js 前端
python worker/main.py  # Python Worker
```

---

## 10. 参考文档

| 文档 | 位置 |
|------|------|
| PRD v1.0 | `video-ops/docs/PRD.md` |
| Workspace 全局记忆 | `WORKSPACE_MEMORY.md` |
| AI 安全开发指南 | `新项目_ai_安全开发指南_78e7994e.plan.md` |

---

## 2026-06-22：PRD v1.0 拍板完成（Q1-Q7 全部确认）

### 拍板内容（7 条）

| # | 问题 | 决策 |
|---|------|------|
| Q1 | 唇形同步 | V2 再做 |
| Q2 | BGM 音乐库 | Pixabay Music（预设 20 首）|
| Q3 | 分发 API | V2 再做（V1 只输出 MP4）|
| Q4 | 用户认证 | owner token 隔离（HTTP header）|
| Q5 | 合规检查 | 本地正则 + 关键词黑名单 |
| Q6 | Storyboard 参数 | 文字 + 字幕样式 + 转场 |
| Q7 | 前端 UI 风格 | 复用 ContentOps Zen 设计 |

### 文档变更

- `PRD.md`：§12 开放决策项标记为已拍板 + §17 执行前提更新 + 文档状态更新为"已拍板"
- `MEMORY.md`：开放决策项挪到 §3.2 已确认决策，原 §4 标注"全部拍板"
- `WORKSPACE_MEMORY.md`：video-ops 状态从"Sprint 0 未开始"更新为"PRD 拍板完成，可启动 Sprint 0"

### Sprint 0 启动条件

- [x] PRD v1.0 拍板
- [x] 外部依赖验证（mlx-audio + CosyVoice 模型下载 + LLM Gateway wanx-v1 调用）— GPT Image 2 ✅ + wanx-v1 ✅（2026-06-22 接入完成），mlx-audio 待装（roadmap §3.1.1）
- [x] 项目骨架创建（.gitignore / README.md / CHANGELOG.md / dev 分支 / GitHub 远程）— 2026-06-22 13:00 完成
- [ ] branch protection 配置（main 禁直推，需 PR）— 2026-06-22 13:25 user 标记 done
- [ ] AI 协作骨架（CLAUDE.md / .cursor/rules / Prisma schema 初始化）— **未启动**，归属阶段 1.3 或 1.4，**不是 Git 仓库骨架**

---

## 2026-06-22 13:25：阶段 1.1 Git 基座收尾 + roadmap 全量回填

### 本次会话做了什么（4 个工作段）

#### 工作段 1：roadmap 全量回填遗漏

用户提问："roadmap 中是否漏掉我们已经完成的修复 FFmpeg 和 Python 环境等任务？"

**真相查证**（不是凭印象）：
- 读 `MEMORY.md §2.2`：2026-06-22 已验证 7 项环境基线
- 读 `WORKSPACE_MEMORY.md` + `PRD.md`：确认外部引用

**roadmap v0.1 漏掉的 3 块**：
1. 已完成 7 项环境基线（FFmpeg/Python/Docker/PostgreSQL/Gateway/gpt-image-2）未记录
2. mlx-audio 安装任务完全缺失（PRD P4 阻塞依赖）
3. §3.1 "docker-compose up" 与事实矛盾（PostgreSQL 已在 5432/5433 跑）

**修正动作**：
- 新增 §0.5 起点状态快照（已就绪 7 + 待补齐 3 + 关键事实修正）
- 新增 §3.1.1 mlx-audio 安装任务
- §3.1 DoD 改为"验证现有容器 + 补 backup"
- §3.3 风险行加 mlx
- roadmap 升 v0.1.2

#### 工作段 2：微信公众号系列挂起

用户提出："把开发 video-ops 过程做成公众号系列：AI 图文短视频自动混剪系统开发与变现实录"。

**AI 提议 5 层架构**（内容资产 / 生产工具 / 视频载体 / 元叙事 / 商业变现）+ 4 个核心机会 + 4 个风险预警。

**用户 4 项决策**：
| 维度 | 决策 |
|------|------|
| 终极目标 | 品牌沉淀（非直接变现） |
| 发布节奏 | 一周两篇 |
| 起篇 | 动机文 |
| AI 角色 | 按 SOP 全力执行 |

**用户后续说"先暂停，回到 roadmap"**——5 个相关 TODO 全部 cancelled，业务线挂起。
**教训**：构想可以大讨论，**TOC 必须是 roadmap 当前阶段**。分心是最大的失败模式。

#### 工作段 3：阶段 1.1 Git 基座

**5 个关键决策**（经用户确认）：
| 决策 | 选择 |
|------|------|
| 仓库边界 | 仅 video-ops 独立仓（不 monorepo） |
| 远程协议 | HTTPS + macOS Keychain（**非 SSH**）|
| git 身份 | global（user.name=JohnSince2019, user.email=johnsince2019@gmail.com） |
| 仓库创建 | Web UI（用户手操 30 秒）|
| 仓库地址 | https://github.com/JohnSince2019/video-ops.git |

**真相查证关键节点**：
- 用户原话"我之前推送过 ContentOps，没提供任何凭证" → AI 假设 SSH
- 核查 `~/.ssh/` → **无任何 key**（理论 SSH 必败）
- 核查 `llm-gateway-provider/.git/config` → 实际是 HTTPS 远程
- 验证 `git ls-remote https://...` → **exit 0，Keychain 凭证命中**
- 修正方案：放弃 SSH，**继续用 HTTPS + Keychain 缓存的 PAT**

**执行 7 步**：
1. `git config --global user.name/email` ✅
2. 用户 Web UI 创建 GitHub 空仓 ✅
3. `git ls-remote` 验证可访问 ✅
4. 创建 3 个文件：.gitignore（通用 Node/Python/IDE/ML 模板）/ README.md / CHANGELOG.md ✅
5. `git init` + `git add` + `git commit -m "chore: project init"` → **82746bd** ✅
6. `git checkout -b dev` + `git remote add origin` ✅
7. `git push -u origin dev` → 推送成功，Keychain 自动通过 ✅

**额外 commit**：
- `eb0dfac docs: 记录阶段 1.1 Git 基座完成`（MEMORY §2.4 + ROADMAP 升 v0.1.3）

#### 工作段 4：用户报 "done" 完成 main 保护 + 推送

用户报告 branch protection 配置完成、main 已推送。AI 无从直接核查（**这是信任点，下次会话可让用户截图确认**）。

### 本次会话沉淀的 5 个可复用经验

1. **"已完成的事必须显式记录"**：roadmap v0.1 漏了 7 项环境基线，是典型的"开发日志失忆"——已用 §0.5 起点状态快照纠正
2. **"用户记忆不等于系统状态"**：用户说"没提供凭证" ≠ 实际机制。永远以 `git ls-remote` 实测为准
3. **"猜测时停下来核查"**：SSH key 不存在时**没有继续假设**而是切 HTTPS 方案，节省了 5 分钟
4. **"业务大讨论 TOC 必须回到 roadmap"**：公众号系列讨论后用户主动拉回，AI 立即 TODO 取消+挂起
5. **"跨会话的协作约定必须写在 MEMORY"**：今天加了"任何代码改动当天必须 commit" + "MEMORY/CHANGELOG 同步"（§2.4 AI 协作约定子节）

### 下次会话起点（重要：避免重新调研）

**阶段 1.3 完成**（2026-06-22 15:30），下一阶段待定：
- 检查 ROADMAP.md §阶段 2 或 §1.3 后续

**前置核查**（AI 接手必做）：
- 读 `video-ops/MEMORY.md` §最后更新（找当前阶段状态）
- 读 `WORKSPACE_MEMORY.md §4.1`（video-ops 跨项目上下文）
- 读 `video-ops/docs/ROADMAP.md`（找当前阶段 DoD）

**当前最新 commit**：
- video-ops：f9908bf (origin/dev) + main 分支（user 推送，AI 未直接验证）
- llm-gateway-provider：aef7040 (origin/main)

---

*本文件由 AI 维护。任何项目决策（无论大小）都应追加到本文件对应分类下。*

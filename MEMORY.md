# MEMORY.md — video-ops 项目跨会话记忆

> **本文件由 AI 维护。任何 AI 在开始 video-ops 相关会话时，必须先读本文件。**
> **不读本文件开始对话 = 必然失智。**
> **同时请先读 WORKSPACE_MEMORY.md 了解跨项目上下文。**

最后更新：2026-06-22 13:25（**Sprint 0 进行中**：阶段 1.1 Git 基座完成，dev 推送，main 推送+保护已 done，阶段 1.2 待启动）

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

**当前阶段**：PRD v1.0 已拍板（Q1-Q7 全部确认），可以启动 Sprint 0。

---

## 2. 技术栈（已确认）

| 维度 | 选型 |
|------|------|
| 前端框架 | Next.js + TypeScript |
| 后端 Worker | Python（BullMQ 任务驱动）|
| 数据库 | Prisma + PostgreSQL（Docker）|
| 任务队列 | BullMQ + Redis |
| 图片生成 | GPT Image 2 + Wanx2.1-t2i-plus（经 LLM Gateway）|
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
| LLM Gateway | 本地运行 `npm start`（port 3000）| GPT Image 2 + Wanx2.1 |
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
| **GPT Image 2** | ✅ 可用（packycode-image relay） | 实测 23s 生成 1024x1024 |
| **Wanx2.1 / Imagen / Flux / DALL-E 3** | ❌ 全部不可用 | provider enabled=false 或缺 API key |
| **Python** | 3.11.15 (conda env: video-ops-py) | `/opt/homebrew/bin/conda run -n video-ops-py python --version` |
| **mlx-audio** | 待安装（Sprint 0 P4 模块时） | — |

### 2.3 关键事实修正（影响 PRD 决策）

**PRD 第 3 条"AI 图片模型：GPT Image 2 + Wanx2.1" 需要修正：**

- 实测发现 **Wanx2.1 在当前 LLM Gateway 完全不可用**（wanx provider enabled=false，无 API key）
- **dall-e-3 / imagen-3 / flux-1.1-pro / flux-schnell 同样全部不可用**
- 当前 LLM Gateway **唯一可用的图片模型是 `gpt-image-2`**（来自 `packycode-image` relay）

**影响范围**：
- P2 ImageGenerator：✅ 用 gpt-image-2（已验证）
- P3 BrollGenerator：⚠️ 原计划用 Wanx2.1 → 改用 gpt-image-2（复用，差异化靠 prompt 工程）
- 这会让 P2 + P3 视觉同质化，V2 时再接入更多图模

**待办**：Sprint 0 在 PRD.md §2 "技术栈"和 §5.2 "P2/P3 模块"加入此修正。

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
3. **AI 图片模型**：GPT Image 2 + Wanx2.1 via LLM Gateway（PackyCode）
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
P3 BrollGenerator → Wanx2.1 生成装饰图（经 LLM Gateway）
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
- [ ] 外部依赖验证（mlx-audio + CosyVoice 模型下载 + LLM Gateway Wanx2.1 调用）— 实际状态：Wanx2.1 不可用（见 §2.3），mlx-audio 待装（roadmap §3.1.1）
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

**阶段 1.2 实际任务**（**不是**原 PRD 的"加 DashScope"，是**实际验证**）：
- 在 **llm-gateway-provider 仓库**（不是 video-ops）加 `qwen-image-plus` provider
- 通过 DashScope OpenAI 兼容模式
- 替换原计划的 Wanx2.1（MEMORY §2.3 已确认不可用）
- 创建分支 `feat/qwen-image-plus`（base: llm-gateway-provider/main）+ PR
- video-ops 仓库这周**不动**

**前置核查**（AI 接手必做）：
- 读 `video-ops/MEMORY.md` §2.4 + §3（Git 基座状态 + 17 条决策）
- 读 `WORKSPACE_MEMORY.md §4.1`（video-ops 跨项目上下文）
- 读 `llm-gateway-provider/MEMORY.md`（如有）+ 检查 main 分支是否最新
- 读 `llm-gateway-provider/app/api/v1/models/route.ts`（已确认有 wanx2.1 注册）
- 确认 DashScope API key 已在 `~/.zshrc` 或 .env（**用户问题：之前有过吗？**）

**当前最新 commit**：
- video-ops：eb0dfac (origin/dev) + main 分支（user 推送，AI 未直接验证）
- llm-gateway-provider：2d31b74 (origin/main)

---

*本文件由 AI 维护。任何项目决策（无论大小）都应追加到本文件对应分类下。*

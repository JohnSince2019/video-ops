# video-ops Roadmap（实施路径图）

> **文档状态**：草案 v0.2.0（2026-06-22 15:25，**阶段 1.2 完成**：wanx-v1 async 图片生成接入 + DoD 全部通过）
> **最后更新**：2026-06-22 15:25
> **维护者**：John
> **依赖**：PRD v1.0（已拍板）、WORKSPACE_MEMORY.md（§4.1 video-ops 状态）
> **新仓库**：https://github.com/JohnSince2019/video-ops.git
>   - dev：8fe2034 docs: 事实纠正 v0.1.7（wanx → Wanx2.1，不是 qwen-image-plus）
>   - main：已推送（user 标记 done；AI 未直接验证）
> **公众号系列**：《AI 图文短视频自动混剪系统开发与变现实录》— 2026-06-22 13:45 激活
> **生产方式**：双轨并存（素材层 + ContentOps wizard 生产层）
> **gateway 源码**：独立项目 `/Users/john/Desktop/AI/Solutions/llm-gateway-provider/`，**不在 video-ops 仓库**

---

## 0. 文档目的

把 PRD 的"做什么"翻译成"按什么顺序做"。每个阶段都包含：
- **输入**：前置条件（上一个阶段的产出）
- **产出**：本阶段交付物（代码 / 文档 / 配置 / commit）
- **完成定义 (DoD)**：可被验证的判定标准
- **风险**：本阶段最可能踩的坑

---

## 0.5 起点状态快照（2026-06-22 验证通过）

> **roadmap v0.1 漏掉了这节，v0.1.2 补上。** 完整事实依据见 `video-ops/MEMORY.md` §2.2。

### 已就绪（不需重做）

| 组件 | 实际状态 | 验证方式 | 复用方式 |
|------|---------|---------|---------|
| **macOS** | 15.2 (arm64, Apple M4) | `sw_vers / uname` | — |
| **FFmpeg** | 8.1 + 21 个 homebrew 依赖 | `ffmpeg -version` exit 0 | Worker 直接调用，**不再 `brew install`** |
| **Python** | 3.11.15（conda env: `video-ops-py`）| `/opt/homebrew/bin/conda run -n video-ops-py python --version` | Worker 必须在该 env 内运行 |
| **Docker Desktop** | daemon running | `docker ps` 列出 2 个容器 | 复用，不重建 |
| **PostgreSQL** | 已在 5432/5433 端口运行 | `contentcreator-db`, `contentcreator-db-test` | 复用现有容器，**不重新 docker-compose up** |
| **LLM Gateway** | http://localhost:3000，Next.js 16.2.6 | `npm start` 后台运行 | 复用 + 阶段 1.2 新增 dashscope 分支 |
| **GPT Image 2** | ✅ 可用（packycode-image relay）| 实测 23s 生成 1024x1024 | 主用图模 |
| **Git** | 未初始化（git detection 仍未 warm up）| `git status` 应报 not a repo | **阶段 1.1 唯一的环境基线任务** |

### 待补齐（roadmap 必须覆盖）

| 组件 | 状态 | 落地位置 |
|------|------|---------|
| **mlx-audio** | ❌ 待安装 | **阶段 3.3 显式任务：`pip install mlx-audio`（P4 TTSClient 用）** |
| **Wanx2.1 / Imagen / Flux / DALL-E 3** | ❌ 全部不可用 | 不修复，**改用阶段 1.2 接 dashscope** |
| **CosyVoice 3.0 模型** | ❌ 未下载 | 阶段 3.3（mlx-audio 装好后首次启动自动下载 ~1.2GB） |

### 关键事实修正（影响 Sprint 优先级）

- **gpt-image-2 是 LLM Gateway 当前唯一可用图模**（MEMORY §2.3）
- P2 ImageGenerator + P3 BrollGenerator 必须靠 prompt 工程做差异化（不能靠模型）
- 阶段 1.2 接 dashscope 后，V1.1 可选给"中国风"场景用 qwen-image-plus

---

## 1. 阶段全景

```
┌─────────────────────────────────────────────────────────────┐
│ 阶段 1：基础设施 (Infrastructure)         ⬅ 当前起点         │
│   ├─ 1.1 Git 基座                                       │
│   ├─ 1.2 LLM Gateway DashScope 接入                       │
│   └─ 1.3 图模矩阵文档同步                                  │
├─────────────────────────────────────────────────────────────┤
│ 阶段 2：任务管理 (Project Management)                        │
│   ├─ 2.1 Backlog 拆解                                     │
│   ├─ 2.2 Linear 导入                                      │
│   └─ 2.3 Milestone / Cycle 配置                            │
├─────────────────────────────────────────────────────────────┤
│ 阶段 3：Sprint 0 - 工程基线 (Engineering Baseline)            │
│   ├─ 3.1 仓库结构 / 依赖 / Docker                          │
│   ├─ 3.2 CI / Lint / Test 骨架                             │
│   ├─ 3.3 视频生成核心流水线骨架（不入库）                    │
│   └─ 3.4 Roadmap v1.0 文档定稿                             │
├─────────────────────────────────────────────────────────────┤
│ 阶段 4：AI 安全开发指南 (AI Safety Baseline)  ⬅ 待确认      │
│   └─ 4.1~4.N 具体子项待 1.3 完成后定义                      │
├─────────────────────────────────────────────────────────────┤
│ 阶段 5：Backlog Sprint N (Feature Delivery)                   │
│   ├─ 5.1 Sprint 1：MVP 核心（P0 任务）                      │
│   ├─ 5.2 Sprint 2：质量 & 体验                              │
│   └─ 5.3 ...                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 阶段 1：基础设施（预计 0.5 - 1 个工作日）

### 1.1 Git 基座初始化

| 项 | 说明 |
|------|------|
| 输入 | Solutions/ 根目录无 git 仓库（git detection 仍未 warm up） |
| 产出 | `.git/` 初始化完成 + 首次 commit |
| DoD | `git log` 显示至少 1 条 commit；`git status` 干净 |
| 操作 | `git init` → 写 `.gitignore` → `git add . && git commit -m "chore: initial workspace structure"` |
| 风险 | 误提交 `node_modules`、`.env`、`*.db`、`.next/`；必须在 `.gitignore` 中显式排除 |

**.gitignore 必须包含的条目**：
```
node_modules/
.next/
dist/
build/
*.db
*.db-journal
.env
.env.local
.env.*.local
.DS_Store
*.log
.idea/
.vscode/
coverage/
out/
```

### 1.2 LLM Gateway 接入 wanx-v1（异步）

| 项 | 说明 |
|------|------|
| 输入 | 1.1 完成；PRD §2.3 指定 Wanx2.1-t2i-plus（调研发现已弃用）；实测 dashscope `/api/v1/models` 发现 wanx-v1 可用 |
| 产出 | `llm-gateway-provider` 新增 `callDashScopeAsync()` 分支；wanx provider type=image_async |
| DoD | ✅ **2026-06-22 15:20 通过**：wanx-v1 通过 Gateway 出图成功（200，1 张）；gpt-image-2 不受影响（200） |
| 改动量 | route.ts 新增 ~130 行；seed.ts 更新 4 处；runtime DB 改 3 处；integration-guide.md 更新 3 处 |

**真实 root cause**（2026-06-22 调研）：
- 原 `/compatible-mode/v1/images/generations` 一直 404（API Key 不支持同步）
- 正确路径：**异步模式** + `X-Dashscope-Async: enable`
- wanx2.1-t2i-plus/turbo 不在 dashscope `/api/v1/models` 列表中（已弃用）

**真实完成路径**：
1. 直接 curl `POST /api/v1/services/aigc/text2image/image-synthesis` + async header → PENDING task_id
2. `GET /api/v1/tasks/{task_id}` → SUCCEEDED，4 张 URL
3. 改 wanx provider：`type: image_async`，`baseUrl: https://dashscope.aliyuncs.com/api/v1`
4. 加 `callDashScopeAsync()`：submit `/services/aigc/text2image/image-synthesis`，poll `/tasks/{id}`
5. 重启 Gateway（dev 被禁，用 `npm run build && next start`），E2E 通过

**代码定位**：
- `llm-gateway-provider/app/api/auto/images/generations/route.ts`
- `llm-gateway-provider/prisma/seed.ts`
- `llm-gateway-provider/docs/integration-guide.md`

**PRD §2.3 修订**：图片生成从 "GPT Image 2 + Wanx2.1-t2i-plus" 修订为 "GPT Image 2 + wanx-v1"（异步）

### 1.3 图模矩阵文档同步

| 项 | 说明 |
|------|------|
| 输入 | 1.2 验证通过 |
| 产出 | 3 个文件更新 |
| DoD | ✅ **2026-06-22 15:40 通过**：所有 "Wanx2.1-t2i-plus" 替换为 "wanx-v1"，共 9 处修正，grep 验证无遗漏 |
| 涉及文件 | (1) `WORKSPACE_MEMORY.md` §3.1 / §4.1 (2) `video-ops/docs/PRD.md` 图模章节 (3) `video-ops/MEMORY.md` §3 |
| commit 策略 | 单个 commit：`docs: sync image-model matrix after dashscope integration` |

---

## 3. 阶段 2：任务管理（预计 0.5 个工作日）

### 2.1 Backlog 拆解

| 项 | 说明 |
|------|------|
| 输入 | PRD v1.0 + WORKSPACE_MEMORY §4.1 列出的 17 条决策 |
| 产出 | `video-ops/docs/BACKLOG.md`（新建） |
| DoD | 每个 user story 拆分成 ≥ 3 个独立 issue 颗粒（Dev / QA / Doc 三视角） |
| 拆分原则 | 每个 issue ≤ 2 人天；依赖关系显式标注（blocks / blocked by） |

### 2.2 Linear 导入

| 项 | 说明 |
|------|------|
| 输入 | 2.1 的 BACKLOG.md |
| 产出 | Linear Workspace `video-ops` Team 下创建对应 Project 与 Issues |
| DoD | Linear 上能看到所有 issue；与 BACKLOG.md 一一对应（带 `VIDEOOPS-N` 编号） |
| 字段 | Title / Description / Estimate / Priority / Labels / Parent (Epic) |
| 风险 | Linear API 调用频次限制；批量导入用 `linearisthq` CLI 而非 Web UI |

### 2.3 Milestone / Cycle 配置

| 项 | 说明 |
|------|------|
| 输入 | 2.2 issue 列表 |
| 产出 | Linear 上 Sprint 0 / Sprint 1 / Sprint 2 / ... 周期配置完成 |
| DoD | 每个 issue 都被分配到一个 Cycle，且 Cycle 起止日期明确 |
| 建议节奏 | 2 周一个 Sprint；每个 Sprint 容量上限 8-10 个 issue |

---

## 4. 阶段 3：Sprint 0 - 工程基线（预计 1 - 2 个工作日）

> Sprint 0 不是交付功能的 sprint，而是"让 Sprint 1 能开跑"的工程准备 sprint。

### 3.1 仓库结构 / 依赖 / Docker

| 项 | 说明 |
|------|------|
| 产出 | `video-ops/{api,worker,web}` 三模块拆分（或单 Next.js monorepo 二选一） |
| DoD | (1) `docker ps` 验证 PostgreSQL/Redis 已运行（**复用现有容器，**见 §0.5 起点快照） (2) `which ffmpeg` exit 0 (3) `conda run -n video-ops-py python --version` 报 3.11.15 (4) `docker-compose.backup.yml` 已创建（指南 §8） |
| 待决定 | 复用 ContentOps 的 Next.js 还是新建？决策记录到 MEMORY.md |
| 风险 | Python Worker 涉及 mlx-audio + CosyVoice MLX 等重型依赖；CosyVoice 首次启动下载 ~1.2 GB 模型，CI 镜像需排除 |
| **回填** | ~~"docker-compose up" 端到端启动~~ → 改为"验证现有容器健康 + 补 backup 配置"（因 PostgreSQL/Redis 已在跑，见 §0.5） |

### 3.1.1 mlx-audio 安装（**v0.1 漏掉，v0.1.2 补**）

| 项 | 说明 |
|------|------|
| 输入 | conda env `video-ops-py` 已就绪（§0.5） |
| 产出 | `pip install mlx-audio` 在 `video-ops-py` env 内完成 |
| DoD | `conda run -n video-ops-py python -c "import mlx_audio; print(mlx_audio.__version__)"` 报 ≥ 0.4.4 |
| 风险 | mlx-audio 依赖 mlx 库（Apple Silicon 专用），Intel Mac 不可用；安装失败回退到 CPU 模式（性能降级） |
| 阻断 | P4 TTSClient 模块（PRD §5.2）依赖此包，**未安装则 Sprint 1 P0 任务阻塞** |
| 首次运行 | `python -c "from mlx_audio.tts import load; load('aufklarer/CosyVoice3-0.5B-MLX-4bit')"` 触发 ~1.2 GB 模型下载 |

### 3.2 CI / Lint / Test 骨架

| 项 | 说明 |
|------|------|
| 产出 | `.github/workflows/ci.yml` 或等价 CI 配置 |
| DoD | PR 触发 `pnpm test` + `pnpm lint` + `pnpm typecheck` 三件套；红 → 绿 → 红流程跑通 |
| 复用 | ContentOps 的 CI 配置直接复用（已在跑通的状态） |

### 3.3 视频生成核心流水线骨架

| 项 | 说明 |
|------|------|
| 产出 | `worker/pipeline.py` 框架代码（**仅骨架，不入库到正式流水线**） |
| DoD | (1) 输入 JSON 文案 → 输出 mp4（哪怕画质垃圾、时长固定 5 秒）(2) **P4 TTSClient 必须能在 `video-ops-py` env 内 import mlx_audio** (3) FFmpeg 调用用 `subprocess.run(["ffmpeg", ...])` 验证 |
| 不做 | TTS 选择、配音语速、字幕样式、BGM 匹配、画面过渡等优化（留给 Sprint 1+） |
| 风险 | 第一次跑端到端可能因为 ffmpeg / whisper / cosyvoice / mlx 任意一个出错而阻塞；建议先把链路"硬编码"跑通，再做参数化 |
| **回填** | 风险行改为"ffmpeg / whisper / cosyvoice / **mlx**"（v0.1 漏了 mlx 依赖） |

### 3.4 Roadmap v1.0 文档定稿

| 项 | 说明 |
|------|------|
| 产出 | `video-ops/docs/ROADMAP.md`（本文档）从 v0.1 升到 v1.0 |
| DoD | 包含 Sprint 1+ 的具体 issue 引用（指向 Linear `VIDEOOPS-N` 编号） |

---

## 5. 阶段 4：AI 安全开发指南实施（**已找到源头，待重排**）

### 5.1 文件位置（已确认）

源计划文件：`/Users/john/.cursor/plans/新项目_ai_安全开发指南_78e7994e.plan.md`

**重要修订**：上一版 roadmap 误判"指南不存在"——这份文件由用户在早些会话中提供，但**未在 workspace 内**，导致 Grep 搜不到。修正措施见 §10 经验教训。

### 5.2 源指南包含的 9 个阶段

| 阶段 | 内容 | 关键交付物 |
|------|------|-----------|
| 一 | Git 安全基座 | `.gitignore`、`.git/hooks/pre-commit`、branch protection |
| 二 | AI 职责护栏 | 4 个 `.cursor/rules/*.mdc`（briefing / duty / forbidden / hallucination-defense）|
| 三 | MEMORY.md 体系 | 模板 + AI 自动维护规则 |
| 四 | 上下文卫生 | 每日清理规则、容量保护、health-check.sh |
| 五 | CI/CD 自动护栏 | `.github/workflows/ci.yml` + secret-scan.yml |
| 六 | 安全运营层 | 密钥扫描（trufflehog）、依赖漏洞（npm/pip audit）、MEMORY 自动备份 |
| 七 | AI 行为护栏层 | 幻觉防御、Prompt 注入防御（sanitizer.py）、成本控制（cost-limiter.ts）、ADR 制度 |
| 八 | 灾难恢复层 | rollback.sh、数据库快照策略 |
| 九 | 测试覆盖率基线 | vitest coverage ≥ 60%、DoD 清单 |

### 5.3 与现有阶段 1 / 3 的重叠与合并

| 指南阶段 | 对应现有阶段 | 处理 |
|---------|-------------|------|
| 一（Git 基座）| 现有阶段 1.1 | **完全合并**，由 1.1 统一交付 |
| 二（Cursor Rules）| 新增 | 在阶段 4 启动时集中创建 4 个 .mdc |
| 三（MEMORY 体系）| 与 WORKSPACE_MEMORY 5.1 已有 | 增强：补 CHANGELOG.md + ADR 目录 |
| 四（上下文卫生）| 新增 | 与阶段 4 同期 |
| 五（CI/CD）| 现有阶段 3.2 | **完全合并** |
| 六（安全运营）| 新增 | 在阶段 4 期间作为子步骤 |
| 七（AI 行为护栏）| 新增 | 与阶段 4 同期 |
| 八（灾难恢复）| 现有阶段 1.1 + 3.1 | **合并到 docker-compose.backup.yml** |
| 九（测试基线）| 现有阶段 3.2 | **完全合并** |

### 5.4 重排后的阶段 4 任务清单

按依赖关系排序：

#### 4.1 写入 4 个 Cursor Rules（**强阻塞，阶段 4 启动第一天**）
- 创建 `.cursor/rules/ai-briefing.mdc`（alwaysApply: true）
- 创建 `.cursor/rules/ai-duty.mdc`（alwaysApply: true）
- 创建 `.cursor/rules/ai-forbidden.mdc`（alwaysApply: true）
- 创建 `.cursor/rules/ai-hallucination-defense.mdc`（alwaysApply: true）
- **DoD**：重启 Cursor 验证 4 个规则被加载

#### 4.2 MEMORY 体系增强
- 创建 `video-ops/CHANGELOG.md`（按阶段追加）
- 创建 `video-ops/docs/decisions/` 目录，写首份 ADR
- 在 MEMORY.md 头部加"最后更新"自动检查钩子

#### 4.3 健康检查脚本
- 创建 `video-ops/scripts/health-check.sh`
  - 检查 MEMORY.md 最后更新时间（> 7 天警告）
  - 检查 test-results/ 是否为空
  - 检查 .gitignore 完整性
  - 检查未提交 .env 变更
  - 检查孤儿分支（> 30 天）
- 创建 `video-ops/scripts/backup-memory.sh`
- 创建 `video-ops/scripts/rollback.sh`
- 创建 `video-ops/scripts/check-api-cost.sh`

#### 4.4 CI/CD 工作流
- 创建 `.github/workflows/ci.yml`（lint + type-check + test + coverage）
- 创建 `.github/workflows/secret-scan.yml`（trufflehog）
- 创建 `worker/pipeline/sanitizer.py`（Prompt 注入防御）
- 创建 `lib/services/cost-limiter.ts`（API 成本控制）

#### 4.5 灾难恢复配置
- 创建 `docker-compose.backup.yml`（PostgreSQL 定时快照）

#### 4.6 阶段 4 完成定义（DoD）
- [ ] 4 个 Cursor Rules 已创建且 alwaysApply
- [ ] 4 个 scripts 已创建且可执行
- [ ] 2 个 GitHub Actions workflow 已推送并跑过空 job
- [ ] sanitizer.py + cost-limiter.ts 有单元测试
- [ ] docs/decisions/ 下首份 ADR 已写
- [ ] health-check.sh 在本地跑通全部检查项

### 5.5 阶段 4 预计耗时

1 - 1.5 个工作日（如果现有阶段 1.3 / 3.2 已经在做 CI 和 Git 基座，可压缩到 0.5 天）

---

## 6. 阶段 5：Backlog Sprint 1+（持续进行）

> Sprint 1 开始 = 阶段 5 开始。从 Linear 上拉取 Cycle 配置的 issue 实施。

### 6.1 Sprint 1 候选范围（待 Sprint 0 完成后细化）

基于 PRD v1.0 优先级排序，Sprint 1 大概率包含：
- P0：文案 → SceneSpec 解析器
- P0：SceneSpec → 静帧生图（qwen-image-plus / gpt-image-2 二选一）
- P0：SceneSpec → TTS（CosyVoice 3.0 MLX）
- P0：图片 + 音频 → mp4 合成（FFmpeg）
- P0：CLI / API 入口（最小可用）

### 6.2 Sprint 节奏约定

- 每个 Sprint = 2 周
- 周一：Sprint Planning（拉 issue、定容量）
- 周三：Mid-Sprint Check-in（线性进度盘点）
- 周五：Sprint Review（demo）+ Retro（写进 MEMORY.md）
- Sprint 末：自动跑回归测试 + 性能基准

---

## 7. 跨阶段约束

### 7.1 Commit 节奏

每次阶段内的小步骤完成，**必须立即 commit**。不允许"做了一整天再一次性提交"。建议粒度：
- 每个文件改动 → 1 个 commit
- 每个 provider 配置 → 1 个 commit
- 每个文档更新 → 1 个 commit

Commit message 格式（沿用 Conventional Commits）：
```
<type>(<scope>): <subject>

<body>

<footer>
```
type: feat / fix / docs / chore / refactor / test
scope: gateway / worker / web / docs / infra

### 7.2 文档同步约束

根据 `WORKSPACE_MEMORY.md` §5.1，**任何阶段结束时必须更新对应文件**：
- 新技术决策 → 更新对应项目的 MEMORY.md
- 重大 bug → 更新 MEMORY.md
- 新文件结构 → 更新 MEMORY.md
- 跨项目依赖关系 → 更新 WORKSPACE_MEMORY.md

### 7.3 验证约束

每个阶段完成前，必须跑一次"冒烟测试"：
- 阶段 1：Gateway 双 provider 测试（gpt-image-2 + qwen-image-plus）
- 阶段 2：Linear API 健康度（能 list issues / create issue）
- 阶段 3：CI 红绿 + Docker compose up + 骨架 e2e
- 阶段 4：health-check.sh 全项 + 4 个 Cursor Rule 加载验证 + ci.yml 空跑过

---

## 8. 风险登记（持续更新）

| ID | 风险 | 概率 | 影响 | 缓解 |
|----|------|------|------|------|
| R1 | Solutions/ 根目录未初始化 git 导致 .gitignore 覆盖范围过大 | 高 | 中 | 阶段 1.1 先 ls 确认根目录状态 |
| R2 | DashScope 兼容模式图片端点未来下线 | 低 | 高 | 监控官方公告，备选：qwen-image 也支持 OpenAI SDK 直接调 |
| R3 | Python Worker Docker 镜像过大 | 高 | 中 | 分层构建：基础镜像（FFmpeg）+ 应用镜像 + ML 模型运行时 |
| R4 | CosyVoice 3.0 MLX 在 Mac M 系列之外不可用 | 中 | 中 | V1 仅支持 Mac 开发机，Linux 部署延后到 V2 |
| R5 | Linear API rate limit 触发导入失败 | 中 | 低 | 用 `linearisthq` CLI 而非 Web UI，批量 100/批 |
| R6 | AI 安全指南缺失导致 Sprint 1 启动阻塞 | **已澄清** | — | 文件已找到：`/Users/john/.cursor/plans/新项目_ai_安全开发指南_78e7994e.plan.md` |

---

## 9. 与你原始理解的对比

| 你的理解 | 我的修正 |
|---------|---------|
| 1. Gateway → git 初始化 → 提交 | ✅ 顺序对；git 初始化应该是 1.1（最先做） |
| 2. Backlog → Linear 导入 → 更新文件 | ✅ 大体对；补充 "Milestone/Cycle 配置" 是 2.3 |
| 3. Sprint 0 → 提交 → 更新 roadmap | ✅ 对；Sprint 0 结束后才升 ROADMAP v1.0 |
| 4. AI 安全开发指南 | ✅ 修正：指南**存在**，在 `/Users/john/.cursor/plans/新项目_ai_安全开发指南_78e7994e.plan.md`，含 9 阶段完整护栏体系 |
| 5. 继续 backlog | ✅ 对，但应该是 "Sprint 1+" 而非笼统的 backlog |

---

## 10. 下一步（立即可执行）

如果 John 确认本 roadmap 方向，下一步：

1. **AI 开始执行阶段 1.1**（git init + .gitignore + 首次 commit）
2. **阶段 1.2**（Gateway 改动 + 端到端测试）
3. **阶段 1.3**（文档同步 + commit）
4. **阶段 2 / 3 / 4** 按顺序推进

预计阶段 1 总耗时 0.5-1 个工作日。

---

## 11. 经验教训（Roadmap 编写过程）

### L1：本 roadmap 在编写中犯过 1 个错

**错误**：v0.1 草案时，因源计划文件位于 `~/.cursor/plans/`（workspace 之外），Grep 工具未命中，AI 误判"AI 安全开发指南不存在"，导致 §5 / §7.3 / §9 多处都基于错误前提写。

**根因**：
- 跨会话记忆未继承（每会话是独立 context，无法读取历史 MEMORY）
- Grep 默认 workspace 范围，未主动扩展到 `~/.cursor/`

**修正**：
- 用户明确提示后，AI 已用 Read 工具直接读取 `~/.cursor/plans/新项目_ai_安全开发指南_78e7994e.plan.md`
- §5 已完整重写，包含 9 阶段映射、与现有阶段 1/3 的合并方案、详细 DoD 清单

**防止再犯**：
- 在 MEMORY.md 头部建立"外部计划文件索引"，列出 `~/.cursor/plans/*.md` 路径
- 每次新会话启动时，AI 必须先 Read 该索引（这与 `ai-briefing.mdc` 的"先读 MEMORY"约束一致）
- 索引条目建议格式：`## External Plans Index | 文件名 | 来源会话时间 | 当前状态 | 关键结论`

### L2：roadmap 应该尽早写、不要等拍板

如果在拍板 PRD v1.0 当天就写 roadmap，错误会立即暴露。本教训写进 §11 是为了下一个项目（避免重复）。

---

**附录 A：相关文档索引**
- PRD：`video-ops/docs/PRD.md`
- 项目记忆：`video-ops/MEMORY.md`
- 工作区记忆：`WORKSPACE_MEMORY.md`
- LLM Gateway 源码：`llm-gateway-provider/app/api/auto/images/generations/route.ts`
- 全局约定：`WORKSPACE_MEMORY.md` §5

**附录 B：版本历史**
- v0.1 (2026-06-22 12:39)：初始草案，待 Sprint 0 结束后回填实际数据
- v0.1.1 (2026-06-22 12:40)：§5 / §7.3 / §9 / §10 / R6 多处基于"指南缺失"错误前提；**已修正**：定位到 `/Users/john/.cursor/plans/新项目_ai_安全开发指南_78e7994e.plan.md` 源文件，按 9 阶段重排阶段 4；§11 记录经验教训
- v0.1.2 (2026-06-22 12:45)：**全量回填已完成的 7 项环境基线**。新增 §0.5 起点状态快照（FFmpeg/Python/Docker/PostgreSQL/Gateway/gpt-image-2/CosyVoice 模型）；新增 §3.1.1 mlx-audio 安装任务（v0.1 漏掉，PRD P4 阻塞依赖）；§3.1 修正"docker-compose up"为"验证现有容器 + 补 backup"；§3.3 风险行加 mlx；R1/R2/R3 风险登记已根据 §0.5 重新评估概率
- v0.1.3 (2026-06-22 13:00)：**阶段 1.1 Git 基座完成**。仓库 https://github.com/JohnSince2019/video-ops.git 首次 commit 82746bd（6 files / 1367 insertions），dev 分支已推送 origin，main 分支等待 Web UI 配置保护规则后再推送。MEMORY.md §2.4 新增 Git 基座状态表 + AI 协作约定
- v0.1.4 (2026-06-22 13:25)：**会话收尾沉淀**。MEMORY.md 新增 2026-06-22 13:25 时戳会录（4 个工作段 + 5 个可复用经验 + 下次会话起点）。微信公众号系列挂起（5 个 TODO cancelled）。本阶段 1.1 闭环：**dev 已推送（eb0dfac），main 已推送（user 标记 done，AI 未直接验证）**，进入阶段 1.2 准备
- v0.1.5 (2026-06-22 13:45)：**公众号系列激活 + Day 0 草稿 + 每日沉淀节奏**。MEMORY.md 新增 §8.3 每日沉淀约定（4 步 SOP，触发词"今天就这样了"）+ §9 公众号系列状态表；起草第 1 篇草稿 `content/2026-06-22-Day0.md`（《当我让 AI 列"已完成的工作"，它漏了一半》，约 1800 字，待用户审）；CHANGELOG.md 也需同步更新
- v0.1.6 (2026-06-22 14:35)：**双轨并存机制确认 + AI 错误纠正**。MEMORY.md 新增 §8.3.2 "AI 不绕过 ContentOps wizard" + §9 "双轨并存机制"（素材层 video-ops/content/ + 生产层 ContentOps wizard s1-s10）；Day 0 草稿 frontmatter 重标为"素材 v0（仅存档，非发布版）"；CHANGELOG.md 同步更新。**AI 错误纠正**：未读 contentops-briefing.mdc 就动手写（违反 MEMORY §8.2）
- v0.1.7 (2026-06-22 14:50)：**事实纠正**。CHANGELOG + ROADMAP §1.2 修正：原"qwen-image-plus / DashScope"是 AI 未核实就写的。实测 localhost:3000 `/api/v1/models`：`wanx2.1-t2i-plus` owned_by: wanx，**Wanx2.1 可用**（与 PRD §2.3 一致）。ROADMAP §1.2 重写为"接入 Wanx2.1-t2i-plus"。AI 错误：今天已违反 MEMORY §8.2 共 5 次

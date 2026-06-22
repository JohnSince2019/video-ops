# video-ops BACKLOG

> 来源：PRD v1.0 §2.1 用户故事 + §16.2 目录结构 + §9 可靠性设计
> 创建：2026-06-22（阶段 2.1）
> 维护者：John

---

## Epic 1：内容输入与解析

| ID | Type | 标题 | Dev | QA | Doc | 依赖 | 预估 |
|----|------|------|-----|----|-----|------|------|
| E1-1 | Story | TextParser：ContentManifest JSON Schema 验证 | | | | | 1d |
| E1-2 | Story | TextParser：Markdown → SceneGraph 解析 | | | | E1-1 | 2d |
| E1-3 | Story | TextParser：TXT 纯文本逐句切割（fallback） | | | | E1-2 | 1d |
| E1-4 | Story | TextParser：输出 scene_hash + prompt_hash 用于缓存键 | | | | E1-2 | 0.5d |
| E1-5 | Task | Schema 类型定义（`lib/types/manifest.ts`） | | | | E1-1 | 0.5d |

---

## Epic 2：AI 处理流水线

| ID | Type | 标题 | Dev | QA | Doc | 依赖 | 预估 |
|----|------|------|-----|----|-----|------|------|
| E2-1 | Story | ImageGenerator：GPT Image 2 调用（P2）| | | | E1-2 | 1d |
| E2-2 | Story | ImageGenerator：wanx-v1 调用（P3 Broll）| | | | E1-2 | 1d |
| E2-3 | Story | ImageGenerator：图片中间产物缓存（scene_hash）| | | | E2-1 | 1d |
| E2-4 | Story | TTSClient：CosyVoice 3.0 MLX 本地推理（P4）| | | | E1-2 | 2d |
| E2-5 | Story | TTSClient：零样本音色克隆（参考音频）| | | | E2-4 | 1d |
| E2-6 | Story | VideoAssembler：时间线组装 + 转场（P6）| | | | E2-1,E2-2,E2-4 | 2d |
| E2-7 | Task | BGM 音乐库：Pixabay 预设 20 首集成 | | | | E2-6 | 1d |
| E2-8 | Story | 资产缓存：Hash 键 + 过期策略 | | | | E2-3 | 1d |

---

## Epic 3：渲染与输出

| ID | Type | 标题 | Dev | QA | Doc | 依赖 | 预估 |
|----|------|------|-----|----|-----|------|------|
| E3-1 | Story | FFmpeg：三档渲染（draft/standard/high_quality）| | | | E2-6 | 1.5d |
| E3-2 | Story | 平台适配：抖音 / 小红书 / 视频号 元数据注入 | | | | E3-1 | 1d |
| E3-3 | Task | 输出包：MP4 + 封面 + metadata.json | | | | E3-1 | 0.5d |

---

## Epic 4：任务管理与状态

| ID | Type | 标题 | Dev | QA | Doc | 依赖 | 预估 |
|----|------|------|-----|----|-----|------|------|
| E4-1 | Story | BullMQ + Redis：任务队列初始化 | | | | — | 1d |
| E4-2 | Story | JobState：状态机（QUEUED→PARSING→AI_PROCESSING→ASSEMBLING→RENDERING→POST_PROCESSING→COMPLETED）| | | | E4-1 | 1d |
| E4-3 | Story | SSE 实时推送：任务进度 WebSocket | | | | E4-2 | 1d |
| E4-4 | Story | 断点续跑：manifestHash + ownerToken 幂等检查 | | | | E4-2 | 1d |
| E4-5 | Story | 成本估算：API 调用计数 + usd 估算 | | | | E4-2 | 1d |
| E4-6 | Task | 队列积压保护：50 任务上限 + 内存 12GB 阈值 | | | | E4-1 | 0.5d |

---

## Epic 5：质量门禁与重试

| ID | Type | 标题 | Dev | QA | Doc | 依赖 | 预估 |
|----|------|------|-----|----|-----|------|------|
| E5-1 | Story | 图片质量校验：尺寸 / 亮度检测 | | | | E2-1 | 1d |
| E5-2 | Story | 音频质量校验：振幅 / 时长 / 静音检测 | | | | E2-4 | 1d |
| E5-3 | Story | 自动重试：失败重跑（max 3 次）+ JobErrorLog | | | | E5-1 | 1d |
| E5-4 | Task | Worker crash → INTERRUPTED → 启动时 scan 恢复 | | | | E5-3 | 0.5d |

---

## Epic 6：前端 UI

| ID | Type | 标题 | Dev | QA | Doc | 依赖 | 预估 |
|----|------|------|-----|----|-----|------|------|
| E6-1 | Story | 视频制作向导（Wizard）：配置页 | | | | E4-3 | 1d |
| E6-2 | Story | 任务管理面板：列表 + 状态 + 详情 | | | | E4-2 | 1d |
| E6-3 | Story | Storyboard 预览页：3 类可调参数（文字/字幕样式/转场）| | | | E3-1 | 1.5d |
| E6-4 | Task | 复用 ContentOps Zen 设计系统 | | | | E6-1 | 0.5d |
| E6-5 | Story | 合规报告导出（JSON + PDF）| | | | E5-3 | 1d |

---

## Epic 7：认证与安全

| ID | Type | 标题 | Dev | QA | Doc | 依赖 | 预估 |
|----|------|------|-----|----|-----|------|------|
| E7-1 | Story | owner token 隔离：X-Owner-Token header + DB hash | | | | — | 0.5d |
| E7-2 | Task | Upstash Redis Rate Limiting（20 req/min/IP）| | | | E4-1 | 0.5d |
| E7-3 | Task | 合规检查：正则 + 关键词黑名单（Worker 端执行）| | | | E1-1 | 1d |

---

## Epic 8：基础设施

| ID | Type | 标题 | Dev | QA | Doc | 依赖 | 预估 |
|----|------|------|-----|----|-----|------|------|
| E8-1 | Story | Prisma + PostgreSQL：数据库 Schema 初始化 | | | | — | 1d |
| E8-2 | Story | Docker：Redis + PostgreSQL 开发环境 docker-compose | | | | E8-1 | 0.5d |
| E8-3 | Task | GitHub Actions CI：lint + type-check + test + 覆盖率门禁 >= 60% | | | | — | 1d |
| E8-4 | Task | GitHub Actions：secret-scan.yml 密钥泄露扫描 | | | | — | 0.5d |
| E8-5 | Task | GitHub Actions：release.yml main 合并构建发布 | | | | — | 0.5d |

---

## Sprint 规划建议

> 每 Sprint 容量上限 8-10 个 issue，2 周一个 Sprint。

### Sprint 0（工程基座）：E8-1 → E8-2 → E8-3 → E8-4 → E8-5 → E4-1 → E4-2 → E7-1
→ E7-2 → E7-3（10 issues，~5d Dev）
**目标：Sprint 1 能开跑**

### Sprint 1（核心流水线）：E1 系列 + E2 系列
→ E1-1 → E1-5 → E1-2 → E1-3 → E1-4 → E2-1 → E2-2 → E2-3（8 issues）
**目标：手动 end-to-end 能跑通**

### Sprint 2（渲染 + 质量）：E3 系列 + E5 系列
→ E3-1 → E3-2 → E3-3 → E5-1 → E5-2 → E5-3 → E5-4 → E2-7（8 issues）
**目标：完整渲染出 MP4**

### Sprint 3（前端 + 输出）：E6 系列
→ E6-1 → E6-4 → E6-2 → E6-3 → E6-5 → E2-4 → E2-5 → E2-6（8 issues）
**目标：用户可用的 Web 界面**

### Sprint 4（收尾 + 真实场景）：E4-3 → E4-4 → E4-5 → E4-6
**目标：Sprint Review + PRD DoD 全部通过**

---

## 验收标准（Dev/QA/Doc 三视角）

每个 Epic 完成时需满足：

| 视角 | 要求 |
|------|------|
| **Dev** | 代码符合 `src/` 目录结构，Prisma Schema 更新，单元测试 >= 60% 覆盖率，npm audit 通过 |
| **QA** | E2E 测试（Playwright）通过，CI 绿色，失败用例有日志记录 |
| **Doc** | API 路由有注释，MEMORY.md 相关章节更新，BACKLOG.md 此 Epic 行标记 Done |

---

## 状态定义

| 状态 | 说明 |
|------|------|
| `backlog` | 待 refinement |
| `refined` | 已拆分，有 estimate 和 acceptance criteria |
| `todo` | Sprint 规划中 |
| `in_progress` | 开发中 |
| `in_review` | PR open，等待 review |
| `done` | merged + 测试通过 + 文档更新 |
| `blocked` | 等待依赖 |

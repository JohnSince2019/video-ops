# Video-Ops Linear 操作手册

> **适用场景**：Video-Ops 项目（JOH Team），39 issues / 5 Cycles / 1 人
> **维护者**：John
> **最后更新**：2026-06-22 19:10

---

## 1. 项目入口

| 项目 | 链接 | ID |
|------|------|----|
| Linear Team | https://linear.app/johnsince2019/team/JOH | — |
| Video-Ops Project | https://linear.app/johnsince2019/project/video-ops | `dc5c8ec1-6088-4231-9815-e399c0ea7cb3` |
| GitHub 仓库 | https://github.com/JohnSince2019/video-ops | — |

**Project Milestone IDs**（供 API 脚本使用）：

| Milestone | ID |
|-----------|----|
| M0 - Foundation | `d5f4f4f2-3ca9-4316-9683-24f4b3a695be` |
| M1 - Core Pipeline | `acf0f3d6-bda9-4af1-b59c-91fe53d465c2` |
| M2 - Product | `823409d8-5be8-4080-a7a2-3b1d99bf3fa5` |

---

## 2. Issue 编号说明

Linear 自动生成编号（`JOH-6` ~ `JOH-44`），与原始规划前缀（E1-E8）的对应关系：

| 前缀 | Label | Sprint | Linear 编号范围 |
|------|-------|--------|----------------|
| E8 基础设施 | #22c55e | Sprint 0 | JOH-40 ~ JOH-44 |
| E7 认证与安全 | #6b7280 | Sprint 0 | JOH-37 ~ JOH-39 |
| E4 任务管理与状态 | #6366f1 | Sprint 0 | JOH-22 ~ JOH-27 |
| E1 内容输入与解析 | #94a3b8 | Sprint 1 | JOH-6 ~ JOH-10 |
| E2 AI 处理流水线 | #3b82f6 | Sprint 1 | JOH-11 ~ JOH-18 |
| E3 渲染与输出 | #8b5cf6 | Sprint 2 | JOH-19 ~ JOH-21 |
| E5 质量门禁与重试 | #ef4444 | Sprint 2 | JOH-28 ~ JOH-31 |
| E6 前端 UI | #f97316 | Sprint 3 | JOH-32 ~ JOH-36 |

> **编号无法自定义**，如需关联原规划编号，可在 issue Description 首行写 `#E1-1 原规划编号`，Linear 搜索栏直接搜 `E1-1` 即可定位。

---

## 3. 常用操作

### 3.1 改变 Issue 状态

在 issue 页面右侧 **Status** 字段点击下拉，选一个状态：

```
Backlog      → Todo      → In Progress    → In Review    → Done
（积压）      （待办）     （进行中）        （审核中）      （完成）
```

**单人项目建议**：跳过 `In Review`，直接 `Todo → In Progress → Done`。

### 3.2 拖拽批量改状态

在 Cycle 视图（JOH 团队 → Cycles → Sprint N）中：
1. 打开目标 Sprint
2. 按住 issue 拖到目标列（Todo / In Progress / Done）
3. 状态实时保存，无需点 Save

### 3.3 改优先级

右侧 **Priority** 字段：

| 数字 | 含义 | 使用场景 |
|------|------|---------|
| 1 | 🔴 Urgent | 当前 Sprint 的 P0 阻塞任务 |
| 2 | 🟠 High | 当前 Sprint 的重要任务 |
| 3 | 🟡 Medium | 正常排期 |
| 4 | 🟢 Low | 可以往后放的优化项 |
| 0 | ⚪ No priority | 默认值 |

### 3.4 改 Estimate（预估工时）

Linear 的 Estimate 单位是 **point**（非小时），脚本中已按 `1 SP = 0.1 天` 换算：

| 脚本值 | SP | 实际含义 |
|--------|----|---------|
| 5 | 0.5 SP | 0.5 个工作日（约 4 小时） |
| 10 | 1 SP | 1 个工作日 |
| 15 | 1.5 SP | 1.5 个工作日 |
| 20 | 2 SP | 2 个工作日 |

在 issue 右侧 **Estimate** 字段直接填数字（10 代表 1 SP）。

### 3.5 分配给自己

单人项目：右侧 **Assignee** → 选自己的账号（John Zhou / johnsince2019@gmail.com）。

### 3.6 添加 Comment

在 issue 详情页底部 Comment 区记录进度、问题、决策。

**好的 Comment 示例**：
```
## 2026-06-23
- 确认 FFmpeg 8.1 可用
- 阻塞：mlx-audio 尚未安装
```

---

## 4. Cycle（Sprint）操作

### 4.1 启动一个 Sprint

当 Sprint 开始日期到达时：

1. 进入 **Cycles** 页面
2. 找到对应的 Sprint（如 Sprint 0）
3. 点 **Start cycle** 按钮

### 4.2 关闭一个 Sprint

当 Sprint 结束时：

1. 进入 **Cycles** 页面
2. 找到目标 Sprint
3. 点 **Complete cycle** 按钮
4. Linear 会自动把未完成的 issue 移到 **Backlog**

### 4.3 当前 Sprint 周期

| Sprint | 日期范围 | 范围 |
|--------|---------|------|
| Sprint 0 | 2026-06-23 → 2026-06-27 | 基础设施 + 安全 + 任务管理 |
| Sprint 1 | 2026-06-30 → 2026-07-11 | 内容解析 + AI 流水线 |
| Sprint 2 | 2026-07-14 → 2026-07-25 | 渲染输出 + 质量门禁 |
| Sprint 3 | 2026-07-28 → 2026-08-08 | 前端 UI |
| Sprint 4 | 2026-08-11 → 2026-08-22 | 收尾 |

---

## 5. Label 操作

8 个 Label 已创建，对应 8 个 Epic：

| Label | 颜色 | 用途 |
|-------|------|------|
| E1 - 内容输入与解析 | #94a3b8 | 文案解析相关 |
| E2 - AI 处理流水线 | #3b82f6 | 图生图 / TTS / 合成 |
| E3 - 渲染与输出 | #8b5cf6 | FFmpeg / 平台适配 |
| E4 - 任务管理与状态 | #6366f1 | BullMQ / Redis / SSE |
| E5 - 质量门禁与重试 | #ef4444 | 校验 / 重试 / 恢复 |
| E6 - 前端 UI | #f97316 | Wizard / 面板 / 预览 |
| E7 - 认证与安全 | #6b7280 | owner token / Rate Limit |
| E8 - 基础设施 | #22c55e | Docker / CI / DB |

---

## 6. 视图（Views）配置

### 6.1 推荐视图（共 2 个）

**View 1: Active Sprint**（每天用）

```
Name: Active Sprint
Filter:
  - Cycle = [当前 Sprint]
  - Status != Done

Group by: Status
Sort by: Priority (asc)
```

**View 2: All Issues**（全局参考）

```
Name: All
Filter: (留空 = 显示全部)
Group by: Cycle
Sort by: Priority (asc)
```

### 6.2 快速筛选

不用预设 View，直接在搜索栏输入：

| 搜索内容 | 结果 |
|---------|------|
| `cycle:"Sprint 0"` | Sprint 0 所有 issue |
| `priority:1` | 所有 Urgent 任务 |
| `label:"E1 - 内容输入与解析"` | E1 所有任务 |
| `assignee:me` | 我的任务 |
| `E1-1` | 定位到原规划编号 E1-1 对应的 Linear issue |

### 6.3 My Issues

左侧边栏 **"My Issues"** — 点一下只显示 assign 给自己的 tasks，开工前第一件事。

---

## 7. 每日操作节奏

| 场景 | 操作 | 耗时 |
|------|------|------|
| **早上开工** | 点 My Issues → 拖拽当前任务到 In Progress | 1 分钟 |
| **任务完成** | 拖拽到 Done → 写一行 Comment 记录 | 1 分钟 |
| **遇到阻塞** | 在 issue 下写 Comment @自己，Priority 改 1 | 1 分钟 |
| **开新 issue** | 在 Backlog view 点 `+ New issue`，填 Title + Label + Cycle | 2 分钟 |
| **Sprint 结束** | Complete cycle → 检查未完成的移到下一 Sprint | 5 分钟 |

---

## 8. Project 视图（Video-Ops Project）

Project 里有独立的 Board 视图，可以按 Milestone / Status 分组看整体进度。

### 8.1 常用配置

- **Group by**: Status（看各状态堆积量）
- **Group by**: Cycle（看各 Sprint 完成率）
- **Show completed**: 开（方便复盘）

### 8.2 项目级 Milestone（可选）

如果想用 Milestone 做更高层聚合，可以建：

| Milestone | 对应 Cycles | 交付目标 |
|-----------|------------|---------|
| M0 - Foundation | Sprint 0 | 可跑起来的工程基线 |
| M1 - Core Pipeline | Sprint 1-2 | 端到端视频生成 |
| M2 - Product | Sprint 3-4 | 可用的前端 + 质量保障 |

---

## 9. 不要做的事

| ❌ 不要 | ✅ 正确做法 |
|--------|-----------|
| 创建太多 View | 2 个够了，搜索栏筛选更灵活 |
| 一次更新多个 issue 的状态 | 直接拖拽，不用批量操作 |
| 在 Linear 里写长文档 | 文档放在 GitHub / `docs/`，Linear 只写摘要 |
| 跳过 Comment 直接改 State | 每次状态变更写一行原因或结果 |
| 不更新 Linear 就提交代码 | 先更新 issue 状态，再写 commit |

---

## 10. Linear × GitHub 集成（后续配置）

等 GitHub Actions 跑通后，建议开启：

1. **PR 自动关联**：commit message 写 `fix JOH-22` → Linear 自动把 PR 挂到这个 issue
2. **GitHub Branch → Linear Issue**：开新 branch 时命名 `joh-22-add-redis-queue` → Linear 自动识别

开启方式：Linear → Settings → Integrations → GitHub → Connect

---

## 11. API 自动化（进阶）

已有脚本：

| 脚本 | 用途 |
|------|------|
| `scripts/import-to-linear.mjs` | 批量创建 issues |
| `scripts/create-milestones.mjs` | 创建 Project Milestone |
| `scripts/link-issues-milestones.mjs` | 将所有 issues 按 Sprint 关联到 Milestone |

```bash
# 关联所有 issues → milestone（按 Sprint 映射：Sprint 0→M0, Sprint 1-2→M1, Sprint 3-4→M2）
node scripts/link-issues-milestones.mjs

# 重新同步 issue 列表（以防 Linear Web UI 改了数据）
node scripts/import-to-linear.mjs
```

---

## 12. 故障处理

| 问题 | 解决方法 |
|------|---------|
| 搜索不到 issue | 确认在正确 Team（JOH）下，而非其他 Team |
| 拖拽状态不生效 | 检查是否在 Cycle 视图里，不是 Project Board |
| API 报 502 | Linear 临时故障，等 30 秒重试 |
| 无法删除 issue | Linear 免费版只能 Archive，不能删除；Archive = 隐藏 |
| Label 颜色不对 | Label → 点颜色块 → 选十六进制色码（如 `#3b82f6`） |

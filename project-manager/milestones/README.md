# 项目管理目录

> Video-Ops 任务管理文档。解决 Linear 序号看不出推进顺序的问题。

---

## 文件说明

| 文件 | 用途 | 更新频率 |
|------|------|---------|
| `sprint-plan.md` | 推荐推进顺序 + 依赖关系图 | Sprint 开始时更新 |
| `milestone-status.md` | 实时进度追踪（每日 check-in 参考）| 完成 issue 后更新 |

---

## 使用方式

### 每日 check-in（3 分钟）

1. 打开 `milestone-status.md`
2. 找到当前 Sprint（已标记 🔵 进行中）
3. 按"推进顺序"列从上往下看，最靠上的未完成 issue 就是下一个
4. 在 Linear Web UI 标记 `In Progress` / `Completed`

### Sprint Planning（60 分钟）

1. 打开 `sprint-plan.md`
2. 按关键路径顺序拉取 issue 到 Linear Sprint
3. 对照"推进原因"列，确认每条选择的上下文
4. 容量超限时按 P1 > P2 优先裁剪

### Linear 序号查上下文

> Linear 上 JOH-40 / JOH-22 这种序号看不出含义。

在 `sprint-plan.md` 或 `milestone-status.md` 中搜索对应编号，即可看到：
- 这条 issue 做什么
- 为什么在这个顺序做
- 它依赖哪些 issue
- 预估多少天

---

## 与 Linear 的关系

- **此目录** = 推荐顺序 + 业务上下文（为什么做）
- **Linear** = 真实状态（谁在做，做到哪）

两者保持一致：完成 issue 后在 Linear 标记 completed，此文件按周同步更新。

---

## 目录结构

```
project-manager/
└── milestones/
    ├── README.md          ← 本文件
    ├── sprint-plan.md     ← 推荐顺序 + 依赖关系
    └── milestone-status.md ← 实时进度追踪
```

---

*最后更新：2026-06-22 19:20*

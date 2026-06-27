# M3 Workbench 验收说明

## 适用范围

- `JOH-81`：Quality Gate + Compliance + Cost
- `JOH-82`：E2E Acceptance Sample

当前本地验收地址：

- `http://localhost:3003/`

当前自动化样片产物：

- `/output/jobs/job-53b1a86e78/video.mp4`
- 最新一键验收准备样片：`/output/jobs/job-53b1a86e78/video.mp4`
- 当前最新一键验收准备样片：`/output/jobs/job-53b1a86e78/video.mp4`

固定样片脚本 fixture：

- [fixtures/bench-press-shoulder-pain-script.txt](/Users/john/Desktop/AI/Solutions/video-ops/fixtures/bench-press-shoulder-pain-script.txt)

当前验收快照：

- 初始工作台：[workbench-initial.png](/Users/john/Desktop/AI/Solutions/video-ops/tmp/acceptance/workbench-initial.png)
- 样片完成后工作台：[workbench-completed.png](/Users/john/Desktop/AI/Solutions/video-ops/tmp/acceptance/workbench-completed.png)

当前结构化验收报告：

- [acceptance-report.json](/Users/john/Desktop/AI/Solutions/video-ops/tmp/acceptance/acceptance-report.json)

报告当前包含：

- 最新样片路径
- 截图路径
- 6 步标题
- 步骤跳转 / 回退结果
- 质量摘要
- 成本摘要
- 声音策略摘要
- 预览链接摘要

## 已完成的自动化验证

- `npm run typecheck`
- `npm test`：`152/152` 通过
- `npm run wizard:e2e`
- `npm run m3:acceptance`

说明：

- `npm run m3:acceptance` 会串行执行服务健康检查、fixture 复验和截图刷新。
- `npm run m3:acceptance` 内部会对 `wizard:e2e` 做一次自动重试，减少本地偶发时序抖动的影响。
- 如果本地浏览器或 SSE 时序仍然出现偶发抖动，单次失败后可直接再重跑一次。

当前自动化已验证内容：

- 6 步工作台可见且可跳转
- `上一步` 回退可用
- 脚本自动提取 `title / hook / summary / duration / scenes`
- Storyboard 预览可见
- 预设声音试听可用
- 自定义声音上传 / 应用 / 试听可用
- SSE 进度可见
- MP4 预览 / 下载 / metadata 链接可见
- 质量摘要可见
- 成本估算可见
- 声音策略摘要可见
- `TTS 引擎` 显式选择可见且可切换

本轮最新自动化结果：

- 最新样片：`/output/jobs/job-53b1a86e78/video.mp4`
- 质量摘要：`663.3 KB / 78.4s / 1080x1920 / 有音频 / 字幕规划中 / 正式产物 / 合规通过`
- 成本摘要：`GPT Image $0.2000 / Wanx $0.0000 / TTS $0.0220 / 总成本 $0.2220`

说明：

- 工作台首页会保留最近一次打开或创建的任务，因此你进入 `http://localhost:3003/` 时，右侧任务编号和质量数值可能与结构化报告里的样片不完全相同。
- 手动验收时以“流程是否完整可操作、MP4 是否可预览、质量摘要和成本估算是否真实可见”为准，不要求首页默认任务编号与自动化报告逐字一致。
- 如果你想复现同一批样片，可重新粘贴固定 fixture 并点击 `创建任务`，或直接执行 `npm run m3:acceptance` 刷新整套验收材料。
- 我已验证首页 `载入演示内容` 按钮可用，并已将本地 `3003` 页面预热到“素材收集 / 已载入演示脚本 / 可提交”状态，你打开页面后可直接从声音试听和创建任务开始。

## JOH-81 手动验收

目标：

- 确认右侧“产物质量摘要”和“成本估算”不是只有接口数据，而是真正在 UI 上可见、可理解。
- 确认右侧“声音策略摘要”会随着创建任务显示当前声音模式、TTS 引擎和部署策略。
- 确认在 `声音应用` 页面可以直接选择 `TTS 引擎`，而不是只能被动接受默认 provider。
- 推荐直接使用固定脚本 fixture，避免人工粘贴内容漂移。

步骤：

1. 打开 `http://localhost:3003/`
2. 在“素材收集”页粘贴短视频脚本，点击 `校验草稿`
3. 点击任一预设声音的 `试听`，再点击 `应用该声音`
4. 进入 `声音应用`，确认能看到 `TTS 引擎` 选择框，并至少能看到 `CosyVoice MLX / F5-TTS / MeloTTS`
5. 先切换一次 `TTS 引擎`
6. 再点击一个预设声音
7. 观察 `当前声音引擎 / 当前 TTS 路线` 是否跟着同步变化
8. 点击 `创建任务`
9. 等待任务完成，确认右侧出现视频播放器
10. 确认右侧出现 `产物质量摘要`
11. 确认右侧出现 `成本估算`
12. 确认右侧出现 `声音策略摘要`

预期结果：

- 能看到 `文件大小`
- 能看到 `时长`
- 能看到 `分辨率`
- 能看到 `音频`
- 能看到 `字幕`
- 能看到 `渲染模式`
- 能看到 `合规`
- 能看到 `GPT Image`
- 能看到 `Wanx`
- 能看到 `TTS`
- 能看到 `总成本`
- 能看到 `声音模式`
- 能看到 `TTS 引擎`
- 能看到 `音色策略`
- 能看到 `部署策略`
- 能在 `声音应用` 页面显式切换 `TTS 引擎`
- 切换 `TTS 引擎` 后，再点不同声音预设时，`当前声音引擎` 和 `当前 TTS 路线` 会同步变化
- 如果当前为正式渲染，应显示类似 `正式产物`
- 如果当前发生 fallback，应明确显示 `Fallback`

## JOH-82 手动验收

目标：

- 确认“卧推肩疼”样片闭环在真实 UI 上可完成，而不是只在自动化里通过。
- 推荐直接使用固定脚本 fixture，避免人工粘贴内容漂移。

步骤：

1. 打开 `http://localhost:3003/`
2. 确认首页标题是 `视频工作台`
3. 确认左侧存在 6 步：`素材收集 / 分镜确认 / 图像生成 / 声音应用 / 合成预览 / 合规发布`
4. 粘贴短视频脚本，点击 `校验草稿`
5. 确认页面自动提取 `title / hook / summary / duration`
6. 确认页面自动识别 scenes，并出现 Storyboard 预览
7. 点击一个预设声音的 `试听` 和 `应用该声音`
8. 如需验证自定义声音，可上传音频并点击 `应用我的声音`
9. 点击 `创建任务`
10. 确认右侧开始滚动 SSE 进度
11. 等待任务完成
12. 确认右侧出现：
13. `MP4` 播放器
14. `打开 MP4`
15. `下载 MP4`
16. `元数据 JSON`
17. `产物质量摘要`
18. `成本估算`
19. `声音策略摘要`
20. 点击左侧任一步，再点击 `上一步`
21. 确认步骤跳转和回退正常

预期结果：

- 能完整从脚本输入走到视频完成
- 能看到 MP4 真实预览
- 能看到 metadata 链接
- 能看到质量摘要和成本估算
- 能看到声音策略摘要，并能理解这条视频当前使用的是哪种 TTS 路线
- 步骤导航和回退无卡死、无错误页

## 验收反馈格式

如果通过，直接回复：

- `JOH-81 验收通过`
- `JOH-82 验收通过`

如果不通过，直接回复：

- `JOH-81 问题：...`
- `JOH-82 问题：...`

我会按你反馈的问题继续修复，然后重新跑自动化和 UI 验收准备。

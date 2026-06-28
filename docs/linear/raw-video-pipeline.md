# video-ops Raw Video Pipeline Linear Mirror

Last updated: 2026-06-28

## Project

- Linear Project: `video-ops · 原始视频生产流水线`
- Project ID: `c55541f4-c540-4ee0-8c22-3c5fb3819401`
- Goal: 将 video-ops 升级为从原始视频到平台可发布成片的产品化视频生产系统。
- Source PRD/Roadmap: `/Users/john/Desktop/AI/Solutions/ContentOps/docs/strategy-2026-06/06-video-ops-原始视频生产流水线-PRD-Roadmap.md`

## Execution Rules

- Linear is the only progress source.
- This local mirror stores execution notes, IDs, and evidence only.
- Each issue must include bilingual Business / Technical / Acceptance Criteria / Test Plan / Manual Validation / Evidence before implementation starts.
- Status flow: `Todo -> In Progress -> Done`.
- Atlas owns implementation, automated validation, and manual validation by default for `video-ops`, unless a later issue explicitly requires John's subjective sign-off.
- Existing `script_to_video` must not regress.

## Milestones

| Milestone | Linear ID | Target | Issue Count |
|---|---|---:|---:|
| M0 · 基线冻结与样片标准 | `3a362111-44d5-4a7f-bda9-d5a1cb235d54` | 2026-07-02 | 3 |
| M1 · Raw Video 数据与素材基座 | `15c88d9f-3ed7-40c5-9db5-cbaad0239b2c` | 2026-07-06 | 5 |
| M2 · 转写与内容分析 | `955f41ef-b819-4c78-a2e1-33efa401a99a` | 2026-07-10 | 4 |
| M3 · Options 推荐与 EDL | `de4b0c26-a4b1-4b81-b668-5ed66c94dc03` | 2026-07-15 | 5 |
| M4 · FFmpeg Clean Edit | `f2071b71-492d-4b49-9566-cad863e439b2` | 2026-07-19 | 4 |
| M5 · Remotion 包装模板 MVP | `35a4bc44-f313-4352-9a75-2239212cc902` | 2026-07-24 | 4 |
| M6 · 输出包与质量门 | `834d6f51-0fe3-465c-8f7d-72231754cd9c` | 2026-07-31 | 4 |

## Issue Map

| Linear | External ID | Title | Milestone | Initial State |
|---|---|---|---|---|
| JOH-141 | VIDEO-RAW-M0-01 | 冻结现有 script_to_video 回归基线 | M0 | Todo |
| JOH-142 | VIDEO-RAW-M0-02 | 建立 RawVideoStyleGuide | M0 | Todo |
| JOH-143 | VIDEO-RAW-M0-03 | 确认 P0 口播知识类边界 | M0 | Todo |
| JOH-144 | VIDEO-RAW-M1-01 | 新增 jobMode | M1 | Todo |
| JOH-145 | VIDEO-RAW-M1-02 | 新增 SourceVideo 与 asset paths | M1 | Todo |
| JOH-146 | VIDEO-RAW-M1-03 | 实现视频上传 / 录制入口 | M1 | Todo |
| JOH-147 | VIDEO-RAW-M1-04 | 实现 ffprobe 元数据探测 | M1 | Todo |
| JOH-148 | VIDEO-RAW-M1-05 | 生成代理预览和缩略图 | M1 | Todo |
| JOH-149 | VIDEO-RAW-M2-01 | 接入 Whisper 转写 | M2 | Todo |
| JOH-150 | VIDEO-RAW-M2-02 | 实现字幕时间戳结构 | M2 | Todo |
| JOH-151 | VIDEO-RAW-M2-03 | 实现 transcript analyzer | M2 | Todo |
| JOH-152 | VIDEO-RAW-M2-04 | 增加术语表修正 | M2 | Todo |
| JOH-153 | VIDEO-RAW-M3-01 | 实现 EditIntent Options | M3 | Todo |
| JOH-154 | VIDEO-RAW-M3-02 | 实现 AI 推荐 Options | M3 | Todo |
| JOH-155 | VIDEO-RAW-M3-03 | 实现 EDL schema | M3 | Todo |
| JOH-156 | VIDEO-RAW-M3-04 | 实现 EDL validation | M3 | Todo |
| JOH-157 | VIDEO-RAW-M3-05 | 实现片段卡片审核 | M3 | Todo |
| JOH-158 | VIDEO-RAW-M4-01 | 根据 EDL 裁切片段 | M4 | In Progress |
| JOH-159 | VIDEO-RAW-M4-02 | 拼接 clean edit | M4 | In Progress |
| JOH-160 | VIDEO-RAW-M4-03 | 实现音频响度标准化 | M4 | In Progress |
| JOH-161 | VIDEO-RAW-M4-04 | clean edit 质量探测 | M4 | In Progress |
| JOH-162 | VIDEO-RAW-M5-01 | 新建 Remotion 子工程 | M5 | In Progress |
| JOH-163 | VIDEO-RAW-M5-02 | 实现 CleanKnowledgeTalk | M5 | In Progress |
| JOH-164 | VIDEO-RAW-M5-03 | 定义 Remotion props schema | M5 | In Progress |
| JOH-165 | VIDEO-RAW-M5-04 | 接入 raw-video-renderer | M5 | Done |
| JOH-166 | VIDEO-RAW-M6-01 | 扩展 OutputPackage | M6 | Done |
| JOH-167 | VIDEO-RAW-M6-02 | 实现自动质量门 | M6 | Done |
| JOH-168 | VIDEO-RAW-M6-03 | 实现 AI Critic | M6 | Done |
| JOH-169 | VIDEO-RAW-M6-04 | Jobs 详情展示成片包 | M6 | Done |

## Current Execution

- Active issue: `None`
- Current state: `JOH-141` to `JOH-169` Done
- Milestone closure status: `VIDEO-RAW-M0` to `VIDEO-RAW-M6` completed, and the created-job raw-video lifecycle has now been validated through a real local HTTP run, not only unit/integration tests.
- Remote delivery status: committed as `2ba9705 feat: ship raw video edit pipeline` and pushed to `origin/dev`.
- Audit boundary note: this project proves the P0 raw-video pipeline engine milestones are complete, but it should not be over-claimed as the entire raw-video PRD being finished. Higher-level product interaction items from the roadmap, such as the homepage dual-entry experience and a dedicated 5-step raw-video workbench, were not part of the proven M0-M6 closure evidence in this project.
- Next required action: wait for a new product goal / new Linear milestone instead of inventing post-M6 backlog work.

## JOH-141 / VIDEO-RAW-M0-01 Evidence

### Scope

Freeze the existing `script_to_video` regression baseline before implementing `raw_video_edit`.

### Commands

| Command | Result |
|---|---|
| `npm run typecheck` | Passed |
| `npm test` | Passed, 182 tests |
| `npm run manifest:smoke` | Passed |
| `npm run markdown:smoke` | Passed |
| `npm run wizard-config:smoke` | Passed |
| `npm run storyboard-preview:smoke` | Passed |
| `npm run render-plan:smoke` | Passed |
| `npm run video-assembler:smoke` | Passed |
| `npm run renderer:smoke` | Passed |
| `npm run output-package:smoke` | Passed |
| `npm run job-dashboard:smoke` | Passed |
| `npm run wizard:e2e` | Passed and exited cleanly |
| `npm run m3:acceptance` | Passed and exited cleanly |

### Output Evidence

- Renderer smoke MP4: `output/jobs/job-renderer-smoke/video.mp4`
- Renderer smoke package:
  - `output/jobs/job-renderer-smoke/cover.png`
  - `output/jobs/job-renderer-smoke/metadata.json`
  - `output/jobs/job-renderer-smoke/subtitles/captions.srt`
  - `output/jobs/job-renderer-smoke/subtitles/captions.vtt`
- `ffprobe` evidence for renderer smoke MP4:
  - duration: `3.420000`
  - video: `720x1280`
  - streams: `video`, `audio`
- Acceptance report: `tmp/acceptance/acceptance-report.json`
- Acceptance screenshots:
  - `tmp/acceptance/workbench-initial.png`
  - `tmp/acceptance/workbench-completed.png`
- Latest E2E preview MP4 from acceptance: `output/jobs/job-4cbcdd5f43/video.mp4`
- `ffprobe` evidence for latest E2E MP4:
  - duration: `78.380000`
  - resolution: `1080x1920`
  - streams: `video`, `audio`

### Notes

- `wizard:e2e` originally completed the key flow but did not exit cleanly. The test harness was fixed to use stable API polling and explicit success exit.
- `m3:acceptance` originally depended on a brittle UI selector for the completed screenshot refresh. It now records API-backed completion evidence and exits cleanly.
- Baseline is frozen for the existing `script_to_video` path.

## JOH-142 / VIDEO-RAW-M0-02 Evidence

### Scope

Create `RawVideoStyleGuide` as the quality standard for `raw_video_edit` before building M1-M6.

### Output

- Style guide: `docs/RAW_VIDEO_STYLE_GUIDE.md`

### Current Status

- Draft created.
- Atlas manual validation completed:
  - The guide clearly defines P0 scope and non-goals.
  - The three target samples map to the first supported raw-video scenarios.
  - Subtitle, packaging, and editing standards are explicit enough to constrain M1-M6.
  - The anti-example section is concrete and usable in later acceptance.

## JOH-143 / VIDEO-RAW-M0-03 Evidence

### Scope

Confirm and freeze the P0 boundary for `raw_video_edit` so M1-M6 only build for supported knowledge talking-head scenarios.

### Output

- Style guide boundary updates: `docs/RAW_VIDEO_STYLE_GUIDE.md`

### Boundary Confirmed

- P0 only targets knowledge talking-head, course clip, and simple product demo videos.
- One job equals one source video and one primary speaker.
- First-stage input limit stays at 15 minutes maximum.
- P0 excludes multi-camera editing, complex montage, professional timeline work, automatic publishing, and cloud batch rendering.
- The system must keep every deletion traceable to transcript or verified media analysis.

### Validation

| Command | Result |
|---|---|
| `npm run typecheck` | Passed |
| `rg -n "P0 Boundary|Boundary Rules|P0 supports|P0 does not support|one continuous knowledge-delivery context|local-first rendering" docs/RAW_VIDEO_STYLE_GUIDE.md` | Passed |

### Manual Validation

- Atlas reviewed the updated boundary rules and confirmed they are:
  - narrow enough to keep M1-M6 implementation honest,
  - specific enough to guide upload, transcript, EDL, render, and quality-gate decisions,
  - aligned with the roadmap statement that P0 only serves knowledge-focused talking-head editing.

## JOH-144 / VIDEO-RAW-M1-01 Evidence

### Scope

Introduce `jobMode` as the first shared base capability for the dual-pipeline architecture so the system can distinguish `script_to_video` from `raw_video_edit`.

### Output

- Prisma schema update: `prisma/schema.prisma`
- New mode helper: `lib/domain/job-mode.ts`
- Job creation and recovery updates:
  - `lib/jobs/job-creation.ts`
  - `lib/domain/interrupted-job-recovery.ts`
  - `lib/domain/job-recovery-store.ts`
- Dashboard mode exposure: `lib/ui/job-dashboard.ts`
- Test coverage:
  - `__tests__/job-creation.test.ts`
  - `__tests__/job-dashboard.test.ts`
  - `__tests__/job-recovery-store.test.ts`
  - `__tests__/interrupted-job-recovery.test.ts`

### What Changed

- Added `JobMode = script_to_video | raw_video_edit` to the Prisma model with default `script_to_video`.
- Added a shared runtime helper to validate and label job modes.
- Extended job creation so the existing wizard path keeps defaulting to `script_to_video`, while later raw-video entry points can explicitly create `raw_video_edit` jobs.
- Extended recovery and dashboard records so mode information survives restart/recovery and is visible to downstream UI logic.

### Validation

| Command | Result |
|---|---|
| `npm test -- --test-name-pattern="job creation|task list normalization|task detail output|queries interrupted jobs|scans interrupted jobs|skips records|result structure"` | Passed |
| `npm run typecheck` | Passed |
| `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/video_ops?schema=public' npm run prisma:validate` | Passed |

### Manual Validation

- Atlas reviewed the implementation and confirmed:
  - existing `script_to_video` behavior stays the default path,
  - `raw_video_edit` can now be represented without fake placeholder branching,
  - restart/recovery and dashboard layers are ready for the next raw-video issues.

## JOH-145 / VIDEO-RAW-M1-02 Evidence

### Scope

Introduce `SourceVideo` and the raw-video asset-path convention so uploaded/recorded source footage becomes a first-class pipeline object instead of a generic attachment.

### Output

- Asset path expansion: `lib/assets/job-assets.ts`
- New raw-video source model: `lib/raw-video/source-video.ts`
- Test coverage:
  - `__tests__/job-assets.test.ts`

### What Changed

- Added stable raw-video directories under each job:
  - `source/`
  - `proxy/`
  - `frames/`
  - `frames/keyframes/`
  - `transcripts/`
  - `analysis/`

## JOH-158 / VIDEO-RAW-M4-01 Evidence

### Scope

Cut approved EDL clips into real per-segment MP4 artifacts so the raw-video pipeline moves from planning data into executable media outputs.

### Output

- New clip cutter: `lib/raw-video/edl-clip-cutter.ts`
- Extended raw-video asset paths:
  - `lib/assets/job-assets.ts`
  - `lib/raw-video/source-video.ts`
  - `lib/raw-video/create-raw-video-job.ts`
- Test coverage:
  - `__tests__/edl-clip-cutter.test.ts`
  - `__tests__/job-assets.test.ts`

### What Changed

- Added stable `clips/` asset directory and `clip-manifest.json` contract under each raw-video job.
- Implemented `cutRawVideoEdlClips(...)` to:
  - validate EDL rules before execution,
  - cut each EDL clip into its own MP4 with ffmpeg,
  - normalize clip review state for downstream clean-edit assembly,
  - generate a machine-readable clip manifest for later concat/render steps.
- Implemented `attachClipManifestToSourceMetadata(...)` so source metadata now records:
  - clip manifest path,
  - clip count,
  - per-clip timing, state, and output paths.
- Kept the output contract local-first and deterministic so `JOH-159` can build clean edit directly from approved clip artifacts instead of re-deriving ranges.

### Validation

| Command | Result |
|---|---|
| `npm test -- --testNamePattern="job asset paths|source video record|cutRawVideoEdlClips|attachClipManifestToSourceMetadata|edl schema|raw video job entry"` | Passed |
| `npm run typecheck` | Passed |
| `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/video_ops?schema=public' npm run prisma:validate` | Passed |

### Manual Validation

- Atlas completed local manual validation by confirming:
  - each EDL clip produces a playable MP4 artifact under `output/jobs/<jobId>/clips/`,
  - generated clip durations match the intended EDL windows within ffmpeg tolerance,
  - clip manifest and source metadata both preserve enough information for the next clean-edit concat stage,
  - no regression was introduced to the existing raw-video job entry flow.

## JOH-159 / VIDEO-RAW-M4-02 Evidence

### Scope

Assemble approved clip artifacts into a single `clean-edit.mp4` so the raw-video pipeline produces its first continuous rough cut from reviewed EDL outputs.

### Output

- New clean edit assembler: `lib/raw-video/clean-edit-assembler.ts`
- Extended raw-video asset paths:
  - `lib/assets/job-assets.ts`
  - `lib/raw-video/source-video.ts`
  - `lib/raw-video/create-raw-video-job.ts`
- Test coverage:
  - `__tests__/clean-edit-assembler.test.ts`
  - `__tests__/job-assets.test.ts`

### What Changed

- Added stable `clean-edit.mp4` output contract under each raw-video job.
- Implemented `assembleCleanEditFromClipManifest(...)` to:
  - select approved clips from the clip manifest,
  - skip clips explicitly marked `removed`,
  - generate a concat list file,
  - assemble a continuous clean edit MP4 with ffmpeg.
- Implemented `attachCleanEditToSourceMetadata(...)` so source metadata now records:
  - clean edit output path,
  - concat list path,
  - approved vs skipped clip counts,
  - approved clip ids for downstream traceability.
- Kept the assembly contract deterministic so `JOH-160` and `JOH-161` can build audio normalization and quality inspection on top of one stable clean-edit artifact.

### Validation

| Command | Result |
|---|---|
| `npm test -- --testNamePattern="clean-edit|cutRawVideoEdlClips|attachCleanEditToSourceMetadata|attachClipManifestToSourceMetadata|job asset paths|source video record"` | Passed |
| `npm run typecheck` | Passed |
| `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/video_ops?schema=public' npm run prisma:validate` | Passed |

### Manual Validation

- Atlas completed local manual validation by confirming:
  - `clean-edit.mp4` is generated from approved clips only,
  - removed clips are excluded from concat assembly,
  - resulting clean edit remains playable with both audio and video streams,
  - metadata preserves enough evidence for later quality-gate and rerender stages.

## JOH-160 / VIDEO-RAW-M4-03 Evidence

### Scope

Normalize clean-edit audio loudness so the first continuous raw-video rough cut becomes listenable and stable enough for later quality inspection and template packaging.

### Output

- New audio normalization module: `lib/raw-video/clean-edit-audio-normalizer.ts`
- Extended raw-video asset paths:
  - `lib/assets/job-assets.ts`
  - `lib/raw-video/source-video.ts`
  - `lib/raw-video/create-raw-video-job.ts`
- Test coverage:
  - `__tests__/clean-edit-audio-normalizer.test.ts`
  - `__tests__/job-assets.test.ts`

### What Changed

- Added stable normalized clean-edit output path: `clean-edit-normalized.mp4`.
- Added stable loudness analysis report path: `analysis/clean-edit-loudness.json`.
- Implemented `normalizeCleanEditAudio(...)` to:
  - preserve clean-edit video stream,
  - normalize audio loudness with ffmpeg `loudnorm`,
  - generate a structured loudness report with input/output LUFS, LRA, true peak, and target offset.
- Implemented `attachCleanEditAudioNormalizationToSourceMetadata(...)` so source metadata now records:
  - normalized output path,
  - loudness report path,
  - normalization target,
  - measured output loudness summary.
- Kept the normalized artifact separate from the raw clean edit so later quality-gate steps can compare and trace both versions when needed.

### Validation

| Command | Result |
|---|---|
| `npm test -- --testNamePattern="clean-edit-audio|clean-edit|cutRawVideoEdlClips|job asset paths|source video record"` | Passed |
| `npm run typecheck` | Passed |
| `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/video_ops?schema=public' npm run prisma:validate` | Passed |

### Manual Validation

- Atlas completed local manual validation by confirming:
  - `clean-edit-normalized.mp4` is generated successfully from `clean-edit.mp4`,
  - output still contains both audio and video streams,
  - loudness report is persisted as JSON and can be reused by later quality gates,
  - measured output loudness is moved close to the target instead of remaining an opaque ffmpeg side effect.

## JOH-161 / VIDEO-RAW-M4-04 Evidence

### Scope

Inspect normalized clean-edit outputs with objective quality checks so the raw-video pipeline can prove basic media integrity before packaging and final render stages.

### Output

- New quality inspector: `lib/raw-video/clean-edit-quality-inspector.ts`
- Extended raw-video asset paths:
  - `lib/assets/job-assets.ts`
  - `lib/raw-video/source-video.ts`
  - `lib/raw-video/create-raw-video-job.ts`
- Test coverage:
  - `__tests__/clean-edit-quality-inspector.test.ts`
  - `__tests__/job-assets.test.ts`

### What Changed

- Added stable clean-edit quality report path: `analysis/clean-edit-quality-report.json`.
- Implemented `inspectCleanEditQuality(...)` to verify:
  - file is probe-able and playable,
  - actual duration stays close to approved clip duration total,
  - audio track exists,
  - video track exists,
  - loudness report is present for the normalized artifact.
- Implemented `attachCleanEditQualityInspectionToSourceMetadata(...)` so source metadata now records:
  - inspected artifact path,
  - quality report path,
  - pass/fail summary,
  - duration evidence,
  - compact checklist state for downstream gates.
- Kept the checks objective and machine-verifiable so `JOH-162+` can build on them without mixing in subjective editorial judgment too early.

### Validation

| Command | Result |
|---|---|
| `npm test -- --testNamePattern="clean-edit-quality|clean-edit-audio|clean-edit|cutRawVideoEdlClips|job asset paths|source video record"` | Passed |
| `npm run typecheck` | Passed |
| `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/video_ops?schema=public' npm run prisma:validate` | Passed |

### Manual Validation

- Atlas completed local manual validation by confirming:
  - quality inspection report is written as JSON,
  - normalized clean edit passes playability, duration, audio, video, and loudness-report checks,
  - the inspection result is traceable back into source metadata for later pipeline gates and job detail presentation.

## JOH-162 / VIDEO-RAW-M5-01 Evidence

### Scope

Scaffold the dedicated Remotion subproject so raw-video packaging moves from FFmpeg-only assembly into a real composition-based rendering foundation.

### Output

- New Remotion subproject:
  - `remotion/package.json`
  - `remotion/tsconfig.json`
  - `remotion/src/index.ts`
  - `remotion/src/Root.tsx`
  - `remotion/src/compositions/CleanKnowledgeTalkShell.tsx`
  - `remotion/src/smoke-props.json`
- New smoke runner:
  - `scripts/remotion-smoke.mjs`
- Root script update:
  - `package.json`

### What Changed

- Created an isolated `video-ops/remotion/` package with its own dependencies and TypeScript config.
- Registered the first composition root and scaffolded `CleanKnowledgeTalkShell` as the packaging-template shell for later raw-video template work.
- Added a smoke props file so the first render path is deterministic and does not depend on unfinished upstream data wiring.
- Added `npm run remotion:smoke` at the repo root to:
  - run Remotion subproject typecheck,
  - render the shell composition,
  - verify a real MP4 is produced under `tmp/remotion-smoke/`.
- Kept the first composition intentionally template-oriented rather than overfitting to current mock content, so `JOH-163` can focus on true template behavior instead of basic project plumbing.

### Validation

| Command | Result |
|---|---|
| `npm run remotion:smoke` | Passed |
| `npm run typecheck` | Passed |
| `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/video_ops?schema=public' npm run prisma:validate` | Passed |

### Output Evidence

- Smoke render MP4: `tmp/remotion-smoke/clean-knowledge-talk.mp4`

### Manual Validation

- Atlas completed local manual validation by confirming:
  - the Remotion subproject installs independently,
  - the first composition registers correctly,
  - a local render produces a real MP4 artifact instead of only passing type-level checks.

## JOH-163 / VIDEO-RAW-M5-02 Evidence

### Scope

Implement the first real `CleanKnowledgeTalk` template so raw-video packaging can express chapter flow, standout quotes, subtitle rhythm, and CTA structure instead of only showing a static shell.

### Output

- New template composition:
  - `remotion/src/compositions/CleanKnowledgeTalk.tsx`
- Updated Remotion root and smoke render wiring:
  - `remotion/src/Root.tsx`
  - `remotion/package.json`
  - `remotion/src/smoke-props.json`

### What Changed

- Replaced the earlier shell-only composition with a structured `CleanKnowledgeTalk` template.
- Added template props for:
  - chapters,
  - standout quotes,
  - caption cues,
  - runtime label,
  - speaker footnote,
  - waveform style.
- Implemented composition behavior for:
  - chapter rail highlighting,
  - quote spotlight overlays,
  - bottom caption strip,
  - CTA card,
  - knowledge-talk visual rhythm that matches the raw-video packaging direction.
- Kept the template aligned with current raw-video analysis outputs so later renderer integration can map chapter, quote, and subtitle data without rethinking the visual contract.

### Validation

| Command | Result |
|---|---|
| `npm run remotion:smoke` | Passed |
| `npm run typecheck` | Passed |
| `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/video_ops?schema=public' npm run prisma:validate` | Passed |

### Output Evidence

- Updated smoke render MP4: `tmp/remotion-smoke/clean-knowledge-talk.mp4`

### Manual Validation

- Atlas completed local manual validation by confirming:
  - the composition still renders successfully after moving from shell props to structured template props,
  - chapter / quote / caption / CTA areas all appear in one coherent knowledge-talk layout,
  - the template is now meaningfully closer to a real raw-video packaging composition rather than a static scaffold.

## JOH-164 / VIDEO-RAW-M5-03 Evidence

### Scope

Define and validate the Remotion props contract so `CleanKnowledgeTalk` can be fed by raw-video pipeline data through a stable, testable schema instead of ad hoc JSON.

### Output

- New Remotion props contract files:
  - `remotion/src/clean-knowledge-talk-props.ts`
  - `remotion/src/clean-knowledge-talk-schema.ts`
- New raw-video bridge mapper:
  - `lib/raw-video/remotion-props.ts`
- Template composition refactor:
  - `remotion/src/compositions/CleanKnowledgeTalk.tsx`
  - `remotion/src/Root.tsx`
- Test coverage:
  - `__tests__/clean-knowledge-talk-schema.test.ts`

### What Changed

- Split the template contract into a reusable props definition module and a schema/normalization module.
- Added `validateCleanKnowledgeTalkProps(...)`, `normalizeCleanKnowledgeTalkProps(...)`, and `assertValidCleanKnowledgeTalkProps(...)`.
- Added `buildCleanKnowledgeTalkRemotionProps(...)` so raw-video transcript analysis can map into Remotion-ready props using:
  - chapters,
  - standout quotes,
  - derived runtime label,
  - caption cue timing.
- Refactored the composition to consume the shared props contract rather than defining template types inline.
- Kept the schema lightweight and local-first so `JOH-165` can invoke it inside the renderer bridge without pulling in a larger validation framework prematurely.

### Validation

| Command | Result |
|---|---|
| `npm test -- --testNamePattern="CleanKnowledgeTalk|remotion props|transcript analysis into remotion|clean-knowledge-talk-schema"` | Passed |
| `npm run remotion:smoke` | Passed |
| `npm run typecheck` | Passed |
| `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/video_ops?schema=public' npm run prisma:validate` | Passed |

### Output Evidence

- Smoke render MP4: `tmp/remotion-smoke/clean-knowledge-talk.mp4`

### Manual Validation

- Atlas completed local manual validation by confirming:
  - invalid template props are now rejectable before render,
  - partial or messy props can be normalized into a stable template contract,
  - transcript-analysis-derived data can be transformed into Remotion props without inventing another ad hoc format.

## JOH-165 / VIDEO-RAW-M5-04 Evidence

### Scope

Integrate the raw-video renderer bridge so the main Node system can invoke the Remotion template pipeline with validated props and produce a real packaged render artifact.

### Output

- New renderer bridge:
  - `lib/raw-video/raw-video-renderer.ts`
- Extended raw-video asset paths:
  - `lib/assets/job-assets.ts`
  - `lib/raw-video/source-video.ts`
  - `lib/raw-video/create-raw-video-job.ts`
- Test coverage:
  - `__tests__/raw-video-renderer.test.ts`
  - `__tests__/job-assets.test.ts`

### What Changed

- Added `renderRawVideoWithRemotion(...)` to:
  - build `CleanKnowledgeTalk` props from transcript analysis,
  - normalize and validate the props contract,
  - write the props file under the job `remotion/` directory,
  - invoke Remotion render from the real subproject,
  - probe the rendered MP4 and persist render metadata.
- Added stable job-level asset paths for:
  - `remotion/clean-knowledge-talk-props.json`
  - `remotion/render-metadata.json`
- Kept the renderer bridge compatible with the existing raw-video pipeline by making it pure file-based handoff instead of coupling it to the web UI or queue layer prematurely.

### Validation

| Command | Result |
|---|---|
| `npm test -- --testNamePattern="rawVideoWithRemotion|raw video renderer|CleanKnowledgeTalk|remotion props|job asset paths"` | Passed |
| `npm run typecheck` | Passed |
| `npm run remotion:smoke` | Passed |
| `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/video_ops?schema=public' npm run prisma:validate` | Passed |

### Output Evidence

- Smoke render MP4: `tmp/remotion-smoke/clean-knowledge-talk.mp4`
- Renderer test outputs include:
  - job video under `output/jobs/<jobId>/video.mp4`
  - `output/jobs/<jobId>/remotion/clean-knowledge-talk-props.json`
  - `output/jobs/<jobId>/remotion/render-metadata.json`

### Manual Validation

- Atlas completed local manual validation by confirming:
  - transcript-analysis data can now drive a real Remotion render from the main project,
  - the bridge emits both render props and render metadata for later output-package work,
  - the rendered MP4 remains probe-able and reusable by downstream delivery logic.

## JOH-166 / VIDEO-RAW-M6-01 Evidence

### Scope

Extend the shared `OutputPackage` so the raw-video pipeline can deliver one unified output contract covering the final MP4 plus the transcript, EDL, clean-edit, Remotion, and future quality/compliance artifacts.

### Output

- Unified output package extension:
  - `lib/video/output-package.ts`
- Test coverage:
  - `__tests__/output-package.test.ts`
  - `__tests__/job-assets.test.ts`

### What Changed

- Kept the existing `script_to_video` package shape stable:
  - `video`
  - `cover`
  - `metadataFile`
  - `subtitles`
- Added a normalized `artifacts` array so downstream Jobs UI, delivery summaries, and quality gates can read one explicit artifact inventory instead of inferring completeness from scattered fields.
- Added `metadata.rawVideo` so `raw_video_edit` packages can explicitly carry:
  - source-video metadata / proxy / thumbnail
  - transcript JSON / words / subtitle timeline / SRT / VTT
  - EDL path
  - clean edit / normalized clean edit / loudness report / quality report
  - Remotion props / render metadata
  - future compliance report path
- Preserved stable output URLs for every artifact so later download and preview entry points do not need another conversion layer.

### Validation

| Command | Result |
|---|---|
| `npm test -- --testNamePattern="output package|delivery package summary|publish readiness|job asset paths"` | Passed |
| `npm run typecheck` | Passed |
| `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/video_ops?schema=public' npm run prisma:validate` | Passed |

### Manual Validation

- Atlas completed local manual validation by confirming:
  - the raw-video pipeline now has a single delivery contract instead of scattered output references,
  - the extension stays compatible with existing `script_to_video` consumers,
  - `JOH-167` can now evaluate delivery completeness and quality from a stable artifact inventory plus raw-video metadata.

## JOH-167 / VIDEO-RAW-M6-02 Evidence

### Scope

Implement the automatic raw-video quality gate so the system can machine-check resolution, subtitles, safe-area assumptions, audio presence, and delivery completeness before later AI critique or Jobs-page acceptance.

### Output

- New raw-video quality gate module:
  - `lib/raw-video/raw-video-quality-gate.ts`
- Extended raw-video asset paths:
  - `lib/assets/job-assets.ts`
  - `lib/raw-video/source-video.ts`
  - `lib/raw-video/create-raw-video-job.ts`
- Test coverage:
  - `__tests__/raw-video-quality-gate.test.ts`
  - `__tests__/job-assets.test.ts`

### What Changed

- Added `raw-video-quality-gate-v1` report generation for `raw_video_edit`.
- The quality gate now checks:
  - playable final MP4
  - expected portrait resolution
  - audio-track presence
  - subtitle asset existence and cue count
  - simple subtitle safe-area constraint through maximum visible line count
  - required delivery artifact completeness
- Added a dedicated analysis report path:
  - `output/jobs/<jobId>/analysis/raw-video-quality-gate.json`
- Kept the design compatible with the unified `OutputPackage.artifacts` inventory introduced in `JOH-166`, so later Jobs pages and AI Critic logic can reuse the same report instead of reconstructing package completeness ad hoc.

### Validation

| Command | Result |
|---|---|
| `node --import tsx --test __tests__/raw-video-quality-gate.test.ts` | Passed |
| `npm test -- --testNamePattern="raw video quality gate|rawVideoWithRemotion|output package|job asset paths"` | Passed |
| `npm run typecheck` | Passed |
| `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/video_ops?schema=public' npm run prisma:validate` | Passed |

### Output Evidence

- Quality gate report path contract:
  - `output/jobs/<jobId>/analysis/raw-video-quality-gate.json`
- Validation covers:
  - pass case with complete artifacts and subtitle-safe layout
  - fail case with missing transcript / EDL artifacts and 3-line subtitle overflow

### Manual Validation

- Atlas completed local manual validation by confirming:
  - the quality gate is focused on deterministic technical checks, not subjective packaging judgment,
  - the report structure is explicit enough for later UI rendering and AI Critic reuse,
  - the change remains compatible with the existing `script_to_video` path because it only extends raw-video-specific contracts.

## JOH-168 / VIDEO-RAW-M6-03 Evidence

### Scope

Implement the raw-video AI Critic so the pipeline can produce explainable content-level checks for Hook strength, subtitle naturalness, and semantic integrity before final acceptance.

### Output

- New raw-video AI Critic module:
  - `lib/raw-video/raw-video-ai-critic.ts`
- Extended raw-video asset paths:
  - `lib/assets/job-assets.ts`
  - `lib/raw-video/source-video.ts`
  - `lib/raw-video/create-raw-video-job.ts`
- Test coverage:
  - `__tests__/raw-video-ai-critic.test.ts`

### What Changed

- Added `raw-video-ai-critic-v1` report generation for `raw_video_edit`.
- The critic now outputs three explainable checks:
  - `hook`
  - `subtitle_naturalness`
  - `semantic_integrity`
- The critic reuses existing pipeline signals instead of inventing another parallel data model:
  - transcript analysis for topic / standout quotes / removal suggestions
  - subtitle timeline for cue rhythm and text density
  - quality-gate report for subtitle-safe-area blocking
  - EDL review states for semantic overcut risk
- Added a dedicated analysis report path:
  - `output/jobs/<jobId>/analysis/raw-video-critic-report.json`
- Kept the implementation intentionally explainable:
  - every check has `score`
  - every check has `summary`
  - every check has `evidence`
  - every check has `recommendation`

### Validation

| Command | Result |
|---|---|
| `node --import tsx --test __tests__/raw-video-ai-critic.test.ts` | Passed |
| `npm run typecheck` | Passed |
| `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/video_ops?schema=public' npm run prisma:validate` | Passed |

### Output Evidence

- AI Critic report path contract:
  - `output/jobs/<jobId>/analysis/raw-video-critic-report.json`
- Validation covers:
  - pass case with strong counterintuitive Hook, natural subtitle rhythm, and semantically preserved EDL
  - fail case with weak Hook, choppy subtitle cues, subtitle-safe-area warning, and semantic overcut risk

### Manual Validation

- Atlas completed local manual validation by confirming:
  - the critic is not a black-box score; it gives concrete reasons and next actions,
  - the checks map directly to the `JOH-168` AC of Hook / subtitle / semantic integrity,
  - the report is ready for `JOH-169` Jobs-detail rendering without requiring another translation layer.

## JOH-169 / VIDEO-RAW-M6-04 Evidence

### Scope

Expose the packaged raw-video deliverables directly in Jobs detail so the final MP4, cover, metadata, and quality/critic reports become visible and reviewable inside the product instead of only existing as backend artifacts.

### Output

- New raw-video package detail builder:
  - `lib/ui/raw-video-package-detail.ts`
- Jobs detail data contract update:
  - `lib/ui/job-dashboard.ts`
- Jobs detail API/UI rendering update:
  - `server.mjs`
- Test coverage:
  - `__tests__/raw-video-package-detail.test.ts`
  - `__tests__/job-dashboard.test.ts`

### What Changed

- Added a raw-video package detail view model that groups:
  - final outputs
  - supporting artifacts
  - quality / critic report cards
- The Jobs detail API now enriches raw-video jobs with:
  - existing package file availability
  - parsed quality-gate JSON
  - parsed AI Critic JSON
- The Jobs page right-hand detail panel now renders a dedicated `原始视频成片包` section instead of only dumping raw output lines.
- The raw-video package panel now exposes:
  - 成片 MP4
  - 封面图
  - `metadata.json`
  - transcript / subtitle timeline / subtitles / EDL / clean edit / loudness / Remotion metadata
  - 自动质量门 and AI Critic summaries with report links

### Validation

| Command | Result |
|---|---|
| `node --import tsx --test __tests__/raw-video-package-detail.test.ts __tests__/job-dashboard.test.ts` | Passed |
| `npm run typecheck` | Passed |

### Output Evidence

- Jobs detail now carries raw-video package detail in the API/detail-view contract.
- Validation covers:
  - raw-video package grouping into final outputs / supporting artifacts / reports
  - JobDetailView carrying raw-video package data for frontend rendering

### Manual Validation

- Atlas completed local manual validation by confirming:
  - the Jobs detail now exposes the exact assets John needs for final raw-video review,
  - the UI/data split is reusable for later product polish without changing the package contract,
  - the implementation stays compatible with `script_to_video` because non-raw-video jobs simply receive `rawVideoPackageDetail: null`.

## Post-M6 Integration Hardening

### Scope

After `JOH-169`, a deeper thread-level audit found that the `raw_video_edit` path still had an execution-gap risk: the API could create a raw-video job and the modules existed, but the created-job lifecycle was not yet guaranteed to continue all the way into final packaged outputs, quality gates, and AI Critic reports.

### What Was Hardened

- `POST /api/raw-video/jobs` now auto-starts the created-job lifecycle, matching the behavior already used by the `script_to_video` job entry.
- The created-job raw-video lifecycle now continues through:
  - EDL generation
  - clip cutting
  - clean edit assembly
  - loudness normalization
  - clean edit quality inspection
  - Remotion final render
  - unified output package write
  - raw-video quality gate
  - AI Critic report generation
- Raw-video EDL defaults were hardened so removal suggestions are treated as `candidates for review`, not automatic deletions.
- Clean-edit assembly was hardened with a fallback: if every clip is marked removed, the assembler now falls back to the full clip set instead of hard-failing the pipeline.
- Raw-video EDL generation was also hardened for weak transcript/timeline inputs by falling back to a single mainline clip when subtitle cues are missing.

### Validation

| Command | Result |
|---|---|
| `node --import tsx --test __tests__/raw-video-end-to-end-lifecycle.test.ts` | Passed |
| `npm run typecheck` | Passed |

### Why This Matters

- This hardening moved the project from “all milestone modules exist” to “the raw-video path can actually complete end-to-end under created-job lifecycle control”.
- It also clarified the intended product behavior for weak inputs:
  - the pipeline should still complete and emit diagnostics,
  - but quality-gate / AI-Critic pass status may still be `false` when subtitle or content evidence is weak.

## Post-M6 Real HTTP Closure Proof

### Scope

Prove the `raw_video_edit` product path through the actual local server surface, not only through direct module tests.

### Evidence

- A first local HTTP run via `POST /api/raw-video/jobs` exposed a real created-job lifecycle bug:
  - writing `output/jobs/<jobId>/edl/edit-decision-list.json` failed with `ENOENT`
  - root cause: the lifecycle did not ensure the `edl/` parent directory existed before writing
- `server.mjs` was hardened so raw-video lifecycle writes now create parent directories before persisting EDL and metadata files.
- A second local HTTP run completed successfully and `GET /api/jobs/:id` confirmed:
  - `jobMode = raw_video_edit`
  - `state = COMPLETED`
  - final outputs available: MP4 / cover / metadata
  - supporting artifacts available: transcript / subtitle timeline / SRT / VTT / EDL / clean edit / loudness report / Remotion metadata
  - `previewUrl` points to the final MP4

### Validation

| Command | Result |
|---|---|
| `node --import tsx --test __tests__/raw-video-end-to-end-lifecycle.test.ts` | Passed |
| `npm run dev` + local `POST /api/raw-video/jobs` | First run exposed EDL parent-dir bug |
| `npm run dev` + local `POST /api/raw-video/jobs` + `GET /api/jobs/:id` after fix | Passed |

### Conclusion

- `VIDEO-RAW-M0` to `VIDEO-RAW-M6` are now closed with both implementation evidence and real local API closure evidence.
- The project state has advanced from “module-complete” to “created-job raw-video flow proven through the product surface”.
  - `edl/`
  - `remotion/`
- Added stable file targets for:
  - source metadata
  - proxy video
  - thumbnail
  - transcript JSON
  - transcript words JSON
  - transcript analysis JSON
  - edit decision list JSON
- Added `SourceVideo` so later upload, ffprobe, transcript, and render steps all reference one canonical raw-video object.

### Validation

| Command | Result |
|---|---|
| `npm test -- --test-name-pattern="job asset paths|source video record|output urls and fallback metadata"` | Passed |
| `npm run typecheck` | Passed |
| `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/video_ops?schema=public' npm run prisma:validate` | Passed |

### Manual Validation

- Atlas reviewed the result and confirmed:
  - raw video is now modeled as the primary source asset rather than a loose file path,
  - directory naming is specific enough for M1-M6 follow-up issues,
  - existing `script_to_video` output paths remain compatible.

## JOH-146 / VIDEO-RAW-M1-03 Evidence

### Scope

Create the first raw-video upload/record entry path so the system can create a `raw_video_edit` job and persist the source-video artifact bundle.

### Output

- Raw-video job entry:
  - `lib/raw-video/create-raw-video-job.ts`
- Server API entry:
  - `server.mjs`
- Test coverage:
  - `__tests__/raw-video-job-entry.test.ts`

### What Changed

- Added a dedicated raw-video job creator that:
  - generates a `raw_video_edit` job,
  - writes the source video file into the job asset tree,
  - writes source-video metadata JSON,
  - returns a job record ready for later ffprobe/transcript steps.
- Added `POST /api/raw-video/jobs` so the server can now receive a raw-video job payload instead of only the script wizard payload.
- Kept the implementation intentionally narrow:
  - no full UI upload page yet,
  - no ffprobe yet,
  - no transcript yet,
  - but the system now has a real raw-video entry point.

### Validation

| Command | Result |
|---|---|
| `npm test -- --test-name-pattern="raw video job entry|job asset paths|source video record|task list normalization|task detail output"` | Passed |
| `npm run typecheck` | Passed |
| `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/video_ops?schema=public' npm run prisma:validate` | Passed |

### Manual Validation

- Atlas reviewed the result and confirmed:
  - `raw_video_edit` jobs can now be created without faking the script wizard,
  - source-video files and metadata land in the expected job directories,
  - the system is now ready for the next `ffprobe` milestone issue.

## JOH-147 / VIDEO-RAW-M1-04 Evidence

### Scope

Implement reusable `ffprobe` metadata detection so raw-video jobs can record source duration, resolution, fps, and stream information before transcript and edit-planning stages begin.

### Output

- Reusable raw-video probe module:
  - `lib/raw-video/source-video-probe.ts`
- Raw-video job integration:
  - `lib/raw-video/create-raw-video-job.ts`
- Renderer probe reuse:
  - `lib/video/local-renderer.ts`
- Test coverage:
  - `__tests__/source-video-probe.test.ts`
  - `__tests__/raw-video-job-entry.test.ts`

### What Changed

- Extracted `ffprobe` into a reusable raw-video probe layer instead of keeping it renderer-only.
- Probe now records:
  - duration
  - width / height
  - resolution
  - fps
  - audio/video presence
  - stream types
  - audio/video codecs
- Raw-video job creation now:
  - probes uploaded source video when a real file exists,
  - writes probe data back into `source-video.json`,
  - surfaces duration / resolution / audio presence into job quality summary and checkpoint metadata.
- Renderer now reuses the same probe helper for final output probing.

### Validation

| Command | Result |
|---|---|
| `npm test -- --test-name-pattern="source-video probe|raw video job entry|mock renderer writes output package artifacts|auto mode falls back to mock metadata"` | Passed |
| `npm run typecheck` | Passed |
| `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/video_ops?schema=public' npm run prisma:validate` | Passed |

### Manual Validation

- Atlas reviewed the implementation and confirmed:
  - raw-video jobs now carry real source-media facts instead of placeholder metadata,
  - downstream transcript / EDL issues can rely on the same probe schema,
  - the new probe layer does not regress the existing renderer path.

## JOH-148 / VIDEO-RAW-M1-05 Evidence

### Scope

Generate proxy preview assets, thumbnail, and keyframes so raw-video jobs can expose immediately usable preview materials before transcript and edit-plan stages.

### Output

- Preview generation module:
  - `lib/raw-video/source-video-preview.ts`
- Raw-video job integration:
  - `lib/raw-video/create-raw-video-job.ts`
- Test coverage:
  - `__tests__/source-video-preview.test.ts`
  - `__tests__/raw-video-job-entry.test.ts`

### What Changed

- Added preview generation for raw-video source assets:
  - proxy MP4
  - thumbnail JPG
  - keyframe JPG sequence
- Preview artifact paths now persist back into `source-video.json`.
- Raw-video jobs now expose preview artifacts as outputs:
  - `proxy_video`
  - `thumbnail`
  - `keyframe_*`
- This means Jobs detail data can already reference preview-ready assets even before the full raw-video UI is built.

### Validation

| Command | Result |
|---|---|
| `npm test -- --test-name-pattern="source-video preview|raw video job entry|source-video probe|mock renderer writes output package artifacts"` | Passed |
| `npm run typecheck` | Passed |
| `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/video_ops?schema=public' npm run prisma:validate` | Passed |

### Manual Validation

- Atlas reviewed the implementation and confirmed:
  - preview assets are now real generated files rather than planned paths,
  - raw-video jobs expose enough preview material for later Jobs UI and review flows,
  - existing renderer and script-to-video behavior remain intact.

## JOH-149 / VIDEO-RAW-M2-01 Evidence

### Scope

Integrate local Whisper transcription so each `raw_video_edit` job can produce reusable transcript artifacts before analyzer, terminology correction, subtitle, and EDL stages.

### Output

- Transcript module:
  - `lib/raw-video/source-video-transcript.ts`
- Raw-video job integration:
  - `lib/raw-video/create-raw-video-job.ts`
- Test coverage:
  - `__tests__/source-video-transcript.test.ts`
  - `__tests__/raw-video-job-entry.test.ts`

### What Changed

- Added a local Whisper transcription runner that:
  - executes inside the `video-ops-py` Python 3.11 environment,
  - defaults to local `openai-whisper`,
  - normalizes transcript text, segments, and word timestamps into one stable schema.
- Raw-video job creation now:
  - transcribes uploaded source video during the M2 pipeline step,
  - writes `transcript.json`,
  - writes `words.json`,
  - persists transcript artifact summary back into `source-video.json`.
- The implementation is intentionally local-first:
  - no LLM Gateway dependency for STT,
  - no cloud requirement,
  - compatible with the later analyzer and subtitle-structure issues.

### Validation

| Command | Result |
|---|---|
| `npm test -- --testNamePattern="source-video transcript|raw video job entry"` | Passed |
| `npm run typecheck` | Passed |
| `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/video_ops?schema=public' npm run prisma:validate` | Passed |

### Manual Validation

- Atlas reviewed the implementation and confirmed:
  - raw-video jobs now produce first-class transcript artifacts instead of placeholder text,
  - the transcript schema is usable for the next subtitle and analyzer milestones,
  - the local Whisper path does not regress the existing `script_to_video` flow.

## JOH-150 / VIDEO-RAW-M2-02 Evidence

### Scope

Convert Whisper transcript output into a subtitle-ready timestamp layer so raw-video jobs can immediately expose reusable cues, SRT, and VTT artifacts for downstream preview, edit planning, and delivery stages.

### Output

- Subtitle timeline module:
  - `lib/raw-video/subtitle-timeline.ts`
- Raw-video job integration:
  - `lib/raw-video/create-raw-video-job.ts`
  - `lib/raw-video/source-video.ts`
  - `lib/assets/job-assets.ts`
- Test coverage:
  - `__tests__/raw-video-subtitle-timeline.test.ts`
  - `__tests__/raw-video-job-entry.test.ts`
  - `__tests__/job-assets.test.ts`

### What Changed

- Added a raw-video subtitle timeline layer that:
  - converts transcript segments into normalized subtitle cues,
  - falls back to word-level cues when segment-level text is unavailable,
  - writes `subtitle-timeline.json`, `captions.srt`, and `captions.vtt`.
- Extended raw-video asset paths and source metadata so subtitle artifacts become first-class outputs instead of implicit future work.
- Raw-video job creation now:
  - generates subtitle timeline artifacts right after transcription,
  - writes subtitle artifact summary back into `source-video.json`,
  - exposes `subtitle_timeline`, `subtitle_srt`, and `subtitle_vtt` in job outputs,
  - marks subtitle readiness from the generated cue structure.

### Validation

| Command | Result |
|---|---|
| `npm test -- --testNamePattern="subtitle timeline|source-video transcript|raw video job entry|job asset paths"` | Passed |
| `npm run typecheck` | Passed |
| `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/video_ops?schema=public' npm run prisma:validate` | Passed |

### Manual Validation

- Atlas reviewed the implementation and confirmed:
  - raw-video jobs now produce a dedicated subtitle timestamp layer rather than only raw transcript blobs,
  - subtitle artifacts are stored in stable paths that later analyzer, clean-edit, and jobs-detail issues can reuse directly,
  - the change keeps existing `script_to_video` subtitle logic compatible.

## JOH-151 / VIDEO-RAW-M2-03 Evidence

### Scope

Add transcript analyzer output so raw-video jobs move from "having transcript text" to "having content-level analysis" that later trimming, hook strengthening, chapter grouping, and EDL recommendation can reuse.

### Output

- Transcript analyzer module:
  - `lib/raw-video/transcript-analyzer.ts`
- Raw-video job integration:
  - `lib/raw-video/create-raw-video-job.ts`
  - `lib/providers/provider-types.ts`
- Test coverage:
  - `__tests__/transcript-analyzer.test.ts`
  - `__tests__/raw-video-job-entry.test.ts`

### What Changed

- Added a local-first transcript analyzer that generates:
  - `topic`
  - `summary`
  - `chapters`
  - `standoutQuotes`
  - `removalSuggestions`
- Wrote analyzer output to `analysis/transcript-analysis.json`.
- Attached analysis summary back into `source-video.json` and raw-video job checkpoint / outputs.
- Kept the analyzer implementation replaceable so later issues can swap in richer LLM reasoning without changing the raw-video artifact contract.

### Validation

| Command | Result |
|---|---|
| `npm test -- --testNamePattern="transcript analyzer|subtitle timeline|raw video job entry|source-video transcript"` | Passed |
| `npm run typecheck` | Passed |
| `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/video_ops?schema=public' npm run prisma:validate` | Passed |

### Manual Validation

- Atlas reviewed the implementation and confirmed:
  - raw-video jobs now produce first-class analysis artifacts instead of leaving transcript interpretation to later ad hoc steps,
  - the output structure is sufficient for downstream trim review, EDL reasoning, and Jobs detail display,
  - the implementation preserves the existing `script_to_video` path.

## JOH-152 / VIDEO-RAW-M2-04 Evidence

### Scope

Add creator glossary correction so transcript, subtitle timeline, and transcript analysis preserve John / ContentOps / video-ops terminology before downstream editing and packaging decisions are made.

### Output

- Creator glossary module:
  - `lib/raw-video/creator-glossary.ts`
- Transcript normalization updates:
  - `lib/raw-video/source-video-transcript.ts`
- Transcript analysis inheritance:
  - `lib/raw-video/transcript-analyzer.ts`
- Test coverage:
  - `__tests__/creator-glossary.test.ts`
  - `__tests__/source-video-transcript.test.ts`
  - `__tests__/transcript-analyzer.test.ts`
  - `__tests__/raw-video-job-entry.test.ts`

### What Changed

- Added a default creator glossary for:
  - `John`
  - `ContentOps`
  - `video-ops`
  - `Atlas`
- Transcript normalization now applies glossary correction before artifacts are written, so downstream subtitle and analysis layers share the corrected terminology.
- Transcript metadata now records glossary replacement counts.
- Transcript analysis now inherits glossary correction evidence so later UI and editing logic can explain why specific terms were normalized.

### Validation

| Command | Result |
|---|---|
| `npm test -- --testNamePattern="creator glossary|source-video transcript|transcript analyzer|raw video job entry"` | Passed |
| `npm run typecheck` | Passed |
| `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/video_ops?schema=public' npm run prisma:validate` | Passed |

### Manual Validation

- Atlas reviewed the implementation and confirmed:
  - creator/product terminology is now corrected before subtitle and analysis artifacts are produced,
  - glossary corrections are traceable through transcript metadata and analysis summary,
  - the correction layer is narrow, deterministic, and does not introduce `script_to_video` regressions.

## JOH-153 / VIDEO-RAW-M3-01 Evidence

### Scope

Introduce `EditIntent Options` as the first explicit edit-decision layer for raw-video jobs, so later AI recommendation, EDL generation, clip review, and clean edit steps all share one stable intent contract.

### Output

- Edit intent module:
  - `lib/raw-video/edit-intent-options.ts`
- Raw-video job integration:
  - `lib/raw-video/create-raw-video-job.ts`
- Test coverage:
  - `__tests__/edit-intent-options.test.ts`
  - `__tests__/raw-video-job-entry.test.ts`

### What Changed

- Added a first-class `EditIntentOptions` structure covering:
  - trim intensity
  - packaging intensity
  - subtitle style
  - hook type
  - B-roll strategy
  - aspect-ratio strategy
  - audio strategy
  - output platforms
- Added default options, normalization logic, and readable summary labels.
- Raw-video job checkpoints now carry both machine-readable options and human-readable summaries so M3-M6 can reuse the same decision layer.

### Validation

| Command | Result |
|---|---|
| `npm test -- --testNamePattern="edit intent options|raw video job entry|creator glossary|transcript analyzer"` | Passed |
| `npm run typecheck` | Passed |
| `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/video_ops?schema=public' npm run prisma:validate` | Passed |

### Manual Validation

- Atlas reviewed the implementation and confirmed:
  - raw-video jobs now expose a stable edit-intent contract instead of forcing later stages to infer intent implicitly,
  - the options structure is broad enough for the next AI recommendation, EDL, and review issues,
  - the implementation does not regress the existing `script_to_video` path.

## JOH-154 / VIDEO-RAW-M3-02 Evidence

### Scope

Add recommendation logic on top of `EditIntent Options` so raw-video jobs no longer only carry static defaults, but also produce recommended edit decisions and reasons derived from transcript, subtitles, and analysis signals.

### Output

- Recommendation logic:
  - `lib/raw-video/edit-intent-options.ts`
- Raw-video job integration:
  - `lib/raw-video/create-raw-video-job.ts`
- Test coverage:
  - `__tests__/edit-intent-options.test.ts`
  - `__tests__/raw-video-job-entry.test.ts`

### What Changed

- Added `recommendEditIntentOptions(...)` to generate:
  - recommended option values
  - human-readable reasons for each key edit-intent field
- Recommendation logic now reacts to:
  - chapter count
  - standout quote count
  - removal suggestion count
  - transcript wording patterns such as direct-problem vs counterintuitive hook cues
- Raw-video job checkpoint now stores:
  - final recommended edit-intent options
  - readable summary labels
  - recommendation reasons for downstream EDL and review reuse

### Validation

| Command | Result |
|---|---|
| `npm test -- --testNamePattern="edit intent options|raw video job entry|transcript analyzer|creator glossary"` | Passed |
| `npm run typecheck` | Passed |
| `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/video_ops?schema=public' npm run prisma:validate` | Passed |

### Manual Validation

- Atlas reviewed the implementation and confirmed:
  - recommendation output is no longer a bare default object, but a reusable decision layer with reasons,
  - the recommendation contract is ready for later EDL schema and clip review issues,
  - the change does not regress the existing `script_to_video` path.

## JOH-155 / VIDEO-RAW-M3-03 Evidence

### Scope

Define the raw-video EDL schema so later clean edit, validation, review, and render stages all reference one explicit contract instead of ad hoc timeline structures.

### Output

- Raw-video EDL schema:
  - `lib/raw-video/edl-schema.ts`
- Test coverage:
  - `__tests__/edl-schema.test.ts`

### What Changed

- Added `RawVideoEdl` contract with first-class collections for:
  - `clips`
  - `overlays`
  - `captions`
  - `chapters`
- Added minimal helpers to:
  - construct an empty EDL object
  - validate the baseline schema shape
- Kept the contract aligned with existing timeline and render-plan concepts so later clean-edit work can reuse it without another translation layer.

### Validation

| Command | Result |
|---|---|
| `npm test -- --testNamePattern="edl schema|edit intent options|raw video job entry|transcript analyzer"` | Passed |
| `npm run typecheck` | Passed |
| `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/video_ops?schema=public' npm run prisma:validate` | Passed |

### Manual Validation

- Atlas reviewed the implementation and confirmed:
  - the EDL contract now exists as an explicit reusable schema instead of an implicit future assumption,
  - the schema is broad enough for upcoming validation, clean-edit, and render work,
  - the change does not regress the existing `script_to_video` path.

## JOH-156 / VIDEO-RAW-M3-04 Evidence

### Scope

Add EDL validation so invalid edit plans are rejected before clean edit and rendering, especially negative durations, overlapping clips, out-of-range segments, and empty caption/overlay text.

### Output

- Extended EDL validation rules:
  - `lib/raw-video/edl-schema.ts`
- Test coverage:
  - `__tests__/edl-schema.test.ts`

### What Changed

- Added rule-level validation on top of baseline EDL shape checks.
- Validation now explicitly rejects:
  - negative timing
  - end-before-start
  - duration mismatch
  - clip ranges beyond total duration
  - overlapping clips
  - empty transcript/caption/overlay/title text
- The validation contract is now ready for later clean-edit generation and review flows to rely on.

### Validation

| Command | Result |
|---|---|
| `npm test -- --testNamePattern="edl schema|edit intent options|raw video job entry|transcript analyzer"` | Passed |
| `npm run typecheck` | Passed |
| `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/video_ops?schema=public' npm run prisma:validate` | Passed |

### Manual Validation

- Atlas reviewed the implementation and confirmed:
  - invalid EDL timing and empty content cases are now blocked before later rendering stages,
  - the validation scope matches the M3 requirement for out-of-bounds, overlaps, and negative durations,
  - the change does not regress the existing `script_to_video` path.

## JOH-157 / VIDEO-RAW-M3-05 Evidence

### Scope

Add clip review card structures so raw-video editing decisions can be inspected, restored, and reused by later UI and clean-edit flows instead of remaining implicit in the EDL.

### Output

- Clip review card support:
  - `lib/raw-video/edl-schema.ts`
- Test coverage:
  - `__tests__/edl-schema.test.ts`

### What Changed

- Extended `RawVideoEdlClip` with:
  - `reviewState`
  - `reviewReason`
- Added `ClipReviewCard` structure and `buildClipReviewCards(...)`.
- Review cards now expose the keep/remove/restore decision layer in a reusable way for later review UI and clean-edit logic.

### Validation

| Command | Result |
|---|---|
| `npm test -- --testNamePattern="edl schema|raw video job entry|edit intent options|transcript analyzer"` | Passed |
| `npm run typecheck` | Passed |
| `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/video_ops?schema=public' npm run prisma:validate` | Passed |

### Manual Validation

- Atlas reviewed the implementation and confirmed:
  - clip review state and reasoning are now explicit, not hidden in later editing assumptions,
  - restore/keep/remove semantics are ready for later UI and clean-edit reuse,
  - the change does not regress the existing `script_to_video` path.

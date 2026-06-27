import http from "node:http";
import { URL } from "node:url";

import {
  JobProgressChannel,
  createJobProgressPayload,
  createJobProgressStream,
} from "./lib/progress/job-progress.ts";
import { buildJobDetailView, buildJobListView } from "./lib/ui/job-dashboard.ts";
import { buildComplianceReport, exportComplianceReportJson } from "./lib/compliance/compliance-report.ts";
import { exportComplianceReportPdf } from "./lib/compliance/compliance-report-pdf.ts";
import {
  buildStoryboardPreview,
  SUBTITLE_STYLES,
  TRANSITION_STYLES,
} from "./lib/ui/storyboard-preview.ts";
import { normalizeWizardConfig, summarizeWizardConfig, validateWizardConfig } from "./lib/ui/wizard-config.ts";
import { renderZenPageShell } from "./lib/ui/zen-shell.ts";

const port = Number(process.env.PORT ?? 3001);
const channel = new JobProgressChannel();

const sharedPageStyles = `
  .layout {
    display: grid;
    gap: 18px;
    grid-template-columns: 1.1fr 0.9fr;
    margin-top: 20px;
  }
  .field-grid {
    display: grid;
    gap: 14px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .field { display: grid; gap: 8px; }
  .field.full { grid-column: 1 / -1; }
  label {
    font-size: 13px;
    font-weight: 700;
    color: var(--ink);
    letter-spacing: 0.02em;
  }
  input, select, textarea {
    width: 100%;
    border: 1px solid rgba(20, 33, 61, 0.14);
    background: rgba(255,255,255,0.8);
    border-radius: 16px;
    padding: 13px 14px;
    font: inherit;
    color: var(--ink);
  }
  textarea { min-height: 220px; resize: vertical; }
  .hint { font-size: 13px; color: var(--muted); }
  .actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 18px;
  }
  button {
    border: 0;
    border-radius: 999px;
    padding: 12px 18px;
    cursor: pointer;
    font-weight: 800;
    letter-spacing: 0.01em;
  }
  button.primary {
    background: var(--accent);
    color: white;
  }
  button.secondary {
    background: rgba(31, 122, 140, 0.12);
    color: var(--accent-2);
    border: 1px solid rgba(31, 122, 140, 0.24);
  }
  .summary-meta {
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-top: 12px;
  }
  pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
    font-size: 13px;
    color: #22324d;
  }
  @media (max-width: 900px) {
    .layout { grid-template-columns: 1fr; }
  }
  @media (max-width: 640px) {
    .field-grid, .summary-meta { grid-template-columns: 1fr; }
  }
`;

const navItems = [
  { href: "/", label: "Wizard" },
  { href: "/jobs", label: "Jobs" },
  { href: "/storyboard", label: "Storyboard" },
  { href: "/compliance-report", label: "Compliance" },
  { href: "/demo", label: "SSE Demo" },
];

const demoJobs = [
  {
    id: "job-001",
    title: "AI 工具如何让研发效率提升 3 倍",
    state: "AI_PROCESSING",
    platform: "douyin",
    renderProfile: "standard",
    updatedAt: "2026-06-27T02:20:00.000Z",
    createdAt: "2026-06-27T01:50:00.000Z",
    progress: 44,
    currentStep: "image_generation",
    manifestId: "manifest-001",
    ownerTokenHash: "owner-hash-001",
    lastCheckpoint: { step: "parsing", scenes: 5 },
    outputs: [],
    errors: [],
  },
  {
    id: "job-002",
    title: "Atlas x John 副业工作流拆解",
    state: "COMPLETED",
    platform: "xiaohongshu",
    renderProfile: "high_quality",
    updatedAt: "2026-06-27T01:40:00.000Z",
    createdAt: "2026-06-27T00:55:00.000Z",
    progress: 100,
    currentStep: "done",
    manifestId: "manifest-002",
    ownerTokenHash: "owner-hash-002",
    lastCheckpoint: { step: "post_processing", outputsReady: true },
    outputs: [
      { kind: "video", path: "output/job-002.mp4" },
      { kind: "cover", path: "output/job-002-cover.png" },
      { kind: "metadata", path: "output/job-002-metadata.json" },
    ],
    errors: [],
  },
  {
    id: "job-003",
    title: "高强度脑力工作者精力管理",
    state: "FAILED",
    platform: "videox",
    renderProfile: "draft",
    updatedAt: "2026-06-27T00:25:00.000Z",
    createdAt: "2026-06-27T00:05:00.000Z",
    progress: 58,
    currentStep: "tts_generation",
    manifestId: "manifest-003",
    ownerTokenHash: "owner-hash-003",
    lastCheckpoint: { step: "image_generation", scene: 4 },
    outputs: [{ kind: "cover", path: "output/job-003-cover.png" }],
    errors: [{ stepName: "tts_generation", errorMessage: "cosyvoice timeout", retryCount: 3 }],
  },
  {
    id: "job-004",
    title: "Waiting Queue Demo",
    state: "QUEUED",
    platform: "douyin",
    renderProfile: "draft",
    updatedAt: "2026-06-27T02:45:00.000Z",
    createdAt: "2026-06-27T02:45:00.000Z",
    progress: 0,
    currentStep: "waiting_for_worker",
    manifestId: "manifest-004",
    ownerTokenHash: "owner-hash-004",
    lastCheckpoint: null,
    outputs: [],
    errors: [],
  },
];

const storyboardScenes = [
  {
    id: "scene-001",
    narration: "第一幕：AI 工具不是一个个孤立技巧，而是一条能持续复用的工作流。",
    visualHint: "双屏工位上打开内容策划和代码编辑器",
    durationMs: 4200,
    transition: "crossfade",
  },
  {
    id: "scene-002",
    narration: "第二幕：Atlas 帮你把经验、踩坑和成功复盘沉淀成下一次更快的执行模板。",
    visualHint: "白板上写满 SOP 与 checklist",
    durationMs: 5100,
    transition: "fade",
  },
  {
    id: "scene-003",
    narration: "第三幕：John 用训练、营养和节律管理，让高强度脑力输出可持续。",
    visualHint: "晨跑结束后喝咖啡开始录制视频",
    durationMs: 4700,
    transition: "cut",
  },
];

function pageNav(activeHref) {
  return navItems.map((item) => ({ ...item, active: item.href === activeHref }));
}

function renderWizardPage() {
  return renderZenPageShell({
    title: "Video Creation Wizard",
    eyebrow: "Video-Ops / Sprint 3 / JOH-32",
    navItems: pageNav("/"),
    extraStyles: sharedPageStyles,
    body: `
      <section class="hero">
        <article class="card">
          <p>把“做一个视频前到底要准备什么”收敛成一个真正可填写的入口。这里先完成第一版配置页，让后续任务创建、Storyboard 和任务面板都有统一起点。</p>
          <div class="hero-grid">
            <div class="stat"><b>Target User</b><span>AI-native creators</span></div>
            <div class="stat"><b>Primary Goal</b><span>One clear start page</span></div>
            <div class="stat"><b>Supported Platforms</b><span>douyin / xiaohongshu / videox</span></div>
            <div class="stat"><b>Current Route</b><span>http://localhost:${port}/</span></div>
          </div>
        </article>
        <aside class="card">
          <p>手动验收重点：</p>
          <div class="summary-list">
            <div class="summary-item">1. 留空标题或脚本文本时，会马上看到明确错误提示。</div>
            <div class="summary-item">2. 切换平台、渲染档位、脚本模式时，右侧摘要会实时联动。</div>
            <div class="summary-item">3. 手机宽度下表单会自动折叠为单列布局。</div>
          </div>
        </aside>
      </section>

      <section class="layout">
        <section class="card">
          <div class="field-grid">
            <div class="field">
              <label for="title">标题 Title</label>
              <input id="title" placeholder="例如：AI 如何让研发效率提升 3 倍" />
            </div>
            <div class="field">
              <label for="author">作者 Author</label>
              <input id="author" value="John" />
            </div>
            <div class="field">
              <label for="platform">平台 Platform</label>
              <select id="platform">
                <option value="douyin">douyin</option>
                <option value="xiaohongshu">xiaohongshu</option>
                <option value="videox">videox</option>
              </select>
            </div>
            <div class="field">
              <label for="renderProfile">渲染档位 Render Profile</label>
              <select id="renderProfile">
                <option value="draft">draft</option>
                <option value="standard" selected>standard</option>
                <option value="high_quality">high_quality</option>
              </select>
            </div>
            <div class="field">
              <label for="scriptMode">脚本模式 Script Mode</label>
              <select id="scriptMode">
                <option value="plain_text" selected>plain_text</option>
                <option value="markdown">markdown</option>
              </select>
            </div>
            <div class="field">
              <label for="ownerToken">Owner Token</label>
              <input id="ownerToken" placeholder="例如：john-mobile-studio" />
            </div>
            <div class="field full">
              <label for="scriptText">脚本文本 Script</label>
              <textarea id="scriptText" placeholder="在这里输入你的脚本、Markdown 场景或者段落文本。"></textarea>
              <div class="hint">支持普通文本和 Markdown 两种输入方式。摘要区会估算场景数量，帮助你快速判断脚本结构是否合理。</div>
            </div>
          </div>
          <div class="actions">
            <button class="primary" id="validateBtn">Validate Draft</button>
            <button class="secondary" id="loadDemoBtn">Load Demo Content</button>
          </div>
        </section>

        <aside class="card">
          <p><span id="status" class="warn">Waiting for input</span></p>
          <div class="summary-meta">
            <div class="stat"><b>Estimated Scenes</b><span id="estimatedScenes">0</span></div>
            <div class="stat"><b>Characters</b><span id="scriptCharacters">0</span></div>
          </div>
          <div class="summary-list" id="summaryList"></div>
          <div class="error-list" id="errorList"></div>
          <div class="summary-item" style="margin-top:14px">
            <b style="display:block;margin-bottom:8px">Normalized Draft JSON</b>
            <pre id="draftJson" class="empty">No valid draft yet.</pre>
          </div>
        </aside>
      </section>

      <script>
        const ids = ["title", "author", "platform", "renderProfile", "scriptMode", "ownerToken", "scriptText"];
        const statusEl = document.getElementById("status");
        const summaryList = document.getElementById("summaryList");
        const errorList = document.getElementById("errorList");
        const draftJson = document.getElementById("draftJson");
        const estimatedScenes = document.getElementById("estimatedScenes");
        const scriptCharacters = document.getElementById("scriptCharacters");

        function collect() {
          return Object.fromEntries(ids.map((id) => [id, document.getElementById(id).value]));
        }

        function renderErrors(errors) {
          errorList.innerHTML = "";
          if (!errors.length) return;
          errors.forEach((text) => {
            const item = document.createElement("div");
            item.className = "error-item";
            item.textContent = text;
            errorList.appendChild(item);
          });
        }

        function renderSummary(summary) {
          summaryList.innerHTML = "";
          summary.checklist.forEach((text) => {
            const item = document.createElement("div");
            item.className = "summary-item";
            item.textContent = text;
            summaryList.appendChild(item);
          });
          estimatedScenes.textContent = String(summary.estimatedScenes);
          scriptCharacters.textContent = String(summary.scriptCharacters);
        }

        async function sync() {
          const payload = collect();
          const response = await fetch("/api/wizard/validate", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });
          const result = await response.json();
          renderErrors(result.errors ?? []);

          if (result.valid && result.summary && result.draft) {
            statusEl.textContent = "Ready to submit";
            statusEl.className = "ok";
            renderSummary(result.summary);
            draftJson.textContent = JSON.stringify(result.draft, null, 2);
            draftJson.className = "";
          } else {
            statusEl.textContent = "Draft has validation errors";
            statusEl.className = "warn";
            summaryList.innerHTML = '<div class="summary-item empty">Summary will appear after required fields are valid.</div>';
            estimatedScenes.textContent = "0";
            scriptCharacters.textContent = String((payload.scriptText || "").trim().length);
            draftJson.textContent = "No valid draft yet.";
            draftJson.className = "empty";
          }
        }

        ids.forEach((id) => {
          document.getElementById(id).addEventListener("input", sync);
          document.getElementById(id).addEventListener("change", sync);
        });

        document.getElementById("validateBtn").addEventListener("click", sync);
        document.getElementById("loadDemoBtn").addEventListener("click", async () => {
          document.getElementById("title").value = "AI 工具如何让研发效率提升 3 倍";
          document.getElementById("author").value = "John";
          document.getElementById("platform").value = "douyin";
          document.getElementById("renderProfile").value = "standard";
          document.getElementById("scriptMode").value = "plain_text";
          document.getElementById("ownerToken").value = "john-ai-lab";
          document.getElementById("scriptText").value = "第一段：为什么高强度脑力工作者需要工作流级 AI。\\n\\n第二段：Atlas 如何帮你把内容生产拆成可执行步骤。\\n\\n第三段：为什么视频化表达能放大你的副业影响力。";
          await sync();
        });

        sync();
      </script>
    `,
  });
}

function renderDemoPage() {
  return renderZenPageShell({
    title: "SSE Demo Console",
    eyebrow: "Video-Ops / Progress Stream",
    navItems: pageNav("/demo"),
    extraStyles: sharedPageStyles,
    body: `
      <section class="hero">
        <article class="card">
          <p>保留之前的进度流验收页，用于验证任务状态推送。这里后续也可以接到真正的任务面板里。</p>
          <div class="actions">
            <button class="primary" id="run">Run Demo</button>
            <button class="secondary" id="complete">Complete</button>
            <button class="secondary" id="reset">Reset Log</button>
          </div>
          <div class="event-log" id="log"></div>
        </article>
        <aside class="card">
          <div class="hero-grid">
            <div class="stat"><b>UI</b><span>http://localhost:${port}/demo</span></div>
            <div class="stat"><b>SSE</b><span>/events?jobId=job-1</span></div>
            <div class="stat"><b>Demo Job</b><span>job-1</span></div>
            <div class="stat"><b>Status</b><span id="demoStatus">Disconnected</span></div>
          </div>
        </aside>
      </section>
      <script>
        const log = document.getElementById("log");
        const status = document.getElementById("demoStatus");
        const add = (text) => {
          const el = document.createElement("div");
          el.className = "event-item";
          el.textContent = text;
          log.prepend(el);
        };
        const es = new EventSource("/events?jobId=job-1");
        es.onopen = () => { status.textContent = "Connected"; add("connected"); };
        es.onerror = () => { status.textContent = "Disconnected"; };
        es.addEventListener("job-progress", (evt) => {
          const payload = JSON.parse(evt.data);
          add(payload.timestamp + " | " + payload.jobId + " | " + payload.state + " | " + payload.progress + "%");
        });
        document.getElementById("run").onclick = async () => {
          await fetch("/demo/run", { method: "POST" });
        };
        document.getElementById("complete").onclick = async () => {
          await fetch("/demo/complete", { method: "POST" });
        };
        document.getElementById("reset").onclick = () => { log.innerHTML = ""; };
      </script>
    `,
  });
}

function renderJobDashboardPage() {
  const list = buildJobListView(demoJobs);
  const detail = buildJobDetailView(demoJobs[0]);

  return renderZenPageShell({
    title: "Job Management Panel",
    eyebrow: "Video-Ops / Sprint 3 / JOH-33",
    navItems: pageNav("/jobs"),
    extraStyles: `
${sharedPageStyles}
      .jobs-layout { display: grid; gap: 18px; grid-template-columns: 0.95fr 1.05fr; margin-top: 20px; }
      .job-list { display: grid; gap: 12px; margin-top: 14px; }
      .job-row {
        border: 1px solid rgba(20, 33, 61, 0.08);
        background: rgba(255,255,255,0.62);
        border-radius: 18px;
        padding: 14px;
        cursor: pointer;
        transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
      }
      .job-row:hover { transform: translateY(-1px); box-shadow: 0 10px 30px rgba(20,33,61,.08); }
      .job-row.active { border-color: rgba(255,122,89,.42); box-shadow: 0 12px 32px rgba(255,122,89,.12); }
      .job-row-top, .job-meta, .detail-grid { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
      .job-row-top { justify-content: space-between; margin-bottom: 10px; }
      .job-title { font-family: "Avenir Next", "Trebuchet MS", sans-serif; font-weight: 800; }
      .badge {
        display: inline-flex;
        align-items: center;
        padding: 6px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: .04em;
        text-transform: uppercase;
      }
      .tone-queued { background: rgba(31, 122, 140, 0.12); color: #1f7a8c; }
      .tone-running { background: rgba(255, 184, 77, 0.18); color: #9c5b00; }
      .tone-success { background: rgba(47, 133, 90, 0.14); color: #2f855a; }
      .tone-error { background: rgba(255, 122, 89, 0.14); color: #b94825; }
      .tone-neutral { background: rgba(20, 33, 61, 0.08); color: #51606f; }
      .progress-bar {
        margin-top: 10px;
        height: 10px;
        background: rgba(20,33,61,.08);
        border-radius: 999px;
        overflow: hidden;
      }
      .progress-fill {
        height: 100%;
        border-radius: 999px;
        background: linear-gradient(90deg, #ff7a59, #1f7a8c);
      }
      .detail-card { display: grid; gap: 14px; }
      .detail-grid { margin-top: 6px; }
      .detail-kv {
        min-width: 160px;
        background: rgba(255,255,255,.58);
        border: 1px solid rgba(20,33,61,.08);
        border-radius: 16px;
        padding: 12px 14px;
      }
      .detail-kv b { display: block; margin-bottom: 6px; color: var(--accent-2); font-size: 12px; text-transform: uppercase; letter-spacing: .05em; }
      .detail-section { display: grid; gap: 10px; }
      .detail-list { display: grid; gap: 8px; }
      @media (max-width: 900px) { .jobs-layout { grid-template-columns: 1fr; } }
    `,
    body: `
      <section class="hero">
        <article class="card">
          <p>这里是 Video-Ops 的任务总控台。用户创建视频后，不再只能“等结果”，而是可以看到任务列表、状态分层、最近更新时间，以及每个任务当前卡在哪一步。</p>
          <div class="hero-grid">
            <div class="stat"><b>Total Jobs</b><span>${list.length}</span></div>
            <div class="stat"><b>Processing</b><span>${list.filter((item) => item.statusTone === "running").length}</span></div>
            <div class="stat"><b>Completed</b><span>${list.filter((item) => item.statusTone === "success").length}</span></div>
            <div class="stat"><b>Attention Needed</b><span>${list.filter((item) => item.statusTone === "error").length}</span></div>
          </div>
        </article>
        <aside class="card">
          <p>手动验收重点：</p>
          <div class="summary-list">
            <div class="summary-item">1. 左侧可以看到多个任务，状态颜色有明显区分。</div>
            <div class="summary-item">2. 点击不同任务后，右侧详情会切换。</div>
            <div class="summary-item">3. 详情区能看到进度、步骤、checkpoint、错误和输出摘要。</div>
          </div>
        </aside>
      </section>

      <section class="jobs-layout">
        <section class="card">
          <p>Task List</p>
          <div class="job-list" id="jobList"></div>
        </section>
        <aside class="card detail-card">
          <p><span id="detailStatus" class="ok">Selected Job</span></p>
          <div class="detail-grid" id="detailGrid"></div>
          <div class="detail-section">
            <div class="summary-item">
              <b style="display:block;margin-bottom:8px">Checkpoint</b>
              <pre id="checkpointSummary"></pre>
            </div>
            <div class="summary-item">
              <b style="display:block;margin-bottom:8px">Errors</b>
              <div class="detail-list" id="errorSummary"></div>
            </div>
            <div class="summary-item">
              <b style="display:block;margin-bottom:8px">Outputs</b>
              <div class="detail-list" id="outputsSummary"></div>
            </div>
          </div>
        </aside>
      </section>

      <script>
        const jobs = ${JSON.stringify(list)};
        const initialDetail = ${JSON.stringify(detail)};

        async function fetchDetail(jobId) {
          const response = await fetch("/api/jobs/" + jobId);
          return response.json();
        }

        function toneClass(tone) {
          return "tone-" + tone;
        }

        function renderList(selectedId) {
          const root = document.getElementById("jobList");
          root.innerHTML = "";
          jobs.forEach((job) => {
            const row = document.createElement("button");
            row.type = "button";
            row.className = "job-row" + (job.id === selectedId ? " active" : "");
            row.innerHTML = [
              '<div class="job-row-top">',
              '  <span class="job-title">' + job.title + '</span>',
              '  <span class="badge ' + toneClass(job.statusTone) + '">' + job.state + '</span>',
              '</div>',
              '<div class="job-meta">' +
                '<span>' + job.platform + '</span>' +
                '<span>•</span>' +
                '<span>' + job.renderProfile + '</span>' +
                '<span>•</span>' +
                '<span>' + job.updatedLabel + '</span>' +
              '</div>',
              '<div class="progress-bar"><div class="progress-fill" style="width:' + job.progressLabel + ';"></div></div>',
              '<div class="hint" style="margin-top:8px">Progress ' + job.progressLabel + '</div>'
            ].join("");
            row.addEventListener("click", async () => {
              const detail = await fetchDetail(job.id);
              renderDetail(detail);
              renderList(job.id);
            });
            root.appendChild(row);
          });
        }

        function renderDetail(detail) {
          document.getElementById("detailStatus").textContent = detail.state + " • " + detail.currentStep;
          document.getElementById("detailStatus").className =
            detail.state === "COMPLETED" ? "ok" : (detail.state === "FAILED" || detail.state === "INTERRUPTED" ? "warn" : "ok");

          const grid = document.getElementById("detailGrid");
          const items = [
            ["Title", detail.title],
            ["Platform", detail.platform],
            ["Profile", detail.renderProfile],
            ["Progress", detail.progress + "%"],
            ["Updated", detail.updatedLabel],
            ["Created", detail.createdLabel],
          ];
          grid.innerHTML = items.map(([k, v]) =>
            '<div class="detail-kv"><b>' + k + '</b><span>' + v + '</span></div>'
          ).join("");

          document.getElementById("checkpointSummary").textContent = detail.checkpointSummary;
          document.getElementById("errorSummary").innerHTML = detail.errorSummary
            .map((item) => '<div class="summary-item">' + item + '</div>')
            .join("");
          document.getElementById("outputsSummary").innerHTML = detail.outputsSummary
            .map((item) => '<div class="summary-item">' + item + '</div>')
            .join("");
        }

        renderList(initialDetail.id);
        renderDetail(initialDetail);
      </script>
    `,
  });
}

function renderStoryboardPage() {
  const initialPreview = buildStoryboardPreview({
    scenes: storyboardScenes,
    controls: {
      textMode: "original",
      subtitleStyle: SUBTITLE_STYLES[0],
      transitionStyle: TRANSITION_STYLES[1],
    },
  });

  return renderZenPageShell({
    title: "Storyboard Preview",
    eyebrow: "Video-Ops / Sprint 3 / JOH-34",
    navItems: pageNav("/storyboard"),
    extraStyles: `
${sharedPageStyles}
      .story-layout { display: grid; gap: 18px; grid-template-columns: 0.9fr 1.1fr; margin-top: 20px; }
      .control-stack, .story-grid { display: grid; gap: 12px; margin-top: 14px; }
      .story-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .scene-card {
        border-radius: 18px;
        border: 1px solid rgba(20, 33, 61, 0.08);
        background: rgba(255,255,255,0.62);
        padding: 16px;
        display: grid;
        gap: 10px;
      }
      .scene-card h3 { margin: 0; font-size: 18px; }
      .scene-note { color: var(--muted); font-size: 14px; }
      .caption-preview {
        border-radius: 16px;
        padding: 12px 14px;
        font-family: "Avenir Next", "Trebuchet MS", sans-serif;
      }
      .subtitle-minimal { background: rgba(20,33,61,.08); color: var(--ink); }
      .subtitle-bold { background: rgba(255,184,77,.18); color: #7a4700; font-weight: 800; }
      .subtitle-caption-card { background: linear-gradient(135deg, rgba(255,122,89,.2), rgba(31,122,140,.16)); color: #173042; box-shadow: inset 0 0 0 1px rgba(20,33,61,.08); }
      .chip-row { display: flex; gap: 8px; flex-wrap: wrap; }
      .chip {
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(20,33,61,.08);
        font-size: 12px;
        font-weight: 700;
      }
      @media (max-width: 900px) {
        .story-layout, .story-grid { grid-template-columns: 1fr; }
      }
    `,
    body: `
      <section class="hero">
        <article class="card">
          <p>这里是生成前的最后一次人工把关。你可以调整文字表现、字幕样式和转场风格，先看 Storyboard 感觉，再决定是否继续执行渲染。</p>
          <div class="hero-grid">
            <div class="stat"><b>Total Scenes</b><span>${initialPreview.summary.totalScenes}</span></div>
            <div class="stat"><b>Text Mode</b><span id="summaryTextMode">${initialPreview.summary.textMode}</span></div>
            <div class="stat"><b>Subtitle Style</b><span id="summarySubtitle">${initialPreview.summary.subtitleStyle}</span></div>
            <div class="stat"><b>Transition</b><span id="summaryTransition">${initialPreview.summary.transitionStyle}</span></div>
          </div>
        </article>
        <aside class="card">
          <p>手动验收重点：</p>
          <div class="summary-list">
            <div class="summary-item">1. 左侧三个参数都可以切换。</div>
            <div class="summary-item">2. 右侧 Scene 卡片会实时变化，不需要刷新页面。</div>
            <div class="summary-item">3. 每个 Scene 都能看到 narration、视觉提示、时长和转场信息。</div>
          </div>
        </aside>
      </section>

      <section class="story-layout">
        <section class="card">
          <p>Preview Controls</p>
          <div class="control-stack">
            <div class="field">
              <label for="textMode">文字模式 Text Mode</label>
              <select id="textMode">
                <option value="original">original</option>
                <option value="shorten">shorten</option>
                <option value="headline">headline</option>
              </select>
            </div>
            <div class="field">
              <label for="subtitleStyle">字幕样式 Subtitle Style</label>
              <select id="subtitleStyle">
                ${SUBTITLE_STYLES.map((style) => `<option value="${style}">${style}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="transitionStyle">转场风格 Transition Style</label>
              <select id="transitionStyle">
                ${TRANSITION_STYLES.map((style) => `<option value="${style}"${style === "crossfade" ? " selected" : ""}>${style}</option>`).join("")}
              </select>
            </div>
          </div>
        </section>

        <aside class="card">
          <p>Scene Preview</p>
          <div class="story-grid" id="storyGrid"></div>
        </aside>
      </section>

      <script>
        const scenes = ${JSON.stringify(storyboardScenes)};

        function subtitleClass(style) {
          return "subtitle-" + style.replace(/_/g, "-");
        }

        function renderPreview(preview) {
          document.getElementById("summaryTextMode").textContent = preview.summary.textMode;
          document.getElementById("summarySubtitle").textContent = preview.summary.subtitleStyle;
          document.getElementById("summaryTransition").textContent = preview.summary.transitionStyle;

          document.getElementById("storyGrid").innerHTML = preview.cards.map((card) => [
            '<article class="scene-card">',
            '  <h3>' + card.title + '</h3>',
            '  <div class="chip-row">',
            '    <span class="chip">' + card.durationLabel + '</span>',
            '    <span class="chip">' + card.transition + '</span>',
            '    <span class="chip">' + card.subtitleStyle + '</span>',
            '  </div>',
            '  <div class="caption-preview ' + subtitleClass(card.subtitleStyle) + '">' + card.previewCaption + '</div>',
            '  <div><b>Narration</b><p class="scene-note">' + card.narration + '</p></div>',
            '  <div><b>Visual Hint</b><p class="scene-note">' + card.visualHint + '</p></div>',
            '</article>'
          ].join("")).join("");
        }

        async function syncPreview() {
          const payload = {
            scenes,
            controls: {
              textMode: document.getElementById("textMode").value,
              subtitleStyle: document.getElementById("subtitleStyle").value,
              transitionStyle: document.getElementById("transitionStyle").value,
            },
          };

          const response = await fetch("/api/storyboard/preview", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });
          const result = await response.json();
          renderPreview(result);
        }

        ["textMode", "subtitleStyle", "transitionStyle"].forEach((id) => {
          document.getElementById(id).addEventListener("change", syncPreview);
        });

        renderPreview(${JSON.stringify(initialPreview)});
      </script>
    `,
  });
}

function buildDemoComplianceReport() {
  return buildComplianceReport({
    job: {
      id: demoJobs[2].id,
      title: demoJobs[2].title,
      state: demoJobs[2].state,
      platform: demoJobs[2].platform,
      renderProfile: demoJobs[2].renderProfile,
      updatedAt: demoJobs[2].updatedAt,
    },
    compliance: {
      allowed: false,
      violations: [
        {
          type: "keyword",
          rule: "违禁词",
          excerpt: "脚本片段中包含违禁词提示",
        },
      ],
    },
    errors: demoJobs[2].errors,
    outputs: demoJobs[2].outputs,
  });
}

function renderComplianceReportPage() {
  const report = buildDemoComplianceReport();

  return renderZenPageShell({
    title: "Compliance Report Export",
    eyebrow: "Video-Ops / Sprint 3 / JOH-36",
    navItems: pageNav("/compliance-report"),
    extraStyles: `
${sharedPageStyles}
      .report-layout { display: grid; gap: 18px; grid-template-columns: 0.95fr 1.05fr; margin-top: 20px; }
      .report-list { display: grid; gap: 10px; margin-top: 14px; }
      @media (max-width: 900px) { .report-layout { grid-template-columns: 1fr; } }
    `,
    body: `
      <section class="hero">
        <article class="card">
          <p>合规报告页把任务状态、合规检查、错误摘要和产物信息打包成最终可交付物，支持 JSON 和 PDF 两种格式导出。</p>
          <div class="hero-grid">
            <div class="stat"><b>Job</b><span>${report.job.id}</span></div>
            <div class="stat"><b>Allowed</b><span>${report.compliance.allowed ? "YES" : "NO"}</span></div>
            <div class="stat"><b>Violations</b><span>${report.compliance.violationCount}</span></div>
            <div class="stat"><b>Outputs</b><span>${report.outputs.length}</span></div>
          </div>
        </article>
        <aside class="card">
          <p>手动验收重点：</p>
          <div class="summary-list">
            <div class="summary-item">1. 页面能看到任务、合规、错误和输出摘要。</div>
            <div class="summary-item">2. Download JSON 和 Download PDF 两个入口都可用。</div>
            <div class="summary-item">3. 缺字段时也能生成可读报告。</div>
          </div>
        </aside>
      </section>

      <section class="report-layout">
        <section class="card">
          <p>Report Summary</p>
          <div class="report-list">
            <div class="summary-item">Job Title: ${report.job.title}</div>
            <div class="summary-item">State: ${report.job.state}</div>
            <div class="summary-item">Platform: ${report.job.platform}</div>
            <div class="summary-item">Render Profile: ${report.job.renderProfile}</div>
            <div class="summary-item">Updated At: ${report.job.updatedAt}</div>
          </div>
          <div class="actions">
            <button class="primary" id="downloadJson">Download JSON</button>
            <button class="secondary" id="downloadPdf">Download PDF</button>
          </div>
        </section>

        <aside class="card">
          <div class="summary-item">
            <b style="display:block;margin-bottom:8px">Violations</b>
            <div class="report-list">
              ${report.compliance.violations.map((item) => `<div class="summary-item">${item.rule}: ${item.excerpt}</div>`).join("")}
            </div>
          </div>
          <div class="summary-item" style="margin-top:14px">
            <b style="display:block;margin-bottom:8px">Errors</b>
            <div class="report-list">
              ${report.errors.map((item) => `<div class="summary-item">${item.stepName}: ${item.errorMessage} (retry ${item.retryCount})</div>`).join("")}
            </div>
          </div>
          <div class="summary-item" style="margin-top:14px">
            <b style="display:block;margin-bottom:8px">Outputs</b>
            <div class="report-list">
              ${report.outputs.map((item) => `<div class="summary-item">${item.kind}: ${item.path}</div>`).join("")}
            </div>
          </div>
        </aside>
      </section>

      <script>
        async function triggerDownload(path, filename) {
          const response = await fetch(path);
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = filename;
          link.click();
          URL.revokeObjectURL(url);
        }

        document.getElementById("downloadJson").addEventListener("click", async () => {
          await triggerDownload("/api/compliance-report.json", "compliance-report.json");
        });

        document.getElementById("downloadPdf").addEventListener("click", async () => {
          await triggerDownload("/api/compliance-report.pdf", "compliance-report.pdf");
        });
      </script>
    `,
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) {
    return {};
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function pushDemoSequence(sequence) {
  for (const item of sequence) {
    channel.emit(
      createJobProgressPayload({
        jobId: "job-1",
        state: item.state,
        progress: item.progress,
        step: item.step,
        message: item.message,
        meta: item.meta,
        timestamp: new Date().toISOString(),
      }),
    );
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(renderWizardPage());
    return;
  }

  if (req.method === "GET" && url.pathname === "/demo") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(renderDemoPage());
    return;
  }

  if (req.method === "GET" && url.pathname === "/jobs") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(renderJobDashboardPage());
    return;
  }

  if (req.method === "GET" && url.pathname === "/storyboard") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(renderStoryboardPage());
    return;
  }

  if (req.method === "GET" && url.pathname === "/compliance-report") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(renderComplianceReportPage());
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/wizard/validate") {
    try {
      const payload = await readJsonBody(req);
      const validation = validateWizardConfig(payload);
      if (!validation.valid) {
        sendJson(res, 200, { valid: false, errors: validation.errors });
        return;
      }
      const draft = normalizeWizardConfig(payload);
      const summary = summarizeWizardConfig(draft);
      sendJson(res, 200, { valid: true, errors: [], draft, summary });
    } catch (error) {
      sendJson(res, 400, {
        valid: false,
        errors: [error instanceof Error ? error.message : "Invalid request body."],
      });
    }
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/api/jobs/")) {
    const jobId = url.pathname.replace("/api/jobs/", "");
    const record = demoJobs.find((job) => job.id === jobId);
    if (!record) {
      sendJson(res, 404, { ok: false, error: "Job not found" });
      return;
    }
    sendJson(res, 200, buildJobDetailView(record));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/storyboard/preview") {
    try {
      const payload = await readJsonBody(req);
      sendJson(res, 200, buildStoryboardPreview(payload));
    } catch (error) {
      sendJson(res, 400, {
        ok: false,
        error: error instanceof Error ? error.message : "Invalid storyboard payload",
      });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/compliance-report.json") {
    const report = buildDemoComplianceReport();
    res.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="compliance-report.json"',
    });
    res.end(exportComplianceReportJson(report));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/compliance-report.pdf") {
    try {
      const report = buildDemoComplianceReport();
      const pdf = exportComplianceReportPdf(report);
      res.writeHead(200, {
        "content-type": "application/pdf",
        "content-disposition": 'attachment; filename="compliance-report.pdf"',
      });
      res.end(pdf);
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "PDF export failed",
      });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/events") {
    const jobId = url.searchParams.get("jobId") ?? undefined;
    const { stream, close } = createJobProgressStream(channel, jobId);
    res.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    });

    req.on("close", close);
    const reader = stream.getReader();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) res.write(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
      res.end();
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/demo/run") {
    pushDemoSequence([
      { state: "PARSING", progress: 10, step: "parse", message: "Parsing manifest" },
      { state: "AI_PROCESSING", progress: 35, step: "prompt", message: "Generating assets" },
      { state: "ASSEMBLING", progress: 60, step: "timeline", message: "Building timeline" },
    ]);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/demo/complete") {
    pushDemoSequence([
      { state: "RENDERING", progress: 85, step: "ffmpeg", message: "Rendering video" },
      { state: "POST_PROCESSING", progress: 95, step: "verify", message: "Verifying artifacts" },
      { state: "COMPLETED", progress: 100, step: "done", message: "Completed" },
    ]);
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 404, { ok: false, error: "Not found" });
});

server.listen(port, () => {
  console.log(`video-ops UI ready at http://localhost:${port}`);
});

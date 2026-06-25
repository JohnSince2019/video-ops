import http from "node:http";
import { URL } from "node:url";

import {
  JobProgressChannel,
  createJobProgressStream,
  createJobProgressPayload,
  toServerSentEvent,
} from "./lib/progress/job-progress.ts";

const port = Number(process.env.PORT ?? 3001);
const channel = new JobProgressChannel();

const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>video-ops · JOH-24 验收页</title>
  <style>
    body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: linear-gradient(135deg, #07111f, #13213a 48%, #0b1f1d); color: #eef2ff; }
    .wrap { max-width: 1040px; margin: 0 auto; padding: 48px 20px 72px; }
    .hero { display: grid; gap: 18px; grid-template-columns: 1.4fr .9fr; align-items: start; }
    .card { background: rgba(10, 18, 34, .78); border: 1px solid rgba(148, 163, 184, .18); border-radius: 18px; padding: 20px; box-shadow: 0 16px 60px rgba(0,0,0,.28); backdrop-filter: blur(14px); }
    h1 { margin: 0 0 8px; font-size: 40px; line-height: 1.05; }
    p { margin: 0; color: #cbd5e1; line-height: 1.6; }
    .grid { display: grid; gap: 14px; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 18px; }
    .stat { padding: 14px; border-radius: 14px; background: rgba(15, 23, 42, .66); }
    .stat b { display: block; font-size: 13px; color: #94a3b8; margin-bottom: 6px; }
    .stat span { font-size: 18px; font-weight: 700; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
    button { border: 0; border-radius: 999px; padding: 11px 16px; font-weight: 700; cursor: pointer; color: #08111e; background: #7dd3fc; }
    button.alt { background: #a7f3d0; }
    button.ghost { background: rgba(148,163,184,.16); color: #e2e8f0; border: 1px solid rgba(148,163,184,.24); }
    .log { margin-top: 18px; display: grid; gap: 10px; }
    .line { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; padding: 12px 14px; border-radius: 12px; background: rgba(15, 23, 42, .72); color: #dbeafe; word-break: break-word; }
    .muted { color: #94a3b8; font-size: 13px; }
    @media (max-width: 820px) { .hero { grid-template-columns: 1fr; } h1 { font-size: 32px; } }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hero">
      <section class="card">
        <h1>JOH-24 手动验收页</h1>
        <p>这页用于验证任务进度 SSE 推送。打开后点击按钮，就能看到单任务进度实时流动。</p>
        <div class="toolbar">
          <button id="run">Run Demo</button>
          <button class="alt" id="complete">Complete</button>
          <button class="ghost" id="reset">Reset Log</button>
        </div>
        <div class="log" id="log"></div>
      </section>
      <aside class="card">
        <div class="grid">
          <div class="stat"><b>UI 地址</b><span>http://localhost:${port}</span></div>
          <div class="stat"><b>SSE 地址</b><span>/events?jobId=job-1</span></div>
          <div class="stat"><b>演示任务</b><span>job-1</span></div>
          <div class="stat"><b>状态</b><span id="status">Disconnected</span></div>
        </div>
        <p class="muted" style="margin-top:14px">可用于手动验收：连接后，点击 Run Demo 观察 PARSING → AI_PROCESSING → ASSEMBLING → RENDERING → POST_PROCESSING → COMPLETED。</p>
      </aside>
    </div>
  </div>
  <script>
    const log = document.getElementById("log");
    const status = document.getElementById("status");
    const add = (text) => {
      const el = document.createElement("div");
      el.className = "line";
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
</body>
</html>`;

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function pushDemoSequence(sequence) {
  for (const item of sequence) {
    channel.emit(createJobProgressPayload({
      jobId: "job-1",
      state: item.state,
      progress: item.progress,
      step: item.step,
      message: item.message,
      meta: item.meta,
      timestamp: new Date().toISOString(),
    }));
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
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
    const encoder = new TextEncoder();

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

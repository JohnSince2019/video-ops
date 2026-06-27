export const zenShellStyles = `
  :root {
    --bg: #f5f7fb;
    --panel: #ffffff;
    --panel-soft: #f7f8fc;
    --border: #e6eaf2;
    --ink: #1b2440;
    --muted: #7d879c;
    --primary: #7667ff;
    --primary-soft: rgba(118, 103, 255, 0.12);
    --accent: #16a34a;
    --warn: #f59e0b;
    --danger: #ef4444;
    --shadow: 0 14px 32px rgba(15, 23, 42, 0.05);
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    margin: 0;
    color: var(--ink);
    background: var(--bg);
    font-family: "Inter", "Avenir Next", "SF Pro Display", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  }
  a { color: inherit; }
  p {
    margin: 0;
    line-height: 1.65;
    color: var(--muted);
  }
  h1, h2, h3, h4, button, .nav-link, label {
    font-family: "Inter", "Avenir Next", "SF Pro Display", "PingFang SC", sans-serif;
  }
  .app-shell {
    display: flex;
    min-height: 100vh;
  }
  .sidebar {
    width: 188px;
    flex: 0 0 188px;
    border-right: 1px solid var(--border);
    background: var(--panel);
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  .sidebar-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 64px;
    padding: 0 16px;
    border-bottom: 1px solid var(--border);
  }
  .brand-mark {
    width: 28px;
    height: 28px;
    border-radius: 9px;
    display: grid;
    place-items: center;
    background: linear-gradient(135deg, #7c6bff, #5a45ff);
    color: white;
    font-size: 14px;
    font-weight: 800;
    box-shadow: 0 8px 18px rgba(111, 92, 255, 0.22);
  }
  .brand-copy {
    display: grid;
    gap: 3px;
  }
  .brand-title {
    font-size: 17px;
    font-weight: 800;
    color: var(--ink);
    letter-spacing: -0.02em;
  }
  .brand-subtitle {
    font-size: 10px;
    color: var(--muted);
  }
  .sidebar-nav {
    flex: 1;
    display: grid;
    gap: 6px;
    padding: 12px 10px;
    align-content: start;
    grid-auto-rows: max-content;
  }
  .nav-link {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 12px;
    border-radius: 12px;
    text-decoration: none;
    color: var(--muted);
    font-size: 14px;
    font-weight: 600;
    transition: background .18s ease, color .18s ease, transform .18s ease;
    min-height: 42px;
  }
  .nav-link:hover {
    background: var(--panel-soft);
    color: var(--ink);
    transform: translateX(1px);
  }
  .nav-link.active {
    background: var(--primary-soft);
    color: var(--primary);
    box-shadow: inset 0 0 0 1px rgba(118, 103, 255, 0.08);
  }
  .nav-dot {
    width: 18px;
    height: 18px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    color: currentColor;
    opacity: .76;
  }
  .nav-link.active .nav-dot {
    opacity: 1;
  }
  .nav-dot svg {
    width: 18px;
    height: 18px;
    stroke: currentColor;
    stroke-width: 1.8;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .sidebar-footer {
    padding: 10px 10px 16px;
    border-top: 1px solid var(--border);
  }
  .footer-card {
    border-radius: 14px;
    background: linear-gradient(180deg, #f5f2ff, #f0f4ff);
    border: 1px solid #e7defe;
    padding: 12px;
  }
  .footer-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--muted);
  }
  .footer-value {
    margin-top: 8px;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }
  .footer-value strong {
    font-size: 28px;
    line-height: 1;
    letter-spacing: -0.04em;
    color: var(--primary);
  }
  .footer-value span {
    font-size: 11px;
    font-weight: 700;
    color: var(--muted);
  }
  .content-shell {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .topbar {
    height: 64px;
    padding: 0 24px;
    border-bottom: 1px solid var(--border);
    background: rgba(255,255,255,0.92);
    backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .header-copy {
    display: grid;
    gap: 4px;
    min-width: 0;
  }
  .eyebrow {
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-weight: 700;
    color: var(--muted);
  }
  h1 {
    margin: 0;
    font-size: 15px;
    line-height: 1.1;
    letter-spacing: -0.02em;
    color: var(--ink);
  }
  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 0 0 auto;
  }
  .header-icon {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--panel);
    display: grid;
    place-items: center;
    color: var(--muted);
    font-size: 12px;
    font-weight: 700;
  }
  .header-user {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-left: 12px;
    border-left: 1px solid var(--border);
  }
  .user-badge {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    background: linear-gradient(135deg, rgba(111,92,255,.12), rgba(111,92,255,.22));
    color: var(--primary);
    display: grid;
    place-items: center;
    font-size: 13px;
    font-weight: 800;
  }
  .user-copy {
    display: grid;
    gap: 2px;
  }
  .user-copy strong {
    font-size: 14px;
    color: var(--ink);
  }
  .user-copy span {
    font-size: 11px;
    color: var(--muted);
  }
  .page-content {
    flex: 1;
    overflow-y: auto;
    padding: 0;
  }
  .page-wrap {
    width: 100%;
  }
  .card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 18px;
    box-shadow: var(--shadow);
  }
  .summary-list, .error-list, .event-log {
    display: grid;
    gap: 10px;
    margin-top: 14px;
  }
  .summary-item, .error-item, .event-item {
    padding: 12px 14px;
    border-radius: 16px;
    background: var(--panel-soft);
    border: 1px solid var(--border);
  }
  .error-item {
    background: rgba(239, 68, 68, 0.08);
    color: #b42318;
    border-color: rgba(239, 68, 68, 0.16);
  }
  .ok { color: #15803d; font-weight: 700; }
  .warn { color: var(--warn); font-weight: 700; }
  .empty { color: var(--muted); font-style: italic; }
  @media (max-width: 1024px) {
    .sidebar {
      width: 88px;
      flex-basis: 88px;
    }
    .brand-copy, .nav-link span, .sidebar-footer {
      display: none;
    }
    .sidebar-brand {
      justify-content: center;
      padding: 0;
    }
    .nav-link {
      justify-content: center;
      padding: 12px;
    }
    .nav-dot {
      width: 10px;
      height: 10px;
    }
  }
  @media (max-width: 820px) {
    .app-shell {
      flex-direction: column;
    }
    .sidebar {
      width: 100%;
      min-height: auto;
      border-right: 0;
      border-bottom: 1px solid var(--border);
    }
    .sidebar-nav {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .brand-copy, .sidebar-footer, .nav-link span {
      display: block;
    }
    .nav-link {
      justify-content: flex-start;
    }
  }
  @media (max-width: 640px) {
    .topbar {
      padding: 0 16px;
    }
    .page-content {
      padding: 0;
    }
    h1 {
      font-size: 18px;
    }
    .header-user {
      display: none;
    }
    .sidebar-nav {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
`;

export type ZenNavItem = {
  href: string;
  label: string;
  icon?: string;
  active?: boolean;
};

export function renderZenNav(items: ZenNavItem[]) {
  return items
    .map(
      (item) =>
        `<a class="nav-link${item.active ? " active" : ""}" href="${item.href}"><span class="nav-dot">${item.icon ?? ""}</span><span>${item.label}</span></a>`,
    )
    .join("");
}

export function renderZenPageShell(input: {
  title: string;
  eyebrow: string;
  navItems: ZenNavItem[];
  extraStyles?: string;
  body: string;
}) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${input.title}</title>
  <style>${zenShellStyles}${input.extraStyles ?? ""}</style>
</head>
<body>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="brand-mark">V</div>
        <div class="brand-copy">
          <div class="brand-title">VideoOps</div>
          <div class="brand-subtitle">AI 视频生产系统</div>
        </div>
      </div>
      <nav class="sidebar-nav">
        ${renderZenNav(input.navItems)}
      </nav>
      <div class="sidebar-footer">
        <div class="footer-card">
          <div class="footer-label">渲染健康度</div>
          <div class="footer-value">
            <strong>68%</strong>
            <span>进行中</span>
          </div>
        </div>
      </div>
    </aside>
    <div class="content-shell">
      <header class="topbar">
        <div class="header-copy">
          <span class="eyebrow">${input.eyebrow}</span>
          <h1>${input.title}</h1>
        </div>
        <div class="header-actions">
          <div class="header-icon">S</div>
          <div class="header-icon">N</div>
          <div class="header-user">
            <div class="user-badge">J</div>
            <div class="user-copy">
              <strong>John</strong>
              <span>视频创作者</span>
            </div>
          </div>
        </div>
      </header>
      <main class="page-content">
        <div class="page-wrap">
          ${input.body}
        </div>
      </main>
    </div>
  </div>
</body>
</html>`;
}

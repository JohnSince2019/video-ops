export const zenShellStyles = `
  :root {
    --bg-1: #f4efe4;
    --bg-2: #d6e4db;
    --ink: #14213d;
    --muted: #51606f;
    --card: rgba(255, 250, 242, 0.84);
    --line: rgba(20, 33, 61, 0.12);
    --accent: #ff7a59;
    --accent-2: #1f7a8c;
    --ok: #2f855a;
    --warn: #c05621;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    color: var(--ink);
    background:
      radial-gradient(circle at top left, rgba(255, 122, 89, 0.18), transparent 28%),
      radial-gradient(circle at top right, rgba(31, 122, 140, 0.18), transparent 24%),
      linear-gradient(135deg, var(--bg-1), var(--bg-2));
    font-family: Georgia, "Times New Roman", serif;
  }
  .wrap { max-width: 1180px; margin: 0 auto; padding: 28px 18px 60px; }
  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
  }
  .brand { display: grid; gap: 4px; }
  .eyebrow {
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-size: 12px;
    color: var(--accent-2);
    font-weight: 700;
  }
  h1, h2, h3, h4, button, .pill, label { font-family: "Avenir Next", "Trebuchet MS", sans-serif; }
  h1 { margin: 0; font-size: 42px; line-height: 1.02; }
  p { margin: 0; line-height: 1.65; color: var(--muted); }
  .nav { display: flex; gap: 10px; flex-wrap: wrap; }
  .pill {
    padding: 10px 14px;
    border-radius: 999px;
    border: 1px solid var(--line);
    color: var(--ink);
    text-decoration: none;
    background: rgba(255,255,255,0.48);
    font-size: 14px;
    font-weight: 700;
  }
  .pill.active {
    background: var(--ink);
    color: #fff8ef;
    border-color: transparent;
  }
  .hero {
    display: grid;
    gap: 18px;
    grid-template-columns: 1.18fr 0.82fr;
    align-items: start;
  }
  .card {
    background: var(--card);
    border: 1px solid var(--line);
    border-radius: 24px;
    padding: 22px;
    box-shadow: 0 18px 60px rgba(20, 33, 61, 0.08);
    backdrop-filter: blur(14px);
  }
  .hero-grid {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-top: 18px;
  }
  .stat {
    background: rgba(255,255,255,0.58);
    border-radius: 18px;
    padding: 14px;
    border: 1px solid rgba(20, 33, 61, 0.08);
  }
  .stat b {
    display: block;
    margin-bottom: 6px;
    font-size: 12px;
    color: var(--accent-2);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .stat span { font-size: 18px; font-weight: 700; }
  .summary-list, .error-list, .event-log {
    display: grid;
    gap: 10px;
    margin-top: 14px;
  }
  .summary-item, .error-item, .event-item {
    padding: 12px 14px;
    border-radius: 16px;
    background: rgba(255,255,255,0.62);
    border: 1px solid rgba(20, 33, 61, 0.08);
  }
  .error-item {
    background: rgba(255, 122, 89, 0.12);
    color: #8a2d13;
  }
  .ok { color: var(--ok); font-weight: 700; }
  .warn { color: var(--warn); font-weight: 700; }
  .empty {
    color: var(--muted);
    font-style: italic;
  }
  @media (max-width: 900px) {
    .hero { grid-template-columns: 1fr; }
    h1 { font-size: 34px; }
  }
  @media (max-width: 640px) {
    .hero-grid { grid-template-columns: 1fr; }
    .wrap { padding: 20px 14px 42px; }
  }
`;

export type ZenNavItem = {
  href: string;
  label: string;
  active?: boolean;
};

export function renderZenNav(items: ZenNavItem[]) {
  return items
    .map(
      (item) =>
        `<a class="pill${item.active ? " active" : ""}" href="${item.href}">${item.label}</a>`,
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
  <div class="wrap">
    <header class="topbar">
      <div class="brand">
        <span class="eyebrow">${input.eyebrow}</span>
        <h1>${input.title}</h1>
      </div>
      <nav class="nav">
        ${renderZenNav(input.navItems)}
      </nav>
    </header>
    ${input.body}
  </div>
</body>
</html>`;
}

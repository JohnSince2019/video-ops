import assert from "node:assert/strict";
import test from "node:test";

import { renderZenNav, renderZenPageShell, zenShellStyles } from "../lib/ui/zen-shell.js";

test("shared shell renderer outputs title and navigation structure", () => {
  const html = renderZenPageShell({
    title: "Wizard",
    eyebrow: "Video-Ops / Sprint 3",
    navItems: [
      { href: "/", label: "Wizard", active: true },
      { href: "/jobs", label: "Jobs" },
    ],
    body: "<main>content</main>",
  });

  assert.match(html, /<h1>Wizard<\/h1>/);
  assert.match(html, /href=\"\/jobs\"/);
  assert.match(html, /<main>content<\/main>/);
});

test("shared style tokens include key shell classes and design variables", () => {
  assert.match(zenShellStyles, /--primary: #7667ff/);
  assert.match(zenShellStyles, /\.topbar/);
  assert.match(zenShellStyles, /\.card/);
  assert.match(zenShellStyles, /\.nav-link\.active/);
});

test("navigation helper marks active links consistently", () => {
  const nav = renderZenNav([
    { href: "/", label: "Wizard", active: true },
    { href: "/jobs", label: "Jobs" },
  ]);

  assert.match(nav, /class="nav-link active"/);
  assert.match(nav, /Jobs/);
});

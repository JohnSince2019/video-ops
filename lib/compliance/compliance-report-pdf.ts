import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import type { ComplianceReport } from "./compliance-report.js";

function resolvePythonExecutable() {
  return (
    process.env.VIDEO_OPS_PDF_PYTHON ??
    "/Users/john/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3"
  );
}

export function exportComplianceReportPdf(report: ComplianceReport) {
  const workdir = mkdtempSync(join(tmpdir(), "video-ops-compliance-report-"));
  const inputPath = join(workdir, "report.json");
  const outputPath = join(workdir, "report.pdf");
  const scriptPath = fileURLToPath(new URL("../../scripts/render-compliance-report-pdf.py", import.meta.url));

  try {
    writeFileSync(inputPath, JSON.stringify(report, null, 2), "utf8");

    const result = spawnSync(resolvePythonExecutable(), [scriptPath, inputPath, outputPath], {
      encoding: "utf8",
    });

    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout || "PDF export failed.");
    }

    const pdf = readFileSync(outputPath);
    if (pdf.byteLength === 0) {
      throw new Error("PDF export produced an empty file.");
    }

    return pdf;
  } finally {
    rmSync(workdir, { recursive: true, force: true });
  }
}

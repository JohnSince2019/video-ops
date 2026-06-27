import assert from "node:assert/strict";
import test from "node:test";

import { buildComplianceReport } from "../lib/compliance/compliance-report.js";
import { exportComplianceReportPdf } from "../lib/compliance/compliance-report-pdf.js";

test("pdf export produces a non-empty file payload", () => {
  const report = buildComplianceReport({
    job: {
      id: "job-pdf-001",
      title: "PDF Export Demo",
      state: "COMPLETED",
      platform: "douyin",
      renderProfile: "standard",
      updatedAt: "2026-06-27T04:10:00.000Z",
    },
    outputs: [{ kind: "video", path: "output/demo.mp4" }],
  });

  const pdf = exportComplianceReportPdf(report);

  assert.equal(Buffer.isBuffer(pdf), true);
  assert.equal(pdf.byteLength > 100, true);
  assert.equal(pdf.subarray(0, 4).toString("utf8"), "%PDF");
});

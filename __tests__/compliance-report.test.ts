import assert from "node:assert/strict";
import test from "node:test";

import { buildComplianceReport, exportComplianceReportJson } from "../lib/compliance/compliance-report.js";

test("report builder merges job, compliance, error, and output information", () => {
  const report = buildComplianceReport({
    job: {
      id: "job-001",
      title: "AI 视频任务",
      state: "FAILED",
      platform: "douyin",
      renderProfile: "standard",
      updatedAt: "2026-06-27T03:30:00.000Z",
    },
    compliance: {
      allowed: false,
      violations: [{ type: "keyword", rule: "违禁词", excerpt: "包含违禁词" }],
    },
    errors: [{ stepName: "tts_generation", errorMessage: "timeout", retryCount: 3 }],
    outputs: [{ kind: "cover", path: "output/cover.png" }],
  });

  assert.equal(report.job.id, "job-001");
  assert.equal(report.compliance.allowed, false);
  assert.equal(report.compliance.violationCount, 1);
  assert.equal(report.errors[0]?.stepName, "tts_generation");
  assert.equal(report.outputs[0]?.kind, "cover");
});

test("json export format is stable and readable", () => {
  const report = buildComplianceReport({
    job: { id: "job-002" },
  });
  const json = exportComplianceReportJson(report);

  assert.match(json, /"job":/);
  assert.match(json, /"id": "job-002"/);
  assert.match(json, /"compliance":/);
});

test("report generation falls back safely when optional fields are missing", () => {
  const report = buildComplianceReport({
    job: { id: "job-003" },
  });

  assert.equal(report.job.title, "Untitled Job");
  assert.equal(report.job.state, "UNKNOWN");
  assert.equal(report.compliance.allowed, true);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.outputs, []);
});

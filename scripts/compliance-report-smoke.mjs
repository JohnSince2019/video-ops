import { buildComplianceReport, exportComplianceReportJson } from "../lib/compliance/compliance-report.ts";

const report = buildComplianceReport({
  job: {
    id: "job-smoke-001",
    title: "Compliance Export Demo",
    state: "COMPLETED",
    platform: "videox",
    renderProfile: "high_quality",
    updatedAt: "2026-06-27T04:00:00.000Z",
  },
  compliance: {
    allowed: true,
    violations: [],
  },
  outputs: [
    { kind: "video", path: "output/demo.mp4" },
    { kind: "metadata", path: "output/demo-metadata.json" },
  ],
});

console.log(exportComplianceReportJson(report));

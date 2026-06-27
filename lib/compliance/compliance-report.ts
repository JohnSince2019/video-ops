import type { ComplianceCheckResult } from "../domain/compliance-guard.js";

export type ComplianceReportInput = {
  job: {
    id: string;
    title?: string;
    state?: string;
    platform?: string;
    renderProfile?: string;
    updatedAt?: string;
  };
  compliance?: ComplianceCheckResult;
  errors?: Array<{
    stepName: string;
    errorMessage: string;
    retryCount: number;
  }>;
  outputs?: Array<{
    kind: string;
    path: string;
  }>;
};

export type ComplianceReport = {
  generatedAt: string;
  job: {
    id: string;
    title: string;
    state: string;
    platform: string;
    renderProfile: string;
    updatedAt: string;
  };
  compliance: {
    allowed: boolean;
    violationCount: number;
    violations: Array<{
      type: string;
      rule: string;
      excerpt: string;
    }>;
  };
  errors: Array<{
    stepName: string;
    errorMessage: string;
    retryCount: number;
  }>;
  outputs: Array<{
    kind: string;
    path: string;
  }>;
};

export function buildComplianceReport(input: ComplianceReportInput): ComplianceReport {
  return {
    generatedAt: new Date().toISOString(),
    job: {
      id: input.job.id,
      title: input.job.title?.trim() || "Untitled Job",
      state: input.job.state?.trim() || "UNKNOWN",
      platform: input.job.platform?.trim() || "unknown-platform",
      renderProfile: input.job.renderProfile?.trim() || "unknown-profile",
      updatedAt: input.job.updatedAt?.trim() || "unknown-time",
    },
    compliance: {
      allowed: input.compliance?.allowed ?? true,
      violationCount: input.compliance?.violations.length ?? 0,
      violations:
        input.compliance?.violations.map((item) => ({
          type: item.type,
          rule: item.rule,
          excerpt: item.excerpt,
        })) ?? [],
    },
    errors:
      input.errors?.map((item) => ({
        stepName: item.stepName,
        errorMessage: item.errorMessage,
        retryCount: item.retryCount,
      })) ?? [],
    outputs:
      input.outputs?.map((item) => ({
        kind: item.kind,
        path: item.path,
      })) ?? [],
  };
}

export function exportComplianceReportJson(report: ComplianceReport) {
  return JSON.stringify(report, null, 2);
}

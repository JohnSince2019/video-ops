import { JOB_STATES, type JobState } from "../domain/job-state.js";

export type JobDashboardRecord = {
  id: string;
  title?: string | null;
  state?: string | null;
  platform?: string | null;
  renderProfile?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  progress?: number | null;
  currentStep?: string | null;
  manifestId?: string | null;
  ownerTokenHash?: string | null;
  lastCheckpoint?: unknown;
  outputs?: Array<{ path: string; kind: string }>;
  errors?: Array<{ stepName: string; errorMessage: string; retryCount: number }>;
};

export type JobListItem = {
  id: string;
  title: string;
  state: JobState | "UNKNOWN";
  platform: string;
  renderProfile: string;
  updatedLabel: string;
  progressLabel: string;
  statusTone: "queued" | "running" | "success" | "error" | "neutral";
};

export type JobDetailView = {
  id: string;
  title: string;
  state: JobState | "UNKNOWN";
  progress: number;
  currentStep: string;
  platform: string;
  renderProfile: string;
  updatedLabel: string;
  createdLabel: string;
  checkpointSummary: string;
  errorSummary: string[];
  outputsSummary: string[];
};

function normalizeState(state?: string | null): JobState | "UNKNOWN" {
  if (state && JOB_STATES.includes(state as JobState)) {
    return state as JobState;
  }

  return "UNKNOWN";
}

function formatDateLabel(value?: string | null) {
  if (!value) {
    return "Unknown time";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return date.toISOString().replace("T", " ").slice(0, 16);
}

function getStatusTone(state: JobState | "UNKNOWN"): JobListItem["statusTone"] {
  if (state === "QUEUED") return "queued";
  if (state === "COMPLETED") return "success";
  if (state === "FAILED" || state === "INTERRUPTED") return "error";
  if (
    state === "PARSING" ||
    state === "AI_PROCESSING" ||
    state === "ASSEMBLING" ||
    state === "RENDERING" ||
    state === "POST_PROCESSING"
  ) {
    return "running";
  }

  return "neutral";
}

function stringifyCheckpoint(checkpoint: unknown) {
  if (!checkpoint) {
    return "No checkpoint captured yet.";
  }

  if (typeof checkpoint === "string") {
    return checkpoint;
  }

  try {
    return JSON.stringify(checkpoint, null, 2);
  } catch {
    return "Checkpoint data unavailable.";
  }
}

export function buildJobListView(records: JobDashboardRecord[]): JobListItem[] {
  return records.map((record, index) => {
    const state = normalizeState(record.state);
    const progressValue =
      typeof record.progress === "number" && Number.isFinite(record.progress)
        ? Math.max(0, Math.min(100, Math.round(record.progress)))
        : state === "COMPLETED"
          ? 100
          : 0;

    return {
      id: record.id,
      title: record.title?.trim() || `Untitled Job ${index + 1}`,
      state,
      platform: record.platform?.trim() || "unknown-platform",
      renderProfile: record.renderProfile?.trim() || "unknown-profile",
      updatedLabel: formatDateLabel(record.updatedAt),
      progressLabel: `${progressValue}%`,
      statusTone: getStatusTone(state),
    };
  });
}

export function buildJobDetailView(record: JobDashboardRecord): JobDetailView {
  const state = normalizeState(record.state);
  const progress =
    typeof record.progress === "number" && Number.isFinite(record.progress)
      ? Math.max(0, Math.min(100, Math.round(record.progress)))
      : state === "COMPLETED"
        ? 100
        : 0;

  return {
    id: record.id,
    title: record.title?.trim() || "Untitled Job",
    state,
    progress,
    currentStep: record.currentStep?.trim() || "No active step",
    platform: record.platform?.trim() || "unknown-platform",
    renderProfile: record.renderProfile?.trim() || "unknown-profile",
    updatedLabel: formatDateLabel(record.updatedAt),
    createdLabel: formatDateLabel(record.createdAt),
    checkpointSummary: stringifyCheckpoint(record.lastCheckpoint),
    errorSummary:
      record.errors?.length
        ? record.errors.map(
            (item) => `${item.stepName}: ${item.errorMessage} (retry ${item.retryCount})`,
          )
        : ["No errors recorded."],
    outputsSummary:
      record.outputs?.length
        ? record.outputs.map((item) => `${item.kind}: ${item.path}`)
        : ["No output bundle available yet."],
  };
}

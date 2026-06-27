import { buildJobDetailView, buildJobListView } from "../lib/ui/job-dashboard.ts";

const jobs = [
  {
    id: "job-smoke-001",
    title: "Atlas Demo Job",
    state: "RENDERING",
    platform: "douyin",
    renderProfile: "standard",
    updatedAt: "2026-06-27T02:30:00.000Z",
    createdAt: "2026-06-27T02:00:00.000Z",
    progress: 88,
    currentStep: "ffmpeg_render",
    lastCheckpoint: { step: "assembly", clipCount: 6 },
    outputs: [{ kind: "cover", path: "output/cover.png" }],
    errors: [],
  },
  {
    id: "job-smoke-002",
    title: "Failed Job",
    state: "FAILED",
    platform: "videox",
    renderProfile: "draft",
    updatedAt: "2026-06-27T01:30:00.000Z",
    createdAt: "2026-06-27T01:00:00.000Z",
    progress: 35,
    currentStep: "tts_generation",
    lastCheckpoint: null,
    outputs: [],
    errors: [{ stepName: "tts_generation", errorMessage: "missing output wav", retryCount: 3 }],
  },
];

console.log(
  JSON.stringify(
    {
      list: buildJobListView(jobs),
      detail: buildJobDetailView(jobs[0]),
    },
    null,
    2,
  ),
);

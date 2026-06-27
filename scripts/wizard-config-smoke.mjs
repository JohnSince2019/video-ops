import { normalizeWizardConfig, summarizeWizardConfig } from "../lib/ui/wizard-config.ts";

const draft = normalizeWizardConfig({
  title: "Video-Ops Wizard Smoke",
  platform: "videox",
  renderProfile: "draft",
  author: "John",
  ownerToken: "wizard-smoke-token",
  scriptText: "第一段说明。\n\n第二段说明。",
  scriptMode: "plain_text",
});

console.log(
  JSON.stringify(
    {
      draft,
      summary: summarizeWizardConfig(draft),
    },
    null,
    2,
  ),
);

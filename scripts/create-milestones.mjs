import { LinearClient } from "@linear/sdk";

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
if (!LINEAR_API_KEY) {
  console.error("❌ LINEAR_API_KEY not set. Copy .env.example → .env and fill in your key.");
  console.error("   Get your key at: https://linear.app/johnsince2019/settings/api");
  process.exit(1);
}
const PROJECT_ID = "dc5c8ec1-6088-4231-9815-e399c0ea7cb3";

const milestoneIds = {
  "M0 - Foundation":   "d5f4f4f2-3ca9-4316-9683-24f4b3a695be",
  "M1 - Core Pipeline":"acf0f3d6-bda9-4af1-b59c-91fe53d465c2",
  "M2 - Product":       "823409d8-5be8-4080-a7a2-3b1d99bf3fa5",
};

const client = new LinearClient({ apiKey: LINEAR_API_KEY });

const milestones = [
  {
    name: "M0 - Foundation",
    description:
      "工程基线：Git / CI / Docker / DB Schema / AI 安全指南。对应 Sprint 0 全部任务。交付目标：Sprint 1 能开跑。",
    targetDate: "2026-06-27",
  },
  {
    name: "M1 - Core Pipeline",
    description:
      "核心流水线：文案解析 → AI 生图 → TTS → FFmpeg 合成 → 基础队列。对应 Sprint 1 + Sprint 2。交付目标：端到端可生成 mp4。",
    targetDate: "2026-07-25",
  },
  {
    name: "M2 - Product",
    description:
      "产品化：前端 Wizard / 任务面板 / Storyboard 预览 / 质量门禁 / 合规报告。对应 Sprint 3 + Sprint 4。交付目标：用户可通过 Web UI 完整使用。",
    targetDate: "2026-08-22",
  },
];

async function gqlRequest(query, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await client._request(query);
      if (result.errors) throw new Error(JSON.stringify(result.errors));
      return result;
    } catch (err) {
      if (err?.message?.includes("502") && i < retries - 1) {
        console.log(`  ⏳ 502, retry ${i + 1}/${retries}...`);
        await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
}

function esc(s) {
  return s.replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

async function main() {
  console.log("🎯 Creating Project Milestones...\n");

  for (const m of milestones) {
    const mutation = `mutation {
      projectMilestoneCreate(input: {
        projectId: "${PROJECT_ID}",
        name: "${esc(m.name)}",
        description: "${esc(m.description)}",
        targetDate: "${m.targetDate}"
      }) {
        success
        projectMilestone { id name targetDate }
      }
    }`;

    try {
      const r = await gqlRequest(mutation);
      if (r.projectMilestoneCreate?.success) {
        console.log(`  ✅ ${m.name}`);
        console.log(`     ID:      ${r.projectMilestoneCreate.projectMilestone.id}`);
        console.log(`     Target:  ${m.targetDate}`);
      } else {
        console.log(`  ⏭  ${m.name} — ${r.errors?.[0]?.message ?? "unknown error"}`);
      }
    } catch (err) {
      const msg = err?.message || JSON.stringify(err);
      if (msg.includes("already exists") || msg.includes("UniqueConstraintError")) {
        console.log(`  ⏭  ${m.name} — already exists`);
      } else {
        console.error(`  ❌ ${m.name}: ${msg}`);
      }
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("\n🎉 Done!");
  console.log("🔗 https://linear.app/johnsince2019/project/d4cf82ee1e01");
}

main().catch((err) => {
  console.error("Fatal:", err?.message || err);
  process.exit(1);
});

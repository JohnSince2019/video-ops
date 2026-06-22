import { LinearClient } from "@linear/sdk";

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
if (!LINEAR_API_KEY) {
  console.error("❌ LINEAR_API_KEY not set. Copy .env.example → .env and fill in your key.");
  console.error("   Get your key at: https://linear.app/johnsince2019/settings/api");
  process.exit(1);
}
const TEAM_UUID = "46cd5acd-c9f7-46ab-b781-f6e772a0abd6";

const client = new LinearClient({ apiKey: LINEAR_API_KEY });

const milestoneIds = {
  "Sprint 0": "d5f4f4f2-3ca9-4316-9683-24f4b3a695be",  // M0 - Foundation
  "Sprint 1": "acf0f3d6-bda9-4af1-b59c-91fe53d465c2",  // M1 - Core Pipeline
  "Sprint 2": "acf0f3d6-bda9-4af1-b59c-91fe53d465c2",  // M1 - Core Pipeline
  "Sprint 3": "823409d8-5be8-4080-a7a2-3b1d99bf3fa5",  // M2 - Product
  "Sprint 4": "823409d8-5be8-4080-a7a2-3b1d99bf3fa5",  // M2 - Product
};

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

async function main() {
  // 1. Fetch all issues with their cycle
  console.log("📋 Fetching all issues...\n");
  const issuesQuery = `query {
    team(id: "${TEAM_UUID}") {
      issues(first: 100) {
        nodes {
          id
          identifier
          title
          cycle { id name }
        }
      }
    }
  }`;

  const r = await gqlRequest(issuesQuery);
  const issues = r.team.issues.nodes;

  console.log(`Total issues fetched: ${issues.length}\n`);

  // 2. Group by cycle and determine which need updating
  const byCycle = {};
  for (const i of issues) {
    const cycle = i.cycle?.name ?? "No Cycle";
    if (!byCycle[cycle]) byCycle[cycle] = [];
    byCycle[cycle].push({ id: i.id, identifier: i.identifier, title: i.title });
  }

  // 3. Print plan
  let total = 0;
  for (const [cycle, items] of Object.entries(byCycle)) {
    const msId = milestoneIds[cycle];
    const label = msId ? `→ ${Object.entries(milestoneIds).find(([k]) => milestoneIds[k] === msId)?.[0]}` : "❌ no mapping";
    console.log(`  ${cycle} (${items.length} issues) ${label}`);
    total += items.length;
  }
  console.log(`\nTotal to update: ${total}\n`);

  // 4. Batch update — one mutation per issue
  let updated = 0, skipped = 0, failed = 0;

  for (const issue of issues) {
    const cycle = issue.cycle?.name ?? "No Cycle";
    const milestoneId = milestoneIds[cycle];

    if (!milestoneId) {
      console.log(`  ⏭  ${issue.identifier} (${cycle}) — no milestone mapping`);
      skipped++;
      continue;
    }

    const mutation = `mutation {
      issueUpdate(id: "${issue.id}", input: { projectMilestoneId: "${milestoneId}" }) {
        success
      }
    }`;

    try {
      const r = await gqlRequest(mutation);
      if (r.issueUpdate?.success) {
        console.log(`  ✅ ${issue.identifier} → ${cycle}`);
        updated++;
      } else {
        console.log(`  ⏭  ${issue.identifier} — ${r.errors?.[0]?.message ?? "no change"}`);
        skipped++;
      }
    } catch (err) {
      const msg = err?.message ?? JSON.stringify(err);
      if (msg.includes("already set") || msg.includes("no change")) {
        console.log(`  ⏭  ${issue.identifier} — already linked`);
        skipped++;
      } else {
        console.error(`  ❌ ${issue.identifier}: ${msg.slice(0, 120)}`);
        failed++;
      }
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n🎉 Done! Updated: ${updated}  Skipped: ${skipped}  Failed: ${failed}`);
  console.log("🔗 https://linear.app/johnsince2019/project/d4cf82ee1e01");
}

main().catch((err) => {
  console.error("Fatal:", err?.message || err);
  process.exit(1);
});

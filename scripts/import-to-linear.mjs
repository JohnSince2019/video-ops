import { LinearClient } from "@linear/sdk";

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
if (!LINEAR_API_KEY) {
  console.error("❌ LINEAR_API_KEY not set. Copy .env.example → .env and fill in your key.");
  console.error("   Get your key at: https://linear.app/johnsince2019/settings/api");
  process.exit(1);
}
const TEAM_UUID = "46cd5acd-c9f7-46ab-b781-f6e772a0abd6";

const client = new LinearClient({ apiKey: LINEAR_API_KEY });

// Pre-known IDs from previous creation
const labelIds = {
  "E1 - 内容输入与解析": "d7744bbc-5f48-4ee8-ad65-01d08fff9a09",
  "E2 - AI 处理流水线": "c629a8d3-bcc0-4f2b-8088-2071e18685ef",
  "E3 - 渲染与输出": "eead40c8-cb95-4730-919d-22b816436f27",
  "E4 - 任务管理与状态": "21850e25-b8bb-422d-9e0a-c143a24b6025",
  "E5 - 质量门禁与重试": "93a8aa1d-e5a1-46df-ba01-d32ce1d44103",
  "E6 - 前端 UI": "a057d4d7-1075-48b0-945e-d50e4ef22e0a",
  "E7 - 认证与安全": "9768e1d3-c525-43b1-b1de-be6a1b38dfe3",
  "E8 - 基础设施": "3969a2b1-f859-4648-a0fe-18fe43387df3",
};

const cycleIds = {
  "Sprint 0": "5deb7a1c-2d8f-4a81-a6c0-412984ad5e75",
  "Sprint 1": "9e7de9ff-cfae-47d0-b4a6-92b0961ffb99",
  "Sprint 2": "4e11bf1a-fb57-4a47-8c21-2333712d3b8c",
  "Sprint 3": "eac4ecea-298e-48b7-b688-2d9123a1e3fc",
  "Sprint 4": "1cfdd8f6-463e-47c5-8511-230c27d7535b",
};

async function gql(query, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await client._request(query);
      if (result.errors) throw new Error(JSON.stringify(result.errors));
      return result;
    } catch (err) {
      if (err.message?.includes("502") && i < retries - 1) {
        console.log(`  ⏳ 502, retry ${i + 1}/${retries}...`);
        await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
}

function esc(s) { return s.replace(/"/g, '\\"'); }

const sprintMap = {
  E8: "Sprint 0", E7: "Sprint 0", E4: "Sprint 0",
  E1: "Sprint 1", E2: "Sprint 1",
  E3: "Sprint 2", E5: "Sprint 2",
  E6: "Sprint 3",
};

const issues = [
  ["TextParser：ContentManifest JSON Schema 验证",           1,   1, "E1 - 内容输入与解析"],
  ["TextParser：Markdown → SceneGraph 解析",                  2,   1, "E1 - 内容输入与解析"],
  ["TextParser：TXT 纯文本逐句切割（fallback）",             1,   2, "E1 - 内容输入与解析"],
  ["TextParser：输出 scene_hash + prompt_hash 用于缓存键",   0.5, 2, "E1 - 内容输入与解析"],
  ["Schema 类型定义（`lib/types/manifest.ts`）",             0.5, 2, "E1 - 内容输入与解析"],
  ["ImageGenerator：GPT Image 2 调用（P2）",                 1,   1, "E2 - AI 处理流水线"],
  ["ImageGenerator：wanx-v1 调用（P3 Broll）",               1,   2, "E2 - AI 处理流水线"],
  ["ImageGenerator：图片中间产物缓存（scene_hash）",         1,   2, "E2 - AI 处理流水线"],
  ["TTSClient：CosyVoice 3.0 MLX 本地推理（P4）",          2,   1, "E2 - AI 处理流水线"],
  ["TTSClient：零样本音色克隆（参考音频）",                   1,   2, "E2 - AI 处理流水线"],
  ["VideoAssembler：时间线组装 + 转场（P6）",                2,   1, "E2 - AI 处理流水线"],
  ["BGM 音乐库：Pixabay 预设 20 首集成",                     1,   2, "E2 - AI 处理流水线"],
  ["资产缓存：Hash 键 + 过期策略",                           1,   2, "E2 - AI 处理流水线"],
  ["FFmpeg：三档渲染（draft/standard/high_quality）",       1.5, 1, "E3 - 渲染与输出"],
  ["平台适配：抖音 / 小红书 / 视频号 元数据注入",             1,   2, "E3 - 渲染与输出"],
  ["输出包：MP4 + 封面 + metadata.json",                    0.5, 2, "E3 - 渲染与输出"],
  ["BullMQ + Redis：任务队列初始化",                         1,   1, "E4 - 任务管理与状态"],
  ["JobState：状态机（7 个状态流转）",                        1,   1, "E4 - 任务管理与状态"],
  ["SSE 实时推送：任务进度 WebSocket",                       1,   2, "E4 - 任务管理与状态"],
  ["断点续跑：manifestHash + ownerToken 幂等检查",          1,   2, "E4 - 任务管理与状态"],
  ["成本估算：API 调用计数 + usd 估算",                       1,   2, "E4 - 任务管理与状态"],
  ["队列积压保护：50 任务上限 + 内存 12GB 阈值",             0.5, 2, "E4 - 任务管理与状态"],
  ["图片质量校验：尺寸 / 亮度检测",                          1,   1, "E5 - 质量门禁与重试"],
  ["音频质量校验：振幅 / 时长 / 静音检测",                    1,   1, "E5 - 质量门禁与重试"],
  ["自动重试：失败重跑（max 3 次）+ JobErrorLog",           1,   2, "E5 - 质量门禁与重试"],
  ["Worker crash → INTERRUPTED → 启动时 scan 恢复",         0.5, 2, "E5 - 质量门禁与重试"],
  ["视频制作向导（Wizard）：配置页",                          1,   1, "E6 - 前端 UI"],
  ["任务管理面板：列表 + 状态 + 详情",                        1,   1, "E6 - 前端 UI"],
  ["Storyboard 预览页：3 类可调参数",                         1.5, 2, "E6 - 前端 UI"],
  ["复用 ContentOps Zen 设计系统",                           0.5, 2, "E6 - 前端 UI"],
  ["合规报告导出（JSON + PDF）",                              1,   2, "E6 - 前端 UI"],
  ["owner token 隔离：X-Owner-Token header + DB hash",       0.5, 1, "E7 - 认证与安全"],
  ["Upstash Redis Rate Limiting（20 req/min/IP）",             0.5, 2, "E7 - 认证与安全"],
  ["合规检查：正则 + 关键词黑名单（Worker 端执行）",         1,   2, "E7 - 认证与安全"],
  ["Prisma + PostgreSQL：数据库 Schema 初始化",              1,   1, "E8 - 基础设施"],
  ["Docker：Redis + PostgreSQL 开发环境 docker-compose",     0.5, 1, "E8 - 基础设施"],
  ["GitHub Actions CI：lint + type-check + test + 覆盖率 >= 60%", 1, 1, "E8 - 基础设施"],
  ["GitHub Actions：secret-scan.yml 密钥泄露扫描",           0.5, 2, "E8 - 基础设施"],
  ["GitHub Actions：release.yml main 合并构建发布",           0.5, 2, "E8 - 基础设施"],
];

async function main() {
  console.log("📋 Creating Issues...\n");
  let success = 0, skipped = 0;

  for (let i = 0; i < issues.length; i++) {
    const [title, estVal, pri, epic] = issues[i];
    const epicPrefix = epic.split(" ")[0];
    const sprint = sprintMap[epicPrefix];
    const labelId = labelIds[epic];
    const cycleId = sprint ? cycleIds[sprint] : null;

    const labelArg = labelId ? `, labelIds: ["${labelId}"]` : "";
    const cycleArg = cycleId ? `, cycleId: "${cycleId}"` : "";
    const estimate = Math.round(estVal * 10);

    const mutation = `mutation { issueCreate(input: { teamId: "${TEAM_UUID}", title: "${esc(title)}", estimate: ${estimate}, priority: ${pri} ${labelArg} ${cycleArg} }) { success issue { id identifier } } }`;

    try {
      const r = await gql(mutation);
      if (r.issueCreate?.success) {
        console.log(`  ✅ [${i + 1}/${issues.length}] ${r.issueCreate.issue.identifier} → ${title.slice(0, 40)}`);
        success++;
      } else {
        console.log(`  ⚠️  ${title.slice(0, 40)}`);
        skipped++;
      }
    } catch (err) {
      const msg = err.message || JSON.stringify(err);
      if (msg.includes("already exists")) {
        console.log(`  ⏭  [${i + 1}/${issues.length}] 已存在`);
        skipped++;
      } else {
        console.error(`  ❌ [${i + 1}/${issues.length}] ${title.slice(0, 40)}: ${msg.slice(0, 100)}`);
      }
    }

    // Small delay between requests
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n🎉 Done! ${success} created, ${skipped} skipped.`);
  console.log("🔗 https://linear.app/johnsince2019/team/JOH");
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});

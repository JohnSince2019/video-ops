import { generateBrollForScene } from "../lib/image/wanx-broll-client.ts";

const demoScene = {
  id: "scene-002",
  scene_hash: "scene-hash-demo-002",
  prompt_hash: "prompt-hash-demo-002",
  narration: "用辅助镜头让观众更快理解流程细节。",
  visual_hint: "桌面上的便利贴、键盘和流程卡片",
  script_type: "narration",
  mood: "calm",
};

const result = await generateBrollForScene(
  {
    scene: demoScene,
    shotIntent: "supporting desk detail shot",
  },
  {
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      return new Response(
        JSON.stringify({
          data: [
            {
              url: `mock://generated/broll/${demoScene.id}.png`,
            },
          ],
          debug: {
            requestPrompt: body.prompt,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    },
  },
);

console.log(JSON.stringify(result, null, 2));

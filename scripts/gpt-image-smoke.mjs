import { generateImageForScene } from "../lib/image/gpt-image-client.ts";

const demoScene = {
  id: "scene-001",
  scene_hash: "scene-hash-demo-001",
  prompt_hash: "prompt-hash-demo-001",
  narration: "把复杂流程拆成清晰步骤，然后让 AI 去执行。",
  visual_hint: "一位知识工作者在白板前拆解流程，旁边有 AI 面板辅助",
  script_type: "narration",
  mood: "inspiring",
};

const result = await generateImageForScene(
  {
    scene: demoScene,
    model: "gpt-image-2",
    responseFormat: "url",
  },
  {
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      return new Response(
        JSON.stringify({
          data: [
            {
              url: `mock://generated/${demoScene.id}.png`,
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

import assert from "node:assert/strict";
import test from "node:test";

import {
  buildImagePrompt,
  buildImageRequestBody,
  generateImageForScene,
  normalizeImageGenerationResult,
} from "../lib/image/gpt-image-client.js";

const scene = {
  id: "scene-001",
  scene_hash: "scene-hash-001",
  prompt_hash: "prompt-hash-001",
  narration: "让 Atlas 帮你把 SOP 变成自动执行流程。",
  visual_hint: "一位研发经理与 AI 助手协作规划工作流",
  script_type: "narration" as const,
  mood: "inspiring" as const,
};

test("maps scene input into a normalized GPT Image request", () => {
  const body = buildImageRequestBody({
    scene,
    model: "gpt-image-2",
    size: "1024x1024",
  });

  assert.equal(body.model, "gpt-image-2");
  assert.equal(body.size, "1024x1024");
  assert.equal(body.response_format, "url");
  assert.match(body.prompt, /Scene hash: scene-hash-001/);
  assert.match(body.prompt, /Prompt hash: prompt-hash-001/);
  assert.match(body.prompt, /Style preset: John Vertical Comic Explainer/);
  assert.match(body.prompt, /Persona preset: John Persona v1/);
  assert.match(body.prompt, /Do not imitate platform UI/);
  assert.match(body.prompt, /reference-images\/john-persona-v1\.png/);
  assert.match(buildImagePrompt(scene), /Visual hint:/);
});

test("normalizes successful image responses for downstream modules", () => {
  const input = { scene, model: "gpt-image-2" };
  const body = buildImageRequestBody(input);
  const result = normalizeImageGenerationResult(input, body, {
    data: [{ url: "https://cdn.example.com/generated/scene-001.png" }],
  });

  assert.equal(result.sceneId, "scene-001");
  assert.equal(result.model, "gpt-image-2");
  assert.equal(result.artifacts[0]?.artifactKey, "scene-hash-001:prompt-hash-001:0");
  assert.equal(
    result.artifacts[0]?.url,
    "https://cdn.example.com/generated/scene-001.png",
  );
});

test("returns explicit errors for gateway failures", async () => {
  await assert.rejects(
    () =>
      generateImageForScene(
        { scene },
        {
          fetchImpl: async () =>
            new Response(JSON.stringify({ error: "provider unavailable" }), {
              status: 503,
              headers: { "Content-Type": "application/json" },
            }),
        },
      ),
    /provider unavailable/,
  );
});

test("returns explicit errors for empty or invalid gateway payloads", async () => {
  await assert.rejects(
    () =>
      generateImageForScene(
        { scene },
        {
          fetchImpl: async () =>
            new Response(JSON.stringify({ data: [] }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
        },
      ),
    /no usable image artifacts/,
  );

  await assert.rejects(
    () =>
      generateImageForScene(
        { scene },
        {
          fetchImpl: async () =>
            new Response("not-json", {
              status: 200,
              headers: { "Content-Type": "text/plain" },
            }),
        },
      ),
    /non-JSON response/,
  );
});

test("generated result shape is consumable by cache and asset modules", async () => {
  const result = await generateImageForScene(
    {
      scene,
      model: "gpt-image-2",
      responseFormat: "b64_json",
    },
    {
      fetchImpl: async () =>
        new Response(JSON.stringify({ data: [{ b64_json: "ZmFrZS1pbWFnZQ==" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    },
  );

  assert.equal(result.responseFormat, "b64_json");
  assert.equal(result.sceneHash, "scene-hash-001");
  assert.equal(result.promptHash, "prompt-hash-001");
  assert.equal(result.artifacts[0]?.b64_json, "ZmFrZS1pbWFnZQ==");
});

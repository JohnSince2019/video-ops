import assert from "node:assert/strict";
import test from "node:test";

import { buildImagePrompt } from "../lib/image/gpt-image-client.js";
import {
  buildBrollPrompt,
  buildBrollRequestBody,
  generateBrollForScene,
} from "../lib/image/wanx-broll-client.js";

const scene = {
  id: "scene-002",
  scene_hash: "scene-hash-002",
  prompt_hash: "prompt-hash-002",
  narration: "先把复杂流程拆小，再交给 AI 去执行。",
  visual_hint: "白板上的流程节点与箭头",
  script_type: "narration" as const,
  mood: "calm" as const,
};

test("maps scene input into a normalized wanx-v1 B-roll request", () => {
  const body = buildBrollRequestBody({
    scene,
    responseFormat: "url",
  });

  assert.equal(body.model, "wanx-v1");
  assert.equal(body.response_format, "url");
  assert.match(body.prompt, /Create a B-roll support shot/);
  assert.match(body.prompt, /Shot intent:/);
});

test("b-roll prompt is differentiated from the main image prompt", () => {
  const mainPrompt = buildImagePrompt(scene);
  const brollPrompt = buildBrollPrompt(scene, "detail insert shot");

  assert.notEqual(mainPrompt, brollPrompt);
  assert.match(brollPrompt, /detail insert shot/);
  assert.match(brollPrompt, /B-roll support shot/);
});

test("returns explicit errors for gateway failures", async () => {
  await assert.rejects(
    () =>
      generateBrollForScene(
        { scene },
        {
          fetchImpl: async () =>
            new Response(JSON.stringify({ error: "wanx provider timeout" }), {
              status: 502,
              headers: { "Content-Type": "application/json" },
            }),
        },
      ),
    /wanx provider timeout/,
  );
});

test("returns explicit errors for empty image payloads", async () => {
  await assert.rejects(
    () =>
      generateBrollForScene(
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
});

test("result structure stays compatible with the main image flow", async () => {
  const result = await generateBrollForScene(
    {
      scene,
      responseFormat: "b64_json",
      shotIntent: "environment establishing shot",
    },
    {
      fetchImpl: async () =>
        new Response(JSON.stringify({ data: [{ b64_json: "YnJvbGwtaW1hZ2U=" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    },
  );

  assert.equal(result.model, "wanx-v1");
  assert.equal(result.sceneId, "scene-002");
  assert.equal(result.responseFormat, "b64_json");
  assert.equal(result.artifacts[0]?.artifactKey, "scene-hash-002:prompt-hash-002:0");
});

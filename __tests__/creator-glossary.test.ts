import assert from "node:assert/strict";
import test from "node:test";

import { applyCreatorGlossary } from "../lib/raw-video/creator-glossary.js";

test("applyCreatorGlossary normalizes key creator and product terms", () => {
  const result = applyCreatorGlossary("jon 用 content ops 和 viedo-ops 跟 atlass 一起复盘。");

  assert.equal(result.text.includes("John"), true);
  assert.equal(result.text.includes("ContentOps"), true);
  assert.equal(result.text.includes("video-ops"), true);
  assert.equal(result.text.includes("Atlas"), true);
  assert.equal(result.replacements.length >= 4, true);
});

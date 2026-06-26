import test from "node:test";
import assert from "node:assert/strict";

import { runComplianceGuard } from "../lib/domain/compliance-guard.js";

test("detects keyword blacklist violations", () => {
  const result = runComplianceGuard("这段文案包含违禁词，需要被拦截。");
  assert.equal(result.allowed, false);
  assert.equal(result.violations[0]?.type, "keyword");
  assert.equal(result.violations[0]?.rule, "违禁词");
});

test("detects regex-based violations", () => {
  const result = runComplianceGuard("欢迎添加微信: atlas2026 获取资料，手机号 13800138000。");
  assert.equal(result.allowed, false);
  assert.deepEqual(
    result.violations.map((item) => item.rule).sort(),
    ["phone-number", "wechat-id"],
  );
});

test("allows safe baseline text", () => {
  const result = runComplianceGuard("今天分享如何用 AI 提高研发效率，并保持稳定输出。");
  assert.equal(result.allowed, true);
  assert.deepEqual(result.violations, []);
});

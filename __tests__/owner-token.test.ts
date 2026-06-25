import test from "node:test";
import assert from "node:assert/strict";

import { hashOwnerToken, normalizeOwnerToken, resolveOwnerTokenHash } from "../lib/domain/owner-token.js";

test("normalizes owner tokens", () => {
  assert.equal(normalizeOwnerToken({ ownerToken: "  alice  " }), "alice");
});

test("rejects missing owner tokens", () => {
  assert.throws(() => normalizeOwnerToken({}), /X-Owner-Token header is required/);
  assert.throws(() => normalizeOwnerToken({ ownerToken: "   " }), /X-Owner-Token header is required/);
});

test("hashes owner tokens deterministically", () => {
  const hash1 = hashOwnerToken("alice");
  const hash2 = hashOwnerToken("alice");
  const hash3 = hashOwnerToken("bob");
  assert.equal(hash1, hash2);
  assert.notEqual(hash1, hash3);
});

test("resolves owner token hashes from request input", () => {
  const hash = resolveOwnerTokenHash({ ownerToken: "alice" });
  assert.equal(hash.length, 64);
});

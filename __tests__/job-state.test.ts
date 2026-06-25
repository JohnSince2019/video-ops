import test from "node:test";
import assert from "node:assert/strict";
import { canTransition, transitionJobState } from "../lib/domain/job-state.js";

test("allows the happy path transitions", () => {
  assert.equal(canTransition("QUEUED", "PARSING"), true);
  assert.equal(canTransition("PARSING", "AI_PROCESSING"), true);
  assert.equal(canTransition("AI_PROCESSING", "ASSEMBLING"), true);
  assert.equal(canTransition("ASSEMBLING", "RENDERING"), true);
  assert.equal(canTransition("RENDERING", "POST_PROCESSING"), true);
  assert.equal(canTransition("POST_PROCESSING", "COMPLETED"), true);
});

test("allows failure and recovery transitions", () => {
  assert.equal(canTransition("QUEUED", "FAILED"), true);
  assert.equal(canTransition("PARSING", "INTERRUPTED"), true);
  assert.equal(canTransition("INTERRUPTED", "QUEUED"), true);
});

test("rejects invalid transitions", () => {
  assert.equal(canTransition("QUEUED", "COMPLETED"), false);
  assert.equal(canTransition("COMPLETED", "QUEUED"), false);
  assert.equal(canTransition("FAILED", "PARSING"), false);
});

test("throws on invalid transition attempts", () => {
  assert.throws(() => transitionJobState("QUEUED", "COMPLETED"), /Invalid job state transition/);
});

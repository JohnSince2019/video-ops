import { MemoryRateLimitStore, evaluateRateLimit } from "../lib/domain/rate-limit.ts";

const store = new MemoryRateLimitStore();
const now = Date.now();

for (let i = 0; i < 20; i++) {
  evaluateRateLimit({
    ip: "127.0.0.1",
    now: now + i,
    store,
  });
}

const result = evaluateRateLimit({
  ip: "127.0.0.1",
  now: now + 21,
  store,
});

console.log(JSON.stringify(result, null, 2));

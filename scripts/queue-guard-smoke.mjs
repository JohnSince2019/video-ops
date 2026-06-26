import { evaluateQueueGuard } from "../lib/domain/queue-guard.ts";

const result = evaluateQueueGuard({
  backlogCount: 51,
  memoryUsageGb: 8,
});

console.log(JSON.stringify(result, null, 2));

import { estimateJobCost } from "../lib/domain/cost-estimator.ts";

const result = estimateJobCost({
  gptImageCalls: 2,
  wanxCalls: 3,
  ttsDurationSecs: 120,
});

console.log(JSON.stringify(result, null, 2));

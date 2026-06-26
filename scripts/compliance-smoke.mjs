import { runComplianceGuard } from "../lib/domain/compliance-guard.ts";

const text = process.argv.slice(2).join(" ") || "欢迎添加微信: atlas2026 获取资料，手机号 13800138000。";
const result = runComplianceGuard(text);

console.log(JSON.stringify(result, null, 2));

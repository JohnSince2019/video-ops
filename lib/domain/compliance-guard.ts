export type ComplianceRuleMatch = {
  type: "keyword" | "regex";
  rule: string;
  excerpt: string;
};

export type ComplianceCheckResult = {
  allowed: boolean;
  violations: ComplianceRuleMatch[];
};

const KEYWORD_BLACKLIST = [
  "违禁词",
  "政治敏感",
  "侵权素材",
] as const;

const REGEX_RULES = [
  { name: "phone-number", pattern: /\b1\d{10}\b/g },
  { name: "wechat-id", pattern: /微信[:：]?\s*[a-zA-Z][-_a-zA-Z0-9]{5,19}/g },
] as const;

function snippet(text: string, start: number, end: number) {
  return text.slice(Math.max(0, start - 8), Math.min(text.length, end + 8));
}

export function runComplianceGuard(text: string): ComplianceCheckResult {
  const violations: ComplianceRuleMatch[] = [];

  for (const keyword of KEYWORD_BLACKLIST) {
    const index = text.indexOf(keyword);
    if (index >= 0) {
      violations.push({
        type: "keyword",
        rule: keyword,
        excerpt: snippet(text, index, index + keyword.length),
      });
    }
  }

  for (const rule of REGEX_RULES) {
    for (const match of text.matchAll(rule.pattern)) {
      const value = match[0];
      const start = match.index ?? 0;
      violations.push({
        type: "regex",
        rule: rule.name,
        excerpt: snippet(text, start, start + value.length),
      });
    }
  }

  return {
    allowed: violations.length === 0,
    violations,
  };
}

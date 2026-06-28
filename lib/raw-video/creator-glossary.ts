export type CreatorGlossaryEntry = {
  canonical: string;
  variants: string[];
  note?: string;
};

export type CreatorGlossaryReplacement = {
  from: string;
  to: string;
};

export const DEFAULT_CREATOR_GLOSSARY: CreatorGlossaryEntry[] = [
  {
    canonical: "John",
    variants: ["jon", "johnn", "强", "阿勇"],
    note: "统一创作者英文名和常见误听。",
  },
  {
    canonical: "ContentOps",
    variants: ["content ops", "content-ops", "contentop", "content tops"],
    note: "统一内容生产系统品牌名。",
  },
  {
    canonical: "video-ops",
    variants: ["video ops", "videoops", "vido-ops", "viedo-ops", "video op"],
    note: "统一视频生产系统品牌名。",
  },
  {
    canonical: "Atlas",
    variants: ["atlass", "atlus", "艾特拉斯"],
    note: "统一 AI 合伙人角色名。",
  },
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceCaseInsensitive(text: string, from: string, to: string) {
  const pattern = new RegExp(escapeRegExp(from), "gi");
  return text.replace(pattern, to);
}

export function applyCreatorGlossary(
  text: string,
  glossary: CreatorGlossaryEntry[] = DEFAULT_CREATOR_GLOSSARY,
): { text: string; replacements: CreatorGlossaryReplacement[] } {
  let nextText = text;
  const replacements: CreatorGlossaryReplacement[] = [];

  for (const entry of glossary) {
    for (const variant of entry.variants) {
      if (!variant.trim()) {
        continue;
      }

      const updated = replaceCaseInsensitive(nextText, variant, entry.canonical);
      if (updated !== nextText) {
        replacements.push({ from: variant, to: entry.canonical });
        nextText = updated;
      }
    }
  }

  return {
    text: nextText,
    replacements,
  };
}

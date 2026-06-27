import type { ContentManifest, RenderProfile, SupportedPlatform } from "../types/manifest.js";
import type { VideoTimeline } from "./video-assembler.js";

export type PlatformMetadata = {
  platform: SupportedPlatform;
  title: string;
  description: string;
  tags: string[];
  orientation: "portrait" | "landscape";
  category: string;
  coverText: string;
  renderProfile: RenderProfile;
  durationMs: number;
};

function buildBaseTags(manifest: ContentManifest) {
  return [
    "AI效率",
    "video-ops",
    manifest.metadata.author,
  ].filter(Boolean);
}

function requireTitle(manifest: ContentManifest) {
  if (!manifest.title?.trim()) {
    throw new Error("Manifest title is required for platform metadata.");
  }
  return manifest.title.trim();
}

export function buildPlatformMetadata(input: {
  manifest: ContentManifest;
  timeline: VideoTimeline;
  platform?: SupportedPlatform;
  renderProfile?: RenderProfile;
}) {
  const platform = input.platform ?? input.manifest.platform;
  const renderProfile = input.renderProfile ?? input.manifest.renderProfile;
  const title = requireTitle(input.manifest);
  const baseTags = buildBaseTags(input.manifest);
  const durationMs = input.timeline.totalDurationMs;

  if (!input.timeline.clips.length) {
    throw new Error("Timeline clips are required for platform metadata.");
  }

  switch (platform) {
    case "douyin":
      return {
        platform,
        title: `${title}｜抖音版`,
        description: `${title}\n适合竖屏高频刷看的短视频版本。`,
        tags: [...baseTags, "抖音", "短视频"],
        orientation: "portrait",
        category: "knowledge_short_video",
        coverText: `${title}｜高信息密度`,
        renderProfile,
        durationMs,
      } satisfies PlatformMetadata;
    case "xiaohongshu":
      return {
        platform,
        title: `${title}｜小红书笔记视频`,
        description: `${title}\n适合图文视频混合表达，强调可复制的方法。`,
        tags: [...baseTags, "小红书", "干货"],
        orientation: "portrait",
        category: "note_video",
        coverText: `${title}｜可直接上手`,
        renderProfile,
        durationMs,
      } satisfies PlatformMetadata;
    case "videox":
      return {
        platform,
        title: `${title}｜视频号版`,
        description: `${title}\n适合稳态观看和转发分享的版本。`,
        tags: [...baseTags, "视频号", "知识分享"],
        orientation: "portrait",
        category: "channel_video",
        coverText: `${title}｜系统方法`,
        renderProfile,
        durationMs,
      } satisfies PlatformMetadata;
    default:
      throw new Error(`Unsupported platform "${platform}".`);
  }
}

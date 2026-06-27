import { promises as fs } from "node:fs";
import path from "node:path";

const CUSTOM_VOICE_REFERENCE_ROOT = path.join(process.cwd(), "tmp", "custom-voice-references");

function sanitizeSegment(value: string, fallback: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "") || fallback;
}

function extensionFromMimeType(mimeType: string) {
  if (mimeType.includes("wav")) return ".wav";
  if (mimeType.includes("mpeg")) return ".mp3";
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return ".m4a";
  if (mimeType.includes("webm")) return ".webm";
  if (mimeType.includes("ogg")) return ".ogg";
  return ".bin";
}

export function getCustomVoiceReferenceRoot() {
  return CUSTOM_VOICE_REFERENCE_ROOT;
}

export function buildCustomVoiceReferenceAbsolutePath(filename: string) {
  return path.join(CUSTOM_VOICE_REFERENCE_ROOT, path.basename(filename));
}

export async function saveCustomVoiceReference(input: {
  filename?: string;
  mimeType?: string;
  base64: string;
}) {
  const mimeType = (input.mimeType || "audio/wav").trim();
  const fallbackName = `custom-voice-${Date.now()}`;
  const requestedName = sanitizeSegment(input.filename || fallbackName, fallbackName);
  const ext = path.extname(requestedName) || extensionFromMimeType(mimeType);
  const basename = path.basename(requestedName, path.extname(requestedName)) || fallbackName;
  const finalFilename = `${basename}${ext}`;
  const absolutePath = buildCustomVoiceReferenceAbsolutePath(finalFilename);

  await fs.mkdir(CUSTOM_VOICE_REFERENCE_ROOT, { recursive: true });
  await fs.writeFile(absolutePath, Buffer.from(input.base64, "base64"));

  return {
    filename: finalFilename,
    absolutePath,
    relativeUrl: `/api/custom-voice-reference/file/${encodeURIComponent(finalFilename)}`,
    mimeType,
  };
}

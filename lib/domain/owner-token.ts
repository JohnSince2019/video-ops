import crypto from "node:crypto";

export type OwnerTokenInput = {
  ownerToken?: string | null;
};

export function normalizeOwnerToken(input: OwnerTokenInput) {
  const token = input.ownerToken?.trim();
  if (!token) {
    throw new Error("X-Owner-Token header is required");
  }
  return token;
}

export function hashOwnerToken(ownerToken: string) {
  return crypto.createHash("sha256").update(ownerToken).digest("hex");
}

export function resolveOwnerTokenHash(input: OwnerTokenInput) {
  return hashOwnerToken(normalizeOwnerToken(input));
}

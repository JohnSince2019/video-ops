export type AssetType = "image" | "broll" | "audio" | "video" | "subtitle";

export type AssetCacheKey = {
  assetType: AssetType;
  hashKey: string;
};

export type AssetCacheRecord<T> = {
  key: AssetCacheKey;
  value: T;
  expiresAt?: number;
};

export function buildAssetCacheKey(key: AssetCacheKey) {
  return `${key.assetType}:${key.hashKey}`;
}

export class MemoryAssetCache<T> {
  private readonly store = new Map<string, { value: T; expiresAt?: number }>();

  get(key: AssetCacheKey, now = Date.now()) {
    const stored = this.store.get(buildAssetCacheKey(key));
    if (!stored) {
      return undefined;
    }

    if (stored.expiresAt !== undefined && stored.expiresAt <= now) {
      this.store.delete(buildAssetCacheKey(key));
      return undefined;
    }

    return stored.value;
  }

  set(record: AssetCacheRecord<T>) {
    this.store.set(buildAssetCacheKey(record.key), {
      value: record.value,
      expiresAt: record.expiresAt,
    });
    return record.value;
  }

  has(key: AssetCacheKey, now = Date.now()) {
    return this.get(key, now) !== undefined;
  }

  clear() {
    this.store.clear();
  }
}

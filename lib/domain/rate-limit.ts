export type RateLimitStore = {
  get(key: string): number[];
  set(key: string, timestamps: number[]): void;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  reason?: "rate_limited";
  message: string;
};

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly data = new Map<string, number[]>();

  get(key: string) {
    return this.data.get(key) ?? [];
  }

  set(key: string, timestamps: number[]) {
    this.data.set(key, timestamps);
  }
}

export function evaluateRateLimit(params: {
  ip: string;
  now: number;
  limit?: number;
  windowMs?: number;
  store: RateLimitStore;
}): RateLimitResult {
  const limit = params.limit ?? 20;
  const windowMs = params.windowMs ?? 60_000;
  const key = `ip:${params.ip}`;
  const windowStart = params.now - windowMs;
  const recent = params.store.get(key).filter((value) => value > windowStart);

  if (recent.length >= limit) {
    const oldest = recent[0] ?? params.now;
    return {
      allowed: false,
      remaining: 0,
      resetAt: oldest + windowMs,
      reason: "rate_limited",
      message: `IP ${params.ip} exceeded ${limit} requests per minute.`,
    };
  }

  const next = [...recent, params.now];
  params.store.set(key, next);

  return {
    allowed: true,
    remaining: Math.max(0, limit - next.length),
    resetAt: (next[0] ?? params.now) + windowMs,
    message: `IP ${params.ip} is within the rate limit.`,
  };
}

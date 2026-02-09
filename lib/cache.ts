import { Redis } from "@upstash/redis";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

export async function getCachedJson<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  const value = await redis.get<T>(key);
  return value ?? null;
}

export async function setCachedJson<T>(key: string, value: T, ttlSeconds: number) {
  if (!redis) return;
  await redis.set(key, value, { ex: ttlSeconds });
}

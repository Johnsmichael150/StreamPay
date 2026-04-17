// Feature: stream-pay-africa
// FX rate fetcher with Redis cache
// Requirements: 7.2, 7.3, 7.4

import type { Redis } from 'ioredis';
import type { FXRates } from '@streampay/shared';

const REDIS_KEY = 'fx:rates';
const CACHE_TTL_SECONDS = 60 * 60; // 60 minutes
const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours — serve stale up to this age
const FX_API_URL = 'https://open.er-api.com/v6/latest/USD';

export interface FXResponse {
  rates: FXRates;
  usdc_only: boolean; // true when rates unavailable and no valid cache
}

/** Fetch live rates from external API */
async function fetchLiveRates(): Promise<FXRates> {
  const res = await fetch(FX_API_URL);
  if (!res.ok) throw new Error(`FX API responded ${res.status}`);
  const data = (await res.json()) as { rates: Record<string, number> };
  const { rates } = data;
  if (!rates.NGN || !rates.KES || !rates.GHS) {
    throw new Error('FX API missing required currency rates');
  }
  return {
    NGN: rates.NGN,
    KES: rates.KES,
    GHS: rates.GHS,
    fetchedAt: Date.now(),
  };
}

/** Read cached rates from Redis. Returns null if nothing cached. */
async function readCache(redis: Redis): Promise<FXRates | null> {
  const raw = await redis.hgetall(REDIS_KEY);
  if (!raw || !raw.NGN || !raw.KES || !raw.GHS || !raw.fetchedAt) return null;
  return {
    NGN: parseFloat(raw.NGN),
    KES: parseFloat(raw.KES),
    GHS: parseFloat(raw.GHS),
    fetchedAt: parseInt(raw.fetchedAt, 10),
  };
}

/** Write rates to Redis with 60-minute TTL */
async function writeCache(redis: Redis, rates: FXRates): Promise<void> {
  await redis.hset(REDIS_KEY, {
    NGN: rates.NGN.toString(),
    KES: rates.KES.toString(),
    GHS: rates.GHS.toString(),
    fetchedAt: rates.fetchedAt.toString(),
  });
  await redis.expire(REDIS_KEY, CACHE_TTL_SECONDS);
}

/**
 * Returns true if the cached rate is older than 60 minutes.
 * Requirement 7.3: cache must not be used beyond 60 minutes without refresh.
 */
export function isStale(rates: FXRates, nowMs: number = Date.now()): boolean {
  return nowMs - rates.fetchedAt >= CACHE_TTL_SECONDS * 1000;
}

/**
 * Get FX rates:
 * 1. Try Redis cache — if fresh (< 60 min), return it.
 * 2. Fetch live rates, cache them, return them.
 * 3. On fetch failure: serve stale cache if < 2 hours old.
 * 4. Otherwise return usdc_only flag.
 */
export async function getFXRates(redis: Redis): Promise<FXResponse> {
  const cached = await readCache(redis);

  // Cache hit and still fresh
  if (cached && !isStale(cached)) {
    return { rates: cached, usdc_only: false };
  }

  // Try to fetch fresh rates
  try {
    const fresh = await fetchLiveRates();
    await writeCache(redis, fresh);
    return { rates: fresh, usdc_only: false };
  } catch {
    // Fetch failed — serve stale cache if within 2-hour window
    if (cached && Date.now() - cached.fetchedAt < STALE_THRESHOLD_MS) {
      return { rates: cached, usdc_only: false };
    }
    // No usable cache — USDC-only mode
    return {
      rates: { NGN: 0, KES: 0, GHS: 0, fetchedAt: 0 },
      usdc_only: true,
    };
  }
}

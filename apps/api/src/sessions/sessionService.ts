// Feature: stream-pay-africa
// Session management: creation, storage, and JWT signing
// Requirements: 9.1, 9.2

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { v4 as uuidv4 } from 'uuid';
import type { Redis } from 'ioredis';
import type { Session } from '@streampay/shared';
import { config } from '../config/env';

const SESSION_TTL_SECONDS = 24 * 60 * 60; // 24 hours

export interface CreateSessionInput {
  creatorId: string;
  consumerId: string;   // Stellar public key
  contentId: string;
  contentType: 'article' | 'video' | 'api';
  ratePerSecond: number;
}

export interface SessionTokenPayload extends JWTPayload {
  sessionId: string;
  creatorId: string;
  consumerId: string;
  contentId: string;
  ratePerSecond: number;
}

function redisKey(sessionId: string): string {
  return `session:${sessionId}`;
}

function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(config.jwtSecret);
}

/** Create a new session, store in Redis, return signed JWT */
export async function createSession(
  redis: Redis,
  input: CreateSessionInput
): Promise<{ session: Session; token: string }> {
  const sessionId = uuidv4();
  const now = Date.now();

  const session: Session = {
    id: sessionId,
    creatorId: input.creatorId,
    consumerId: input.consumerId,
    contentId: input.contentId,
    contentType: input.contentType,
    ratePerSecond: input.ratePerSecond,
    startedAt: now,
    status: 'active',
    totalSeconds: 0,
    unsettledUSDC: 0,
    settledUSDC: 0,
  };

  // Store session in Redis hash with 24h TTL
  await redis.hset(redisKey(sessionId), {
    id: session.id,
    creatorId: session.creatorId,
    consumerId: session.consumerId,
    contentId: session.contentId,
    contentType: session.contentType,
    ratePerSecond: session.ratePerSecond.toString(),
    startedAt: session.startedAt.toString(),
    status: session.status,
    totalSeconds: '0',
    unsettledUSDC: '0',
    settledUSDC: '0',
  });
  await redis.expire(redisKey(sessionId), SESSION_TTL_SECONDS);

  // Sign JWT with jose — expiry 24h
  const token = await new SignJWT({
    sessionId,
    creatorId: input.creatorId,
    consumerId: input.consumerId,
    contentId: input.contentId,
    ratePerSecond: input.ratePerSecond,
  } satisfies Omit<SessionTokenPayload, keyof JWTPayload>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getJwtSecret());

  return { session, token };
}

/** Verify a session JWT and return its payload. Throws on invalid/expired token. */
export async function verifySessionToken(token: string): Promise<SessionTokenPayload> {
  const { payload } = await jwtVerify(token, getJwtSecret());
  return payload as SessionTokenPayload;
}

/** Read a session from Redis. Returns null if not found. */
export async function getSession(redis: Redis, sessionId: string): Promise<Session | null> {
  const raw = await redis.hgetall(redisKey(sessionId));
  if (!raw || !raw.id) return null;

  return {
    id: raw.id,
    creatorId: raw.creatorId,
    consumerId: raw.consumerId,
    contentId: raw.contentId,
    contentType: raw.contentType as Session['contentType'],
    ratePerSecond: parseFloat(raw.ratePerSecond),
    startedAt: parseInt(raw.startedAt, 10),
    endedAt: raw.endedAt ? parseInt(raw.endedAt, 10) : undefined,
    status: raw.status as Session['status'],
    totalSeconds: parseInt(raw.totalSeconds, 10),
    unsettledUSDC: parseFloat(raw.unsettledUSDC),
    settledUSDC: parseFloat(raw.settledUSDC),
    lastSettledAt: raw.lastSettledAt ? parseInt(raw.lastSettledAt, 10) : undefined,
  };
}

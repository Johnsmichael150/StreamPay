// Feature: stream-pay-africa
// Unit tests for session service
// Requirements: 9.1, 9.2, 9.3

import { createSession, verifySessionToken, getSession } from './sessionService';

// Minimal Redis mock
function makeRedisMock() {
  const store: Record<string, Record<string, string>> = {};
  const ttls: Record<string, number> = {};
  return {
    hset: jest.fn(async (key: string, fields: Record<string, string>) => {
      store[key] = { ...(store[key] ?? {}), ...fields };
    }),
    expire: jest.fn(async (key: string, ttl: number) => {
      ttls[key] = ttl;
    }),
    hgetall: jest.fn(async (key: string) => store[key] ?? null),
    _store: store,
    _ttls: ttls,
  };
}

const baseInput = {
  creatorId: 'creator-1',
  consumerId: 'GCONSUMER123',
  contentId: 'content-abc',
  contentType: 'article' as const,
  ratePerSecond: 0.002,
};

describe('createSession', () => {
  it('returns a session with correct fields and a JWT token', async () => {
    const redis = makeRedisMock() as any;
    const { session, token } = await createSession(redis, baseInput);

    expect(session.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(session.creatorId).toBe(baseInput.creatorId);
    expect(session.consumerId).toBe(baseInput.consumerId);
    expect(session.contentId).toBe(baseInput.contentId);
    expect(session.ratePerSecond).toBe(baseInput.ratePerSecond);
    expect(session.status).toBe('active');
    expect(session.totalSeconds).toBe(0);
    expect(session.unsettledUSDC).toBe(0);
    expect(session.settledUSDC).toBe(0);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // valid JWT structure
  });

  it('stores session in Redis with 24h TTL', async () => {
    const redis = makeRedisMock() as any;
    const { session } = await createSession(redis, baseInput);

    expect(redis.hset).toHaveBeenCalledWith(
      `session:${session.id}`,
      expect.objectContaining({ id: session.id, status: 'active' })
    );
    expect(redis.expire).toHaveBeenCalledWith(`session:${session.id}`, 86400);
  });
});

describe('verifySessionToken', () => {
  it('returns the correct payload for a valid token', async () => {
    const redis = makeRedisMock() as any;
    const { session, token } = await createSession(redis, baseInput);
    const payload = await verifySessionToken(token);

    expect(payload.sessionId).toBe(session.id);
    expect(payload.creatorId).toBe(baseInput.creatorId);
    expect(payload.consumerId).toBe(baseInput.consumerId);
    expect(payload.contentId).toBe(baseInput.contentId);
    expect(payload.ratePerSecond).toBe(baseInput.ratePerSecond);
  });

  it('throws for an invalid token', async () => {
    await expect(verifySessionToken('not.a.valid.token')).rejects.toThrow();
  });

  it('throws for a tampered token', async () => {
    const redis = makeRedisMock() as any;
    const { token } = await createSession(redis, baseInput);
    const tampered = token.slice(0, -5) + 'XXXXX';
    await expect(verifySessionToken(tampered)).rejects.toThrow();
  });
});

describe('getSession', () => {
  it('returns the session stored in Redis', async () => {
    const redis = makeRedisMock() as any;
    const { session } = await createSession(redis, baseInput);
    const fetched = await getSession(redis, session.id);

    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(session.id);
    expect(fetched!.ratePerSecond).toBe(baseInput.ratePerSecond);
    expect(fetched!.status).toBe('active');
  });

  it('returns null for a non-existent session', async () => {
    const redis = makeRedisMock() as any;
    const result = await getSession(redis, 'non-existent-id');
    expect(result).toBeNull();
  });
});

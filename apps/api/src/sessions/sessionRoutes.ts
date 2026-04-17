// Feature: stream-pay-africa
// Session routes: POST /api/v1/sessions, POST /api/v1/sessions/:id/events
// Requirements: 9.1, 9.2, 9.3

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Redis } from 'ioredis';
import { createSession, verifySessionToken, getSession } from './sessionService';
import type { CreateSessionInput } from './sessionService';

interface CreateSessionBody {
  creatorId: string;
  consumerId: string;
  contentId: string;
  contentType: 'article' | 'video' | 'api';
  ratePerSecond: number;
}

interface UsageEventBody {
  sessionId: string;
  eventType: 'tick' | 'pause' | 'resume' | 'end';
  elapsedSeconds: number;
  scrollDepth?: number;
  timestamp: number;
}

/** Extract Bearer token from Authorization header */
function extractBearerToken(req: FastifyRequest): string | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

/** Middleware: verify session JWT on /sessions/:id/events requests */
async function sessionAuthMiddleware(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) {
    return reply.status(401).send({ error: 'Missing session token' });
  }
  try {
    const payload = await verifySessionToken(token);
    // Attach payload to request for downstream handlers
    (req as FastifyRequest & { sessionPayload: typeof payload }).sessionPayload = payload;
  } catch {
    return reply.status(401).send({ error: 'Invalid or expired session token' });
  }
}

export async function sessionRoutes(fastify: FastifyInstance, redis: Redis): Promise<void> {
  // POST /api/v1/sessions — create session and return signed JWT
  fastify.post<{ Body: CreateSessionBody }>(
    '/api/v1/sessions',
    {
      schema: {
        body: {
          type: 'object',
          required: ['creatorId', 'consumerId', 'contentId', 'contentType', 'ratePerSecond'],
          properties: {
            creatorId: { type: 'string' },
            consumerId: { type: 'string' },
            contentId: { type: 'string' },
            contentType: { type: 'string', enum: ['article', 'video', 'api'] },
            ratePerSecond: { type: 'number', minimum: 0.001 },
          },
        },
      },
    },
    async (req, reply) => {
      const input: CreateSessionInput = req.body;
      const { session, token } = await createSession(redis, input);
      return reply.status(201).send({ session, token });
    }
  );

  // GET /api/v1/sessions/:id — get session state
  fastify.get<{ Params: { id: string } }>(
    '/api/v1/sessions/:id',
    async (req, reply) => {
      const session = await getSession(redis, req.params.id);
      if (!session) return reply.status(404).send({ error: 'Session not found' });
      return reply.send(session);
    }
  );

  // POST /api/v1/sessions/:id/events — accept usage events (JWT-protected)
  fastify.post<{ Params: { id: string }; Body: UsageEventBody }>(
    '/api/v1/sessions/:id/events',
    { preHandler: sessionAuthMiddleware },
    async (req, reply) => {
      // Placeholder — full metering logic implemented in task 7
      return reply.status(202).send({ accepted: true });
    }
  );
}

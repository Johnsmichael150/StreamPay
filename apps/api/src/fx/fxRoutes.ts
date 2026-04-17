// Feature: stream-pay-africa
// GET /api/v1/fx/rates route
// Requirements: 7.2, 7.3, 7.4

import type { FastifyInstance } from 'fastify';
import type { Redis } from 'ioredis';
import { getFXRates } from './fxService';

export async function fxRoutes(fastify: FastifyInstance, redis: Redis): Promise<void> {
  fastify.get('/api/v1/fx/rates', async (_req, reply) => {
    const result = await getFXRates(redis);
    if (result.usdc_only) {
      return reply.status(200).send({
        usdc_only: true,
        message: 'Local currency conversion temporarily unavailable',
      });
    }
    return reply.status(200).send({
      usdc_only: false,
      rates: {
        NGN: result.rates.NGN,
        KES: result.rates.KES,
        GHS: result.rates.GHS,
      },
      fetchedAt: result.rates.fetchedAt,
    });
  });
}

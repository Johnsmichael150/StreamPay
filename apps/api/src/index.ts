import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import Redis from 'ioredis';
import { config } from './config/env';
import { fxRoutes } from './fx/fxRoutes';
import { sessionRoutes } from './sessions/sessionRoutes';

const server = Fastify({ logger: true });
const redis = new Redis(config.redisUrl);

async function start() {
  await server.register(cors, { origin: true });
  await server.register(jwt, { secret: config.jwtSecret });

  server.get('/health', async () => ({ status: 'ok', network: config.stellarNetwork }));

  await fxRoutes(server, redis);
  await sessionRoutes(server, redis);

  await server.listen({ port: config.port, host: '0.0.0.0' });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});

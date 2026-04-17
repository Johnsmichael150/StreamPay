# StreamPay Africa

Real-time micropayment monetization for African creators, powered by USDC on the Stellar network.

## What it does

Creators publish content (articles, videos, or APIs) and get paid per second of consumption. Consumers connect their Stellar wallet and stream USDC payments in real time. Earnings are displayed in local currencies (NGN, KES, GHS) using live FX rates.

## Stack

- `apps/web` — Next.js 14 frontend with Freighter wallet integration
- `apps/api` — Fastify API with Redis-backed sessions and FX rate caching
- `packages/shared` — Shared TypeScript types

## Prerequisites

- Node.js 20+
- Redis running locally (`redis://localhost:6379`)
- [Freighter wallet](https://freighter.app) browser extension (for the web app)

## Getting started

```bash
npm install
```

Copy and configure environment variables for the API:

```bash
cp apps/api/.env.example apps/api/.env
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | API server port |
| `STELLAR_NETWORK` | `testnet` | `testnet` or `mainnet` |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `JWT_SECRET` | `dev-secret-change-in-production` | JWT signing secret |
| `SETTLEMENT_INTERVAL_MS` | `15000` | How often to settle on-chain |
| `PLATFORM_FEE_WALLET_KEY` | — | Stellar key for platform fee collection |

Run in development:

```bash
# API (port 3001)
npm run dev:api

# Web (port 3000)
npm run dev:web
```

## Testing

```bash
npm run test:api
```

## Key concepts

- Sessions track streaming consumption with per-second USDC accrual
- FX rates are fetched from [open.er-api.com](https://open.er-api.com) and cached in Redis for 60 minutes; stale rates (up to 2 hours old) are served on fetch failure
- If no usable FX rates exist, the app falls back to USDC-only mode
- Session JWTs expire after 24 hours; session state is stored in Redis

## Project structure

```
apps/
  api/        Fastify API
  web/        Next.js frontend
packages/
  shared/     Shared types (Session, FXRates, Creator, etc.)
```

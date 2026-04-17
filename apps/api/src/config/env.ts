// Environment configuration for StreamPay Africa API
// Validates and exports all required environment variables

const USDC_ISSUER_TESTNET = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const USDC_ISSUER_MAINNET = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

const HORIZON_TESTNET = 'https://horizon-testnet.stellar.org';
const HORIZON_MAINNET = 'https://horizon.stellar.org';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export type StellarNetwork = 'testnet' | 'mainnet';

const network = getEnv('STELLAR_NETWORK', 'testnet') as StellarNetwork;

export const config = {
  // Server
  port: parseInt(getEnv('PORT', '3001'), 10),
  nodeEnv: getEnv('NODE_ENV', 'development'),

  // Stellar
  stellarNetwork: network,
  horizonUrl: getEnv(
    'HORIZON_URL',
    network === 'mainnet' ? HORIZON_MAINNET : HORIZON_TESTNET
  ),
  usdcIssuer: getEnv(
    'USDC_ISSUER',
    network === 'mainnet' ? USDC_ISSUER_MAINNET : USDC_ISSUER_TESTNET
  ),
  platformFeeWalletKey: getEnv('PLATFORM_FEE_WALLET_KEY', ''),

  // Redis
  redisUrl: getEnv('REDIS_URL', 'redis://localhost:6379'),

  // JWT
  jwtSecret: getEnv('JWT_SECRET', 'dev-secret-change-in-production'),
  jwtExpirySeconds: parseInt(getEnv('JWT_EXPIRY_SECONDS', '86400'), 10), // 24h

  // Settlement
  settlementIntervalMs: parseInt(getEnv('SETTLEMENT_INTERVAL_MS', '15000'), 10),
} as const;

export type Config = typeof config;

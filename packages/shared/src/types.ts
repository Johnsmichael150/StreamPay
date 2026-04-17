// Shared TypeScript interfaces for StreamPay Africa
// Feature: stream-pay-africa

export interface Session {
  id: string;                    // UUID v4
  creatorId: string;
  consumerId: string;            // Stellar public key
  contentId: string;
  contentType: 'article' | 'video' | 'api';
  ratePerSecond: number;         // USDC, e.g. 0.002
  startedAt: number;             // Unix ms
  endedAt?: number;
  status: 'active' | 'paused' | 'ended' | 'failed';
  totalSeconds: number;
  unsettledUSDC: number;         // accumulated, not yet on-chain
  settledUSDC: number;           // confirmed on-chain
  lastSettledAt?: number;
}

export interface SettlementRecord {
  id: string;
  sessionId: string;
  txHash: string;
  totalUSDC: number;
  creatorUSDC: number;
  platformFeeUSDC: number;
  feeRate: number;               // 0.01 or 0.02
  submittedAt: number;
  confirmedAt?: number;
  status: 'pending' | 'confirmed' | 'failed';
  retryCount: number;
}

export interface Creator {
  id: string;
  stellarPublicKey: string;
  displayName: string;
  localCurrency: 'NGN' | 'KES' | 'GHS';
  mobileMoney?: {
    provider: 'mpesa' | 'mtn' | 'airtel';
    phoneNumber: string;
  };
  createdAt: number;
}

export interface ContentItem {
  id: string;
  creatorId: string;
  type: 'article' | 'video' | 'api';
  title: string;
  pricingModel: 'pay-per-click' | 'streaming';
  price: number;                 // USDC (fixed for PPC, rate/sec for streaming)
  totalRevenue: number;
  totalSessions: number;
  avgSessionDuration: number;    // seconds
}

export interface FXRates {
  NGN: number;   // USDC → NGN
  KES: number;   // USDC → KES
  GHS: number;   // USDC → GHS
  fetchedAt: number;
}

export type LocalCurrency = 'NGN' | 'KES' | 'GHS';
export type ContentType = 'article' | 'video' | 'api';
export type PricingModel = 'pay-per-click' | 'streaming';
export type SessionStatus = 'active' | 'paused' | 'ended' | 'failed';
export type SettlementStatus = 'pending' | 'confirmed' | 'failed';

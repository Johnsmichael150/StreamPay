'use client';

// Feature: stream-pay-africa
// Implements Freighter wallet connection and USDC balance polling
// Requirements: 1.1, 1.2, 1.3, 1.4

import { useState, useEffect, useCallback, useRef } from 'react';

export interface WalletState {
  connected: boolean;
  publicKey: string | null;
  usdcBalance: number | null;
  network: 'mainnet' | 'testnet';
  freighterInstalled: boolean;
  loading: boolean;
  error: string | null;
}

const HORIZON_TESTNET = 'https://horizon-testnet.stellar.org';
const HORIZON_MAINNET = 'https://horizon.stellar.org';
const BALANCE_POLL_INTERVAL_MS = 10_000;

async function fetchUsdcBalance(publicKey: string, horizonUrl: string): Promise<number | null> {
  const res = await fetch(`${horizonUrl}/accounts/${publicKey}`);
  if (!res.ok) return null;
  const data = await res.json();
  const usdcEntry = (data.balances as Array<{ asset_code?: string; balance: string }>).find(
    (b) => b.asset_code === 'USDC'
  );
  return usdcEntry ? parseFloat(usdcEntry.balance) : 0;
}

function isFreighterInstalled(): boolean {
  return typeof window !== 'undefined' && typeof (window as Window & { freighter?: unknown }).freighter !== 'undefined';
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    connected: false,
    publicKey: null,
    usdcBalance: null,
    network: 'testnet',
    freighterInstalled: false,
    loading: false,
    error: null,
  });

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Detect Freighter on mount
  useEffect(() => {
    setState((s) => ({ ...s, freighterInstalled: isFreighterInstalled() }));
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const refreshBalance = useCallback(async (publicKey: string, network: 'mainnet' | 'testnet') => {
    const horizonUrl = network === 'mainnet' ? HORIZON_MAINNET : HORIZON_TESTNET;
    const balance = await fetchUsdcBalance(publicKey, horizonUrl);
    setState((s) => (s.connected ? { ...s, usdcBalance: balance } : s));
  }, []);

  const startPolling = useCallback(
    (publicKey: string, network: 'mainnet' | 'testnet') => {
      stopPolling();
      pollRef.current = setInterval(() => {
        refreshBalance(publicKey, network);
      }, BALANCE_POLL_INTERVAL_MS);
    },
    [stopPolling, refreshBalance]
  );

  const connect = useCallback(async () => {
    if (!isFreighterInstalled()) {
      setState((s) => ({
        ...s,
        freighterInstalled: false,
        error: 'Freighter wallet is not installed. Please install it from https://freighter.app',
      }));
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      const { isConnected, requestAccess, getAddress, getNetworkDetails } = await import(
        '@stellar/freighter-api'
      );

      const connected = await isConnected();
      if (!connected) {
        await requestAccess();
      }

      const addressResult = await getAddress();
      const publicKey = addressResult.address;
      const networkDetails = await getNetworkDetails();
      const network: 'mainnet' | 'testnet' =
        networkDetails.networkPassphrase?.includes('Public') ? 'mainnet' : 'testnet';

      const horizonUrl = network === 'mainnet' ? HORIZON_MAINNET : HORIZON_TESTNET;
      const usdcBalance = await fetchUsdcBalance(publicKey, horizonUrl);

      setState({
        connected: true,
        publicKey,
        usdcBalance,
        network,
        freighterInstalled: true,
        loading: false,
        error: null,
      });

      startPolling(publicKey, network);
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to connect wallet',
      }));
    }
  }, [startPolling]);

  const disconnect = useCallback(() => {
    stopPolling();
    setState({
      connected: false,
      publicKey: null,
      usdcBalance: null,
      network: 'testnet',
      freighterInstalled: isFreighterInstalled(),
      loading: false,
      error: null,
    });
  }, [stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return { ...state, connect, disconnect };
}

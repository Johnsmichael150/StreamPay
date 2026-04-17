'use client';

// Feature: stream-pay-africa
// WalletButton component — connect/disconnect Freighter wallet, display balance
// Requirements: 1.2, 1.5, 1.6

import { useWallet } from '@/hooks/useWallet';

/** Truncate a Stellar public key for display: first 4 + last 4 chars */
function truncateKey(key: string): string {
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

/** Format USDC balance to exactly 6 decimal places */
export function formatUsdcBalance(balance: number): string {
  return balance.toFixed(6);
}

export default function WalletButton() {
  const { connected, publicKey, usdcBalance, freighterInstalled, loading, error, connect, disconnect } =
    useWallet();

  if (!freighterInstalled) {
    return (
      <div>
        <p>
          Freighter wallet is not installed.{' '}
          <a href="https://freighter.app" target="_blank" rel="noopener noreferrer">
            Install Freighter
          </a>
        </p>
      </div>
    );
  }

  if (connected && publicKey !== null) {
    return (
      <div>
        <span>{truncateKey(publicKey)}</span>
        <span>{usdcBalance !== null ? `${formatUsdcBalance(usdcBalance)} USDC` : '...'}</span>
        <button onClick={disconnect}>Disconnect</button>
      </div>
    );
  }

  return (
    <div>
      {error && <p role="alert">{error}</p>}
      <button onClick={connect} disabled={loading}>
        {loading ? 'Connecting...' : 'Connect Wallet'}
      </button>
    </div>
  );
}

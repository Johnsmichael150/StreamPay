import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'StreamPay Africa',
  description: 'Real-time monetization for African creators powered by USDC on Stellar',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { ReactNode } from 'react';
import '@promql-validator/react/styles.css';

export const metadata = {
  title: 'promql-validator — Next.js App Router example',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 780, margin: '40px auto', padding: '0 24px' }}>{children}</body>
    </html>
  );
}

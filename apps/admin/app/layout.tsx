import type { ReactNode } from 'react';
import { Sarabun } from 'next/font/google';
import './globals.css';

const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sarabun',
  display: 'swap',
});

export const metadata = {
  title: 'School Coupon Admin',
  description: 'School staff card administration',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="th" className={sarabun.variable}>
      <body
        style={{
          margin: 0,
          background: '#eef4fb',
          color: '#0f172a',
          fontFamily: "var(--font-sarabun), 'TH Sarabun New', 'Sarabun', system-ui, sans-serif",
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        {children}
      </body>
    </html>
  );
}

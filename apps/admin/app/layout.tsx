import type { ReactNode } from 'react';

export const metadata = {
  title: 'School Coupon Admin',
  description: 'School staff card administration',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="th">
      <body
        style={{
          margin: 0,
          background: '#eef4fb',
          color: '#0f172a',
          fontFamily: "'Noto Sans Thai', 'Sarabun', system-ui, -apple-system, sans-serif",
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        {children}
      </body>
    </html>
  );
}

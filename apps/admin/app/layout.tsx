import type { ReactNode } from 'react';

export const metadata = {
  title: 'School Coupon Admin',
  description: 'School staff card administration',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}

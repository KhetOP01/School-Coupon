import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminDashboard from './admin-dashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const cookieHeader = (await cookies()).toString();
  const authApiOrigin = process.env.AUTH_API_ORIGIN ?? 'http://127.0.0.1:3000';
  const response = await fetch(new URL('/admin/auth/session', authApiOrigin), {
    headers: { cookie: cookieHeader },
    cache: 'no-store',
  });

  if (response.status === 401) {
    redirect('/admin/auth/oidc/start');
  }
  if (!response.ok) {
    throw new Error(`Staff session check failed with HTTP ${response.status}.`);
  }

  const session = (await response.json()) as { expiresAt?: string };

  return <AdminDashboard sessionExpiry={session.expiresAt} />;
}

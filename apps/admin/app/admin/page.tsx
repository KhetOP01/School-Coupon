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
    redirect('/admin/login');
  }
  if (!response.ok) {
    redirect('/admin/login?error=session_error');
  }

  const session = (await response.json()) as {
    username?: string;
    fullName?: string;
    role?: 'staff' | 'admin';
    expiresAt?: string;
  };

  return (
    <AdminDashboard
      sessionExpiry={session.expiresAt}
      sessionUser={{
        username: session.username ?? 'admin',
        fullName: session.fullName ?? 'Staff Admin',
        role: session.role ?? 'staff',
      }}
    />
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ logged_out?: string; error?: string }>;
}) {
  const params = await searchParams;
  const isLoggedOut = params.logged_out === '1';
  const hasError = params.error;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        padding: '1.5rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          padding: '2.25rem 2rem',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏫</div>
          <h1 style={{ fontSize: '1.35rem', margin: '0 0 0.5rem 0', color: '#0f172a', fontWeight: 700 }}>
            ระบบจัดการคูปองดิจิทัลโรงเรียน
          </h1>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
            School Cashless RFID Administration Portal (Staff Admin)
          </p>
        </div>

        {isLoggedOut && (
          <div
            style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              color: '#065f46',
              fontSize: '0.875rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>✅</span>
            <span>คุณได้ออกจากระบบเรียบร้อยแล้ว</span>
          </div>
        )}

        {hasError && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              color: '#991b1b',
              fontSize: '0.875rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>⚠️</span>
            <span>เซสชันหมดอายุหรือไม่พบสิทธิ์การใช้งาน กรุณาเข้าสู่ระบบใหม่</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <a
            href="/dev-login"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.85rem 1rem',
              background: '#2563eb',
              color: '#ffffff',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.95rem',
              transition: 'background 0.15s ease',
            }}
          >
            <span>⚡</span>
            <span>เข้าสู่ระบบโหมดทดสอบ (Dev Fast Login)</span>
          </a>
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>
            * สำหรับการพัฒนาและทดสอบระบบ เข้าใช้งานในฐานะเจ้าหน้าที่ทันที
          </p>

          <div style={{ display: 'flex', alignItems: 'center', margin: '0.5rem 0' }}>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            <span style={{ padding: '0 0.75rem', fontSize: '0.75rem', color: '#94a3b8' }}>หรือ</span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          </div>

          <a
            href="/admin/auth/oidc/start"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              background: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: '0.9rem',
            }}
          >
            <span>🔐</span>
            <span>เข้าสู่ระบบด้วย SSO โรงเรียน (School OIDC)</span>
          </a>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
            (ต้องเชื่อมต่อ Identity Provider ของโรงเรียนบน Production)
          </p>
        </div>
      </div>
    </div>
  );
}

import LoginForm from './login-form';

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
        background: 'linear-gradient(180deg, #ddeaf9 0%, #edf3fb 260px, #f4f7fc 100%)',
        padding: '1.75rem 1.25rem',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Subtle Ambient Radial Glow matching AdminDashboard */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: '-60px',
          top: '-40px',
          width: '420px',
          height: '260px',
          pointerEvents: 'none',
          opacity: 0.45,
          background:
            'radial-gradient(circle at 70% 40%, rgba(59, 130, 246, 0.25), transparent 70%)',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: '860px',
          background: '#ffffff',
          borderRadius: '18px',
          boxShadow: '0 14px 36px rgba(16, 32, 68, 0.12), 0 4px 14px rgba(15, 23, 42, 0.05)',
          border: '1px solid #dbe6f5',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Left Navy Brand Panel matching AdminDashboard Sidebar */}
        <aside
          style={{
            background: 'linear-gradient(180deg, #1b3161 0%, #102044 100%)',
            color: '#ffffff',
            padding: '2.5rem 2rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(147, 197, 253, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <svg width="48" height="48" viewBox="0 0 64 64" fill="none">
                <path d="M32 6V16" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M32 6H42L39 10L42 14H32V6Z" fill="#f97316" />
                <path d="M18 28L32 18L46 28V52H18V28Z" fill="#ffffff" />
                <path d="M8 34L18 28V52H8V34Z" fill="#dbeafe" />
                <path d="M56 34L46 28V52H56V34Z" fill="#dbeafe" />
                <circle cx="32" cy="27" r="3" fill="#1e3a8a" />
                <rect x="28" y="38" width="8" height="14" rx="1" fill="#1e3a8a" />
                <rect x="22" y="33" width="4" height="5" rx="0.5" fill="#1e3a8a" />
                <rect x="38" y="33" width="4" height="5" rx="0.5" fill="#1e3a8a" />
              </svg>
            </div>

            <h1
              style={{
                fontSize: '1.45rem',
                fontWeight: 700,
                lineHeight: 1.35,
                margin: '0 0 0.45rem 0',
                color: '#ffffff',
              }}
            >
              ระบบจัดการคูปองดิจิทัลโรงเรียน
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: '0.84rem',
                color: '#bfdbfe',
                lineHeight: 1.5,
              }}
            >
              School Cashless RFID Administration Portal
            </p>

            <div
              style={{
                marginTop: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
              }}
            >
              {[
                'ทะเบียนนักเรียนและยอดคงเหลือ',
                'ออกบัตร RFID ใหม่ และจัดการอายัดบัตร',
                'ตรวจสอบและอนุมัติยอดโอนร้านค้า',
              ].map((item) => (
                <div
                  key={item}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    fontSize: '0.82rem',
                    color: '#e2e8f0',
                  }}
                >
                  <span
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '9999px',
                      background: 'rgba(59, 130, 246, 0.28)',
                      border: '1px solid rgba(147, 197, 253, 0.35)',
                      color: '#93c5fd',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom School Silhouette & Version matching AdminDashboard */}
          <div style={{ position: 'relative', paddingTop: '3.5rem', marginTop: '1rem' }}>
            <svg
              width="195"
              height="112"
              viewBox="0 0 180 110"
              fill="none"
              style={{
                position: 'absolute',
                right: '-18px',
                bottom: '-18px',
                opacity: 0.09,
                pointerEvents: 'none',
              }}
            >
              <path d="M55 42L90 18L125 42V108H55V42Z" fill="#ffffff" />
              <path d="M22 58L55 42V108H22V58Z" fill="#ffffff" />
              <path d="M158 58L125 42V108H158V58Z" fill="#ffffff" />
              <rect x="82" y="72" width="16" height="36" fill="#102044" />
            </svg>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: '#94a3b8',
                position: 'relative',
              }}
            >
              <span>Staff Admin Portal</span>
              <span>v1.0.0</span>
            </div>
          </div>
        </aside>

        {/* Right Login Form Panel */}
        <div
          style={{
            padding: '2.5rem 2.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            background: '#ffffff',
          }}
        >
          <div style={{ marginBottom: '1.65rem' }}>
            <h2
              style={{
                fontSize: '1.45rem',
                margin: '0 0 0.4rem 0',
                color: '#0f172a',
                fontWeight: 700,
              }}
            >
              เข้าสู่ระบบเจ้าหน้าที่
            </h2>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5 }}>
              กรอกชื่อผู้ใช้และรหัสผ่านเพื่อเข้าสู่หน้าจัดการระบบโรงเรียน
            </p>
          </div>

          <LoginForm isLoggedOut={isLoggedOut} hasSessionError={Boolean(hasError)} />
        </div>
      </div>
    </div>
  );
}

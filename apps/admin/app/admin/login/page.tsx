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
        background: 'linear-gradient(135deg, #e7f0fd 0%, #f5f9ff 52%, #e4eefc 100%)',
        padding: '2rem 1.25rem',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Decorative Background Waves & Dot Grids */}
      <svg
        aria-hidden="true"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <path
          d="M0 0 H540 C420 180 280 240 0 290 Z"
          fill="rgba(255, 255, 255, 0.55)"
        />
        <path
          d="M1440 0 H980 C1120 130 1290 190 1440 210 Z"
          fill="rgba(191, 219, 254, 0.32)"
        />
        <path
          d="M0 700 C260 660 440 760 680 900 H0 Z"
          fill="rgba(191, 219, 254, 0.35)"
        />
        <path
          d="M840 900 C1040 790 1240 710 1440 730 V900 Z"
          fill="rgba(255, 255, 255, 0.65)"
        />
        <circle cx="1180" cy="210" r="220" fill="rgba(219, 234, 254, 0.38)" />
        <circle cx="240" cy="680" r="190" fill="rgba(219, 234, 254, 0.34)" />
      </svg>

      {/* Subtle Top-Left & Bottom-Right Dot Grids */}
      <svg
        aria-hidden="true"
        width="96"
        height="76"
        viewBox="0 0 96 76"
        style={{
          position: 'absolute',
          left: '28px',
          top: '36px',
          opacity: 0.32,
          pointerEvents: 'none',
        }}
      >
        {[0, 1, 2, 3].map((row) =>
          [0, 1, 2, 3, 4].map((col) => (
            <circle
              key={`tl-${row}-${col}`}
              cx={8 + col * 19}
              cy={8 + row * 19}
              r="3"
              fill="#cbd5e1"
            />
          )),
        )}
      </svg>

      <svg
        aria-hidden="true"
        width="96"
        height="76"
        viewBox="0 0 96 76"
        style={{
          position: 'absolute',
          right: '32px',
          bottom: '32px',
          opacity: 0.35,
          pointerEvents: 'none',
        }}
      >
        {[0, 1, 2, 3].map((row) =>
          [0, 1, 2, 3, 4].map((col) => (
            <circle
              key={`br-${row}-${col}`}
              cx={8 + col * 19}
              cy={8 + row * 19}
              r="3"
              fill="#cbd5e1"
            />
          )),
        )}
      </svg>

      {/* Main Split Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '940px',
          background: '#ffffff',
          borderRadius: '24px',
          boxShadow:
            '0 24px 60px rgba(21, 56, 128, 0.14), 0 4px 16px rgba(15, 23, 42, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.9)',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Left Royal Blue Brand & Illustration Panel */}
        <aside
          style={{
            background: 'linear-gradient(155deg, #1b56d8 0%, #1441ab 55%, #0e3285 100%)',
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
            minHeight: '500px',
          }}
        >
          {/* Soft internal diagonal wave shapes */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '-90px',
              right: '-90px',
              width: '300px',
              height: '300px',
              borderRadius: '9999px',
              background: 'radial-gradient(circle, rgba(96, 165, 250, 0.24) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              bottom: '80px',
              left: '-80px',
              width: '260px',
              height: '260px',
              borderRadius: '9999px',
              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.22) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* Top Brand + Feature Bullets */}
          <div style={{ padding: '2.25rem 2rem 0.5rem', position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.95rem', marginBottom: '2rem' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '14px',
                  background: 'rgba(255, 255, 255, 0.14)',
                  border: '1px solid rgba(191, 219, 254, 0.28)',
                  boxShadow: '0 8px 20px rgba(10, 28, 76, 0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="38" height="38" viewBox="0 0 64 64" fill="none">
                  <path d="M32 7V17" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M32 7H43L40 11L43 15H32V7Z" fill="#ef4444" />
                  <path d="M18 28L32 18L46 28V52H18V28Z" fill="#ffffff" />
                  <path d="M8 34L18 28V52H8V34Z" fill="#dbeafe" />
                  <path d="M56 34L46 28V52H56V34Z" fill="#dbeafe" />
                  <circle cx="32" cy="27" r="3.2" fill="#1e3a8a" />
                  <rect x="28" y="38" width="8" height="14" rx="1.5" fill="#1e3a8a" />
                  <rect x="22" y="33" width="4" height="5" rx="0.8" fill="#3b82f6" />
                  <rect x="38" y="33" width="4" height="5" rx="0.8" fill="#3b82f6" />
                </svg>
              </div>
              <div>
                <h1
                  style={{
                    fontSize: '1.28rem',
                    fontWeight: 700,
                    lineHeight: 1.3,
                    margin: 0,
                    color: '#ffffff',
                  }}
                >
                  ระบบจัดการคูปองดิจิทัลโรงเรียน
                </h1>
                <p
                  style={{
                    margin: '0.2rem 0 0 0',
                    fontSize: '0.84rem',
                    color: '#dbeafe',
                    fontWeight: 400,
                  }}
                >
                  สำหรับผู้ดูแลระบบ (Admin)
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <span
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '9999px',
                    background: 'rgba(255, 255, 255, 0.16)',
                    border: '1px solid rgba(255, 255, 255, 0.22)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="4" y="13" width="3.5" height="7" rx="1" />
                    <rect x="10.25" y="8" width="3.5" height="12" rx="1" />
                    <rect x="16.5" y="4" width="3.5" height="16" rx="1" />
                  </svg>
                </span>
                <span style={{ fontSize: '0.9rem', color: '#f1f5f9', fontWeight: 500 }}>
                  จัดการข้อมูลนักเรียนและการใช้งานคูปอง
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <span
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '9999px',
                    background: 'rgba(255, 255, 255, 0.16)',
                    border: '1px solid rgba(255, 255, 255, 0.22)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 7H5a2 2 0 0 1 0-4h14v2H5v.01h16V7zm-2 2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h15a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2zm-2.5 7.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
                  </svg>
                </span>
                <span style={{ fontSize: '0.9rem', color: '#f1f5f9', fontWeight: 500 }}>
                  ตรวจสอบธุรกรรมและยอดเติมเงิน
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <span
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '9999px',
                    background: 'rgba(255, 255, 255, 0.16)',
                    border: '1px solid rgba(255, 255, 255, 0.22)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
                  </svg>
                </span>
                <span style={{ fontSize: '0.9rem', color: '#f1f5f9', fontWeight: 500 }}>
                  ตั้งค่าระบบและดูแลการใช้งาน
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Illustration: Laptop Analytics + School Building with Thai Flag */}
          <div style={{ position: 'relative', width: '100%', marginTop: '0.75rem', lineHeight: 0 }}>
            <svg
              aria-hidden="true"
              viewBox="0 0 470 215"
              fill="none"
              style={{ width: '100%', height: 'auto', display: 'block' }}
            >
              <defs>
                <linearGradient id="groundGrad" x1="0" y1="0" x2="470" y2="215" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.88" />
                </linearGradient>
                <linearGradient id="screenGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#eff6ff" />
                </linearGradient>
              </defs>

              {/* Rolling hills / lawn */}
              <path d="M0 158 C100 132 180 170 280 152 C350 138 415 130 470 144 V215 H0 Z" fill="url(#groundGrad)" />
              <path d="M180 215 C240 165 340 150 470 168 V215 Z" fill="#bfdbfe" fillOpacity="0.55" />

              {/* Bushes behind school */}
              <circle cx="295" cy="176" r="18" fill="#15803d" />
              <circle cx="312" cy="180" r="14" fill="#16a34a" />
              <circle cx="434" cy="172" r="20" fill="#15803d" />
              <circle cx="452" cy="178" r="15" fill="#22c55e" />

              {/* School Building */}
              {/* Flagpole + Thai Flag */}
              <rect x="373" y="28" width="2.5" height="36" rx="1" fill="#e2e8f0" />
              <g transform="translate(375.5, 30)">
                <rect x="0" y="0" width="32" height="3.5" fill="#ef4444" />
                <rect x="0" y="3.5" width="32" height="3.5" fill="#ffffff" />
                <rect x="0" y="7" width="32" height="7" fill="#1d4ed8" />
                <rect x="0" y="14" width="32" height="3.5" fill="#ffffff" />
                <rect x="0" y="17.5" width="32" height="3.5" fill="#ef4444" />
              </g>

              {/* Side Wings */}
              <rect x="304" y="106" width="38" height="76" rx="2" fill="#e2ecfb" />
              <rect x="406" y="106" width="38" height="76" rx="2" fill="#e2ecfb" />
              <path d="M300 108 L323 92 L344 108 Z" fill="#2563eb" />
              <path d="M404 108 L425 92 L448 108 Z" fill="#2563eb" />

              {/* Center Building */}
              <rect x="342" y="84" width="64" height="98" rx="2" fill="#ffffff" />
              <path d="M335 86 L374 58 L413 86 Z" fill="#1d4ed8" />
              <path d="M342 86 L374 63 L406 86 Z" fill="#3b82f6" />

              {/* Clock */}
              <circle cx="374" cy="90" r="11" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
              <line x1="374" y1="90" x2="374" y2="83.5" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" />
              <line x1="374" y1="90" x2="379" y2="90" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" />

              {/* Windows */}
              <rect x="313" y="118" width="8" height="12" rx="1.5" fill="#60a5fa" />
              <rect x="326" y="118" width="8" height="12" rx="1.5" fill="#60a5fa" />
              <rect x="313" y="140" width="8" height="12" rx="1.5" fill="#60a5fa" />
              <rect x="326" y="140" width="8" height="12" rx="1.5" fill="#60a5fa" />

              <rect x="414" y="118" width="8" height="12" rx="1.5" fill="#60a5fa" />
              <rect x="427" y="118" width="8" height="12" rx="1.5" fill="#60a5fa" />
              <rect x="414" y="140" width="8" height="12" rx="1.5" fill="#60a5fa" />
              <rect x="427" y="140" width="8" height="12" rx="1.5" fill="#60a5fa" />

              <rect x="352" y="112" width="10" height="13" rx="1.5" fill="#3b82f6" />
              <rect x="369" y="112" width="10" height="13" rx="1.5" fill="#3b82f6" />
              <rect x="386" y="112" width="10" height="13" rx="1.5" fill="#3b82f6" />

              {/* Arched Door */}
              <path d="M364 182 V153 C364 147 384 147 384 153 V182 Z" fill="#1e40af" />
              <rect x="356" y="182" width="36" height="4" rx="1" fill="#cbd5e1" />

              {/* Front Green Student Badge */}
              <g transform="translate(274, 134) rotate(-6)">
                <rect x="0" y="0" width="44" height="32" rx="6" fill="#22c55e" stroke="#ffffff" strokeWidth="2" />
                <circle cx="14" cy="13" r="4" fill="#ffffff" />
                <path d="M8 24 C8 19.5 20 19.5 20 24" fill="#ffffff" />
                <circle cx="29" cy="14" r="3" fill="#bbf7d0" />
                <path d="M24 24 C24 20.5 34 20.5 34 24" fill="#bbf7d0" />
              </g>

              {/* Foreground Shrubs */}
              <circle cx="52" cy="186" r="24" fill="#0f2f78" fillOpacity="0.45" />
              <circle cx="78" cy="192" r="18" fill="#1d4ed8" fillOpacity="0.35" />

              {/* Laptop with Analytics Charts */}
              <g transform="translate(105, 102)">
                {/* Laptop Screen */}
                <rect x="24" y="0" width="118" height="78" rx="7" fill="#1e293b" />
                <rect x="29" y="5" width="108" height="67" rx="4" fill="url(#screenGrad)" />
                {/* Screen Top Bar */}
                <rect x="33" y="9" width="42" height="6" rx="3" fill="#2563eb" />
                <circle cx="129" cy="12" r="2.5" fill="#93c5fd" />
                {/* Bar Chart Card */}
                <rect x="33" y="20" width="54" height="46" rx="4" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
                <rect x="40" y="45" width="7" height="14" rx="1.5" fill="#93c5fd" />
                <rect x="51" y="36" width="7" height="23" rx="1.5" fill="#3b82f6" />
                <rect x="62" y="28" width="7" height="31" rx="1.5" fill="#1d4ed8" />
                <rect x="73" y="40" width="7" height="19" rx="1.5" fill="#60a5fa" />
                {/* Pie Chart Card */}
                <rect x="92" y="20" width="40" height="46" rx="4" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
                <circle cx="112" cy="43" r="13" fill="#dbeafe" />
                <path d="M112 43 L112 30 A13 13 0 0 1 124 48 Z" fill="#2563eb" />
                <path d="M112 43 L124 48 A13 13 0 0 1 102 52 Z" fill="#60a5fa" />

                {/* Laptop Base / Keyboard */}
                <path d="M22 78 H144 L164 98 H4 Z" fill="#e2e8f0" />
                <path d="M27 82 H139 L151 92 H17 Z" fill="#cbd5e1" />
                <rect x="68" y="94" width="32" height="3" rx="1.5" fill="#94a3b8" />
                <path d="M4 98 H164 L160 103 H8 Z" fill="#94a3b8" />
              </g>
            </svg>
          </div>
        </aside>

        {/* Right White Login Form Panel */}
        <div
          style={{
            padding: '3rem 2.75rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            background: '#ffffff',
          }}
        >
          <div style={{ marginBottom: '1.75rem' }}>
            <h2
              style={{
                fontSize: '1.65rem',
                margin: '0 0 0.45rem 0',
                color: '#0f172a',
                fontWeight: 800,
                lineHeight: 1.25,
              }}
            >
              เข้าสู่ระบบสำหรับ
              <span style={{ color: '#1d63ed' }}>เจ้าหน้าที่</span>
            </h2>
            <p
              style={{
                margin: '0 0 0.9rem 0',
                fontSize: '0.88rem',
                color: '#64748b',
                lineHeight: 1.5,
              }}
            >
              กรุณาเข้าสู่ระบบเพื่อจัดการระบบคูปองดิจิทัลของโรงเรียน
            </p>
            <div
              style={{
                width: '64px',
                height: '3.5px',
                borderRadius: '999px',
                background: 'linear-gradient(90deg, #1d63ed 0%, #93c5fd 100%)',
              }}
            />
          </div>

          <LoginForm isLoggedOut={isLoggedOut} hasSessionError={Boolean(hasError)} />
        </div>
      </div>
    </div>
  );
}

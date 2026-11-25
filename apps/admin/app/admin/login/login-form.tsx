'use client';

import { FormEvent, useEffect, useState } from 'react';

interface LoginFormProps {
  isLoggedOut: boolean;
  hasSessionError: boolean;
}

const REMEMBERED_USERNAME_KEY = 'school_coupon_admin_remembered_username';

export default function LoginForm({ isLoggedOut, hasSessionError }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [forgotNotice, setForgotNotice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    hasSessionError
      ? 'เซสชันหมดอายุหรือไม่พบสิทธิ์การใช้งาน กรุณาเข้าสู่ระบบใหม่'
      : null,
  );

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(REMEMBERED_USERNAME_KEY);
      if (saved) {
        setUsername(saved);
      }
    } catch {
      // Ignore storage access failures
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      setErrorMessage('กรุณากรอกชื่อผู้ใช้งานและรหัสผ่านให้ครบถ้วน');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setForgotNotice(false);
    try {
      const response = await fetch('/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUsername, password }),
      });

      if (!response.ok) {
        let message = 'ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง';
        try {
          const data = (await response.json()) as { message?: string };
          if (data.message) {
            message = data.message;
          }
        } catch {
          // Use fallback Thai error message when body is not JSON
        }
        setErrorMessage(message);
        setLoading(false);
        return;
      }

      try {
        if (rememberMe) {
          window.localStorage.setItem(REMEMBERED_USERNAME_KEY, trimmedUsername);
        } else {
          window.localStorage.removeItem(REMEMBERED_USERNAME_KEY);
        }
      } catch {
        // Ignore storage errors
      }

      window.location.href = '/admin';
    } catch {
      setErrorMessage('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {isLoggedOut && !errorMessage && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '11px',
            padding: '0.72rem 0.95rem',
            color: '#065f46',
            fontSize: '0.84rem',
            fontWeight: 500,
            marginBottom: '1.1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          <span>คุณได้ออกจากระบบเรียบร้อยแล้ว</span>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '11px',
            padding: '0.72rem 0.95rem',
            color: '#991b1b',
            fontSize: '0.84rem',
            fontWeight: 500,
            marginBottom: '1.1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      {forgotNotice && (
        <div
          style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '11px',
            padding: '0.72rem 0.95rem',
            color: '#1e3a8a',
            fontSize: '0.84rem',
            fontWeight: 500,
            marginBottom: '1.1rem',
          }}
        >
          กรุณาติดต่อผู้ดูแลระบบฝ่ายไอทีของโรงเรียนเพื่อขอรีเซ็ตรหัสผ่านครับ
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
        {/* Username Field with Left Person Icon */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '0.95rem',
              color: '#94a3b8',
              display: 'inline-flex',
              pointerEvents: 'none',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </span>
          <input
            id="staff-username"
            name="username"
            type="text"
            autoComplete="username"
            aria-label="ชื่อผู้ใช้งาน (Username)"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="ชื่อผู้ใช้งาน (Username)"
            disabled={loading}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '0.84rem 0.95rem 0.84rem 2.75rem',
              borderRadius: '11px',
              border: '1px solid #d7e0ec',
              background: '#ffffff',
              color: '#0f172a',
              fontSize: '0.94rem',
              outline: 'none',
            }}
          />
        </div>

        {/* Password Field with Left Padlock Icon & Right Eye Icon */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '0.95rem',
              color: '#94a3b8',
              display: 'inline-flex',
              pointerEvents: 'none',
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
            </svg>
          </span>
          <input
            id="staff-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            aria-label="รหัสผ่าน (Password)"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="รหัสผ่าน (Password)"
            disabled={loading}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '0.84rem 2.85rem 0.84rem 2.75rem',
              borderRadius: '11px',
              border: '1px solid #d7e0ec',
              background: '#ffffff',
              color: '#0f172a',
              fontSize: '0.94rem',
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={loading}
            aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
            title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
            style={{
              position: 'absolute',
              right: '0.55rem',
              width: '32px',
              height: '32px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              color: '#64748b',
              cursor: 'pointer',
            }}
          >
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>

        {/* Remember Me + Forgot Password Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            fontSize: '0.84rem',
            marginTop: '0.1rem',
          }}
        >
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              color: '#334155',
              fontWeight: 500,
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              disabled={loading}
              style={{
                width: '16px',
                height: '16px',
                accentColor: '#1d63ed',
                cursor: 'pointer',
              }}
            />
            <span>จดจำการเข้าสู่ระบบ</span>
          </label>

          <button
            type="button"
            onClick={() => setForgotNotice((prev) => !prev)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              color: '#475569',
              fontSize: '0.84rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            ลืมรหัสผ่าน ?
          </button>
        </div>

        {/* Primary Submit Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: '0.35rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.55rem',
            width: '100%',
            padding: '0.9rem 1.15rem',
            background: 'linear-gradient(90deg, #1659cf 0%, #1d63ed 100%)',
            border: 'none',
            color: '#ffffff',
            borderRadius: '11px',
            fontWeight: 700,
            fontSize: '0.96rem',
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.78 : 1,
            boxShadow: '0 6px 16px rgba(29, 99, 237, 0.28)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="10 17 15 12 10 7" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="15" y1="12" x2="3" y2="12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}</span>
        </button>
      </form>
    </div>
  );
}

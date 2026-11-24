'use client';

import { FormEvent, useState } from 'react';

interface LoginFormProps {
  isLoggedOut: boolean;
  hasSessionError: boolean;
}

export default function LoginForm({ isLoggedOut, hasSessionError }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    hasSessionError
      ? 'เซสชันหมดอายุหรือไม่พบสิทธิ์การใช้งาน กรุณาเข้าสู่ระบบใหม่'
      : null,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      setErrorMessage('กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
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
            padding: '0.75rem 0.95rem',
            color: '#065f46',
            fontSize: '0.86rem',
            fontWeight: 500,
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
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
            padding: '0.75rem 0.95rem',
            color: '#991b1b',
            fontSize: '0.86rem',
            fontWeight: 500,
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
            <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label
            htmlFor="staff-username"
            style={{
              display: 'block',
              fontSize: '0.84rem',
              fontWeight: 600,
              color: '#334155',
              marginBottom: '0.45rem',
            }}
          >
            ชื่อผู้ใช้ (Username)
          </label>
          <input
            id="staff-username"
            name="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="กรอกชื่อผู้ใช้"
            disabled={loading}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '0.78rem 0.95rem',
              borderRadius: '11px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#0f172a',
              fontSize: '0.94rem',
              outline: 'none',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="staff-password"
            style={{
              display: 'block',
              fontSize: '0.84rem',
              fontWeight: 600,
              color: '#334155',
              marginBottom: '0.45rem',
            }}
          >
            รหัสผ่าน (Password)
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              id="staff-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="กรอกรหัสผ่าน"
              disabled={loading}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.78rem 2.9rem 0.78rem 0.95rem',
                borderRadius: '11px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
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
                right: '0.5rem',
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
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: '0.4rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.55rem',
            width: '100%',
            padding: '0.9rem 1.15rem',
            background: 'linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)',
            border: '1px solid rgba(147, 197, 253, 0.35)',
            color: '#ffffff',
            borderRadius: '11px',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.78 : 1,
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
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

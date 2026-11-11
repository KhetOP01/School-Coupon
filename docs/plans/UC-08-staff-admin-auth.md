# Implementation Plan: UC-08 Staff เข้าสู่ระบบและเข้าใช้งาน Web Admin (Staff Admin Authentication)

## 1. ขอบเขตและ Acceptance Criteria
ตามเอกสาร [UC-08-staff-admin-auth.md](../usecases/UC-08-staff-admin-auth.md) และ PRD:
- **AC8.1:** Staff เข้าสู่ระบบผ่าน OIDC Callback ถูกต้องและ claim ที่ mapping ระบุสิทธิ์ Staff -> สำเร็จ (`303` redirect ไป `/admin`), ออก HttpOnly Session Cookie และเข้าใช้งาน Admin API (`GET /admin/auth/session` ตอบ `200 OK`)
- **AC8.2:** ผู้ใช้ยืนยันตัวตนสำเร็จแต่ไม่มีสิทธิ์ Staff (claim ไม่ตรง mapping) -> ปฏิเสธ `403 STAFF_ACCESS_REQUIRED`, ไม่สร้าง session, ไม่ส่งข้อมูล Admin
- **AC8.3:** ผู้ใช้ไม่มี session ที่ใช้งานได้เปิด Admin API -> ปฏิเสธ `401 AUTHENTICATION_REQUIRED`, ส่งกลับไปหน้า sign-in, ไม่ส่งข้อมูล Admin
- **AC8.4:** OIDC callback รูปแบบไม่ครบ/ผิด หรือ state/nonce/issuer/audience/ลายเซ็นไม่ถูกต้อง หรือหมดอายุ:
  - ขาด parameter หรือ cookie state mismatch -> ปฏิเสธ `400 INVALID_OIDC_RESPONSE`
  - state reused / flow หมดอายุ หรือ verification signature/issuer/nonce fail -> ปฏิเสธ `401 AUTHENTICATION_REQUIRED`
  - ไม่สร้าง session ในระบบ
- **AC8.5:** IdP ใช้งานไม่ได้หรือผู้ใช้ยกเลิก:
  - ผู้ใช้กดยกเลิก sign-in (`error` query param) -> ปฏิเสธ `400 AUTHENTICATION_CANCELLED`
  - IdP ขัดข้องหรือไม่ตอบสนอง -> ปฏิเสธ `502 AUTHENTICATION_UNAVAILABLE`
  - ไม่สร้าง session
- **AC8.6:** Session หมดอายุ (ตาม TTL) หรือถูกเพิกถอน -> เรียกเส้นทาง Admin ปฏิเสธ `401 SESSION_EXPIRED`, ให้เข้าสู่ระบบใหม่
- **AC8.7:** Staff สั่งออกจากระบบ (`POST /admin/auth/logout`) -> สำเร็จ (`204 No Content`), เพิกถอน session ใน DB (`revoked_at`), เคลียร์ cookie; หากเรียกซ้ำด้วย cookie เดิมปฏิเสธตาม AC8.3/AC8.6

## 2. การเปลี่ยนแปลงฐานข้อมูล (Database Schema)
- Migration: `db/migrations/20261106_0008_staff_admin_oidc_sessions.sql`
  - ตาราง `staff_admin_sessions`:
    - `session_token_hash BYTEA PRIMARY KEY` (32 bytes SHA-256)
    - `provider_issuer VARCHAR(255) NOT NULL`
    - `staff_subject VARCHAR(255) NOT NULL`
    - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
    - `expires_at TIMESTAMPTZ NOT NULL`
    - `revoked_at TIMESTAMPTZ`
    - `CHECK (expires_at > created_at)`
  - ตาราง `staff_admin_oidc_flows`:
    - `state_hash BYTEA PRIMARY KEY` (32 bytes SHA-256)
    - `nonce VARCHAR(255) NOT NULL`
    - `code_verifier VARCHAR(255) NOT NULL`
    - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
    - `expires_at TIMESTAMPTZ NOT NULL`
    - `CHECK (expires_at > created_at)`
- Seed: `db/seed.sql`
  - Fixtures session ที่หมดอายุและถูกเพิกถอนสำหรับทดสอบ AC8.6/AC8.7 โดยไม่ seed session ที่ active

## 3. สัญญา API (OpenAPI Specification)
- `GET /admin/auth/oidc/start`: 302 Redirect ไป IdP พร้อม flow cookie
- `GET /admin/auth/oidc/callback`: 303 Redirect ไป `/admin` พร้อม session cookie (400, 401, 403, 502)
- `GET /admin/auth/session`: 200 OK `{ expiresAt }` (401)
- `POST /admin/auth/logout`: 204 No Content พร้อมเคลียร์ cookie (401)

## 4. โครงสร้างและการพัฒนาตามแนวทาง DDD & TDD
1. **Repository & Infrastructure Integration Tests (`tests/integration/staff-admin-session.repository.spec.ts`):**
   - ทดสอบ `StaffAdminSessionRepository` กับ PostgreSQL จริง: create, findActive, revoke, และ constraints (AC8.1, AC8.6, AC8.7)
   - ทดสอบ `StaffOidcFlowRepository` กับ PostgreSQL จริง: create, consume once (one-time use) (AC8.1, AC8.4)
2. **Controller & E2E Validation Tests (`tests/e2e/staff-admin-oidc.e2e.spec.ts`):**
   - จัดหมวดหมู่และตั้งชื่อ Test Cases ให้ตรงกับ AC8.1 ถึง AC8.7 อย่างชัดเจน
   - เพิ่ม edge cases:
     - AC8.4: Missing state/code หรือ cookie mismatch -> 400 `INVALID_OIDC_RESPONSE`
     - AC8.4: State reused / flow not found -> 401 `AUTHENTICATION_REQUIRED`
     - AC8.5: User cancelled (`error` param) -> 400 `AUTHENTICATION_CANCELLED`
     - AC8.5: Provider unavailable (Network/Discovery failure) -> 502 `AUTHENTICATION_UNAVAILABLE`
3. **Full Validation:**
   - ตรวจสอบ `npm test`, `npm run lint`, `npm run build`

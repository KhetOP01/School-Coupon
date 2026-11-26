# UC-09: Staff เข้าสู่ระบบ Web Admin ด้วย Username และ Password

> สถานะ: Acceptance Criteria ได้รับการยืนยันจากผู้ใช้แล้ว
> Bounded context: `school-configuration` (ระดับ `crud`)
> เชื่อมโยงกับ: [UC-08: Staff Admin Auth](./UC-08-staff-admin-auth.md)

## ผู้ใช้งาน

เจ้าหน้าที่โรงเรียน (Staff / Admin) ที่มีบัญชีในตาราง `staff_users`

## เงื่อนไขก่อนเริ่ม

- ฐานข้อมูลมีตาราง `staff_users` และ `staff_admin_sessions`
- รหัสผ่านถูกแฮชด้วย `scrypt` (`scrypt:<salt>:<hex>`) ก่อนบันทึกลงฐานข้อมูล

## ขั้นตอนหลัก

1. Staff เปิดหน้า `/admin/login` และกรอก `username` กับ `password`
2. ระบบส่งคำขอ `POST /admin/auth/login` ไปยัง Backend
3. ระบบค้นหาบัญชีจาก `staff_users` ด้วย `username` (trimmed) และตรวจสอบ `password` ด้วย `timingSafeEqual`
4. ระบบตรวจสอบสถานะบัญชีต้องเป็น `active`
5. ระบบสร้าง opaque session token (32 bytes), เก็บเฉพาะ SHA-256 hash ลง `staff_admin_sessions`, ตั้ง `HttpOnly` cookie `school_coupon_admin_session` และตอบ `200 OK`
6. หน้า Web Admin พาผู้ใช้เข้าสู่ `/admin`

## กฎทางธุรกิจและข้อกำหนดความปลอดภัย

- ห้ามเก็บรหัสผ่านแบบ plaintext ในฐานข้อมูล หรือ log/response
- เมื่อไม่พบ `username` ให้ตอบ `401 INVALID_USERNAME` และเมื่อ `password` ไม่ถูกต้อง ให้ตอบ `401 INVALID_PASSWORD` เพื่อแจ้งจุดที่ผิดให้ผู้ใช้ทราบเช่นเดียวกับแอปมือถือ
- บัญชีที่สถานะเป็น `suspended` ต้องเข้าสู่ระบบไม่ได้ (`403 STAFF_SUSPENDED`) และไม่สร้าง session
- Session identifier เก็บเฉพาะ SHA-256 hash ใน `staff_admin_sessions` (`provider_issuer = 'local'`, `staff_subject = username`) และส่งผ่าน `HttpOnly` cookie
- หน้า Web Login (`/admin/login`) แสดงเฉพาะฟอร์ม Username / Password และปุ่มเข้าสู่ระบบ (ไม่แสดงปุ่ม OIDC SSO และ Dev Fast Login)

## Acceptance criteria

| รหัส AC | Given | When | Then |
|---|---|---|---|
| **AC9.1** | มีบัญชี `staff_users` สถานะ `active` | Staff กรอก `username` และ `password` ถูกต้อง แล้วส่ง `POST /admin/auth/login` | สำเร็จ (`200`): บันทึก session hash ลง `staff_admin_sessions`, ตั้ง `HttpOnly` cookie `school_coupon_admin_session`, และคืนข้อมูลผู้ใช้ + `expiresAt` |
| **AC9.2** | `username` หรือ `password` ว่างหรือไม่ครบถ้วน | ส่ง `POST /admin/auth/login` | ปฏิเสธ (`400 INVALID_REQUEST`) และไม่สร้าง session |
| **AC9.3** | ไม่พบ `username` หรือ `password` ไม่ตรงกับ `password_hash` | ส่ง `POST /admin/auth/login` | ปฏิเสธ (`401 INVALID_USERNAME` เมื่อไม่พบชื่อผู้ใช้ หรือ `401 INVALID_PASSWORD` เมื่อรหัสผ่านไม่ถูกต้อง) และไม่สร้าง session |
| **AC9.4** | บัญชี `staff_users` มีสถานะเป็น `suspended` | Staff กรอก `username` และ `password` ถูกต้อง แล้วส่ง `POST /admin/auth/login` | ปฏิเสธ (`403 STAFF_SUSPENDED`) และไม่สร้าง session |
| **AC9.5** | Staff ล็อกอินสำเร็จและมี active session cookie | เรียก `GET /admin/auth/session` หรือเปิด `/admin` แล้วเรียก `POST /admin/auth/logout` | ระหว่าง active เข้าใช้งาน `/admin` ได้ (`200`), และหลัง logout session ถูก revoke (`204`) พร้อมล้าง cookie |

## API และข้อมูล

| AC | API response | Database constraint / behavior |
|---|---|---|
| AC9.1 | `POST /admin/auth/login` ตอบ `200` พร้อม `{ username, fullName, role, expiresAt }` และ `Set-Cookie: school_coupon_admin_session=...; HttpOnly; SameSite=Lax` | บันทึก session hash 32 bytes ลง `staff_admin_sessions` (`provider_issuer = 'local'`, `staff_subject = username`) |
| AC9.2 | `400 INVALID_REQUEST` | ตรวจสอบก่อนเข้าถึง session |
| AC9.3 | `401 INVALID_USERNAME` / `401 INVALID_PASSWORD` | ไม่สร้าง session row |
| AC9.4 | `403 STAFF_SUSPENDED` | `CHECK (status IN ('active', 'suspended'))` ใน `staff_users`; ไม่สร้าง session row |
| AC9.5 | `GET /admin/auth/session` ตอบ `200`, `POST /admin/auth/logout` ตอบ `204` | ใช้ตาราง `staff_admin_sessions` และคอลัมน์ `revoked_at` เดิม |

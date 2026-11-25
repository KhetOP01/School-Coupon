# UC-10: จัดการบัญชีผู้ใช้งาน Web Admin (Staff & Admin Users)

> สถานะ: Acceptance Criteria ได้รับการยืนยันจากผู้ใช้แล้ว
> Bounded context: `school-configuration` (ระดับ `crud`)
> เชื่อมโยงกับ: [UC-09: Staff Password Login](./UC-09-staff-password-login.md)

## ผู้ใช้งาน

ผู้ดูแลระบบ (`role = 'admin'`) ใน Web Admin

## เงื่อนไขก่อนเริ่ม

- ฐานข้อมูลมีตาราง `staff_users` และ `staff_admin_sessions`
- ผู้ใช้ล็อกอินเข้าสู่ระบบ Web Admin แล้ว

## กฎทางธุรกิจ

- เมนูและ API จัดการบัญชีผู้ใช้งาน (`/admin/staff-users*`) เข้าถึงได้เฉพาะบัญชีที่มี `role = 'admin'` และสถานะ `active` เท่านั้น
- รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร และแฮชด้วย `scrypt` ก่อนบันทึก ห้ามส่ง `password_hash` กลับใน API response
- `username` ต้องไม่ซ้ำกันในระบบ (`UNIQUE`)
- ห้าม `admin` ระงับการใช้งาน (`suspended`) หรือลดสิทธิ์ (`role = 'staff'`) ของบัญชีตัวเอง

## Acceptance criteria

| รหัส AC | Given | When | Then |
|---|---|---|---|
| **AC10.1** | ผู้ใช้ล็อกอินด้วยบัญชี `role = 'admin'` (`active`) | เรียก `GET /admin/auth/session` หรือเปิด `/admin` | ตอบ `200` พร้อม `{ username, fullName, role, expiresAt }` และแสดงเมนู **"จัดการผู้ใช้งาน"** ในแถบด้านข้าง |
| **AC10.2** | ผู้ใช้ล็อกอินด้วยบัญชี `role = 'staff'` (`active`) | เปิด `/admin` หรือเรียก `/admin/staff-users*` | ไม่แสดงเมนูจัดการผู้ใช้งานใน UI และ Backend ปฏิเสธด้วย `403 ADMIN_ACCESS_REQUIRED` |
| **AC10.3** | ล็อกอินเป็น `admin` | เรียก `GET /admin/staff-users` | ตอบ `200` พร้อมรายการบัญชีทั้งหมด (`id`, `username`, `fullName`, `role`, `status`, `createdAt`, `updatedAt`) โดยไม่มี `passwordHash` |
| **AC10.4** | ล็อกอินเป็น `admin` | เรียก `POST /admin/staff-users` พร้อม `username`, `password`, `fullName`, `role` | สร้างบัญชีใหม่ (`201`) และใช้ล็อกอินเข้า `/admin/login` ได้ทันที; ถ้า `username` ซ้ำตอบ `409 STAFF_USERNAME_EXISTS`; ถ้าข้อมูลไม่ครบ/รหัสผ่านสั้นกว่า 8 ตัวตอบ `400 INVALID_REQUEST` |
| **AC10.5** | ล็อกอินเป็น `admin` | เรียก `PATCH /admin/staff-users/:id` เพื่อแก้ `fullName`, `role`, `status` หรือ `password` | อัปเดตสำเร็จ (`200`); ถ้าไม่พบ id ตอบ `404 STAFF_USER_NOT_FOUND` |
| **AC10.6** | ล็อกอินเป็น `admin` | เรียก `PATCH /admin/staff-users/:id` ของตัวเองเพื่อเปลี่ยน `status = 'suspended'` หรือ `role = 'staff'` | ปฏิเสธด้วย `409 CANNOT_MODIFY_OWN_ADMIN_ACCESS` |

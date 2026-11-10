# UC-08: Staff เข้าสู่ระบบและเข้าใช้งาน Web Admin

**Summary:** UC-08 Staff เข้าสู่ระบบและเข้าใช้งาน Web Admin  
**Epic:** ยังไม่ระบุ · **Component:** `school-configuration` · **Story points:** ?

## User story

ในฐานะเจ้าหน้าที่โรงเรียนที่ได้รับสิทธิ์ Staff

ฉันต้องการเข้าสู่ระบบ Web Admin ด้วยบัญชีโรงเรียน

เพื่อให้เข้าถึงความสามารถสำหรับเจ้าหน้าที่ได้อย่างปลอดภัย

## กฎทางธุรกิจ

- ใช้ OIDC IdP ที่โรงเรียนตั้งค่าไว้ ไม่สร้างหรือเก็บรหัสผ่าน Staff ใน School-Coupon
- Staff ต้องได้รับการยืนยันจาก claim ที่ตรวจสอบแล้วและ mapping ที่กำหนดไว้
- ผู้ไม่มีสิทธิ์ Staff ต้องไม่ได้ session หรือข้อมูล Admin
- Session ต้องเพิกถอนได้เมื่อ logout และหมดอายุไม่ช้ากว่าเวลาหมดอายุของการยืนยันตัวตน
- OIDC state/nonce ใช้ได้ครั้งเดียวและหมดอายุภายใน 5 นาที
- ใช้ session cookie แบบ `HttpOnly`; ใช้ `Secure` ใน production; ห้ามเก็บ access token หรือ session identifier ใน Web Storage

## Acceptance criteria

| รหัส AC | Given | When | Then |
|---|---|---|---|
| **AC8.1** | OIDC response ถูกต้องและ claim ที่ mapping แล้วมีสิทธิ์ Staff | Staff เข้าสู่ระบบ | สร้าง session ที่ปลอดภัยและแสดงหน้า Admin |
| **AC8.2** | ผู้ใช้ยืนยันตัวตนได้แต่ไม่มี Staff mapping | ผู้ใช้เข้า Web Admin | ปฏิเสธ `403 STAFF_ACCESS_REQUIRED`; ไม่สร้าง session หรือส่งข้อมูล Admin |
| **AC8.3** | ไม่มี session ที่ใช้งานได้ | ผู้ใช้เปิดเส้นทาง/ข้อมูล Admin | พาไปหน้าเข้าสู่ระบบและไม่ส่งข้อมูล Admin |
| **AC8.4** | OIDC callback รูปแบบไม่ครบ/ผิด หรือ state/nonce/issuer/audience/ลายเซ็นไม่ถูกต้อง หรือหมดอายุ | ระบบตรวจ callback | ปฏิเสธ `400 INVALID_OIDC_RESPONSE` เมื่อรูปแบบผิด หรือ `401 AUTHENTICATION_REQUIRED` เมื่อการตรวจยืนยันไม่ผ่าน; ไม่มี session |
| **AC8.5** | IdP ใช้งานไม่ได้หรือผู้ใช้ยกเลิก sign-in | ระบบทำ sign-in | แจ้ง `502 AUTHENTICATION_UNAVAILABLE` หรือ `400 AUTHENTICATION_CANCELLED`; ไม่มี session |
| **AC8.6** | Session หมดอายุหรือถูกเพิกถอน | ผู้ใช้เรียกเส้นทาง Admin | ปฏิเสธ `401 SESSION_EXPIRED`; ไม่ส่งข้อมูล Admin และให้เข้าสู่ระบบใหม่ |
| **AC8.7** | Staff มี session ที่ใช้งานได้ | Staff logout แล้วเรียกเส้นทาง Admin อีกครั้ง | เพิกถอน session และทำงานตาม AC8.3 |

## นอกขอบเขต

- หน้าออกบัตร RFID และ API สำหรับค้นหานักเรียน/บัตรเดิม (แยก use case; พึ่งพา UC-01)
- การสร้างบัญชีและแก้ไขสิทธิ์/claim mapping ใน IdP
- การ logout จาก IdP ทั้งโรงเรียน

## คำถามที่ต้องตอบ

- ระบุ OIDC IdP, issuer, audience/tenant, client และ callback URL ก่อน deploy
- ระบุ claim/group สำหรับ Staff และผู้รับผิดชอบการตั้ง mapping
- ระบุนโยบายอายุ session เพิ่มเติม หากต่างจาก expiry ที่ IdP ส่งมา
- ยืนยัน routing same-origin/reverse proxy สำหรับ Web Admin และ API

## Sub-tasks (ร่าง; AC ตรงกับ use case)

- `Spec: รีวิว UC-08 และ AC8.1–AC8.7`
- `Spec: เพิ่ม OIDC browser flow และ session endpoints ใน openapi.yaml (AC8.1–AC8.7)`
- `DB: ออกแบบ persistent session และการเพิกถอน (AC8.1, AC8.6, AC8.7)`
- `Review: รีวิว AC ↔ API ↔ DB constraints (AC8.1–AC8.7)`
- `Seed: เพิ่มเฉพาะ session หมดอายุ/ถูกเพิกถอน; ใช้ OIDC test provider สำหรับ AC8.1–AC8.5 (AC8.1–AC8.7)`
- `HTTP: เพิ่ม OIDC callback และ protected Admin boundary (AC8.1–AC8.5)`
- `HTTP: ปฏิเสธผู้ไม่มีสิทธิ์และ session หมดอายุ (AC8.2, AC8.3, AC8.6)`
- `HTTP: เพิกถอน session เมื่อ logout (AC8.7)`
- `E2E: ทดสอบ Staff sign-in, denied access, expiry และ logout (AC8.1–AC8.7)`

## Definition of Ready (รอรีวิว)

| รายการ | สถานะ |
|---|---|
| มี AC สำเร็จ, ไม่มีสิทธิ์, ไม่มี session, callback ผิดพลาด, IdP ล้มเหลว, session หมดอายุ และ logout | ✅ |
| กฎการยืนยัน Staff และการคุ้มครอง session ระบุชัด | ✅ |
| มีนอกขอบเขต | ✅ |
| ระบุ component | ✅ `school-configuration` |
| Story points | ❌ ยังไม่มีข้อมูล; ไม่เดา |
| ยืนยัน provider/issuer และ claim mapping | ❌ เป็นข้อมูลที่ต้องได้ก่อน deploy |

## อ้างอิง

- [Use case UC-08](../usecases/UC-08-staff-admin-auth.md)
- Web routes: `/admin/sign-in`, OIDC callback ตาม provider configuration, `/admin/*`
- OIDC เป็น browser redirect flow; session endpoint และ error response ระบุใน `openapi.yaml`
- UC-01 API และการค้นหานักเรียนเป็น dependency ของหน้าปฏิบัติงาน Admin ใน use case ถัดไป

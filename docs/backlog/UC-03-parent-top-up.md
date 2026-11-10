# UC-03 ผู้ปกครองเติมเงินเข้า Wallet นักเรียน

**Summary:** UC-03 ผู้ปกครองเติมเงินเข้า Wallet นักเรียน
**Component:** `student-account`
**Story points:** ?
**Epic:** ยังไม่ระบุ

## User story

ในฐานะผู้ปกครองที่ได้รับอนุญาต

ฉันต้องการเติมเงินเข้า Wallet ของนักเรียนผ่าน Payment Gateway

เพื่อให้มีเงินใช้ซื้อสินค้าในโรงเรียน และดูแลยอดติดลบจาก Offline ได้

## กฎทางธุรกิจ

- ยอดเติมเงินต้องเป็นไปตามค่าขั้นต่ำ/สูงสุดที่ Staff ตั้งไว้
- AC ตัวอย่างใช้ขั้นต่ำ 50 บาทและสูงสุด 2,000 บาท
- เติม 100 บาทเมื่อ Wallet เป็น -30 บาทแล้วเหลือ 70 บาท
- ยอด Wallet เพิ่มหลังยืนยันชำระสำเร็จ และ callback ซ้ำต้องไม่เพิ่มยอดซ้ำ (ข้อเสนอ)

## Acceptance criteria

| รหัส AC | Given | When | Then |
|---|---|---|---|
| **AC3.1** | Staff ตั้งขั้นต่ำ 50 บาทและสูงสุด 2,000 บาท | Parent เติม 100 บาทและ Gateway ยืนยัน | สำเร็จ (`200 OK`): ยอดเข้า Wallet |
| **AC3.2** | Staff ตั้งขั้นต่ำ 50 บาท | Parent เติม 30 บาท | ปฏิเสธ (`400 INVALID_TOPUP_AMOUNT`); แจ้งขั้นต่ำและไม่เปลี่ยน Wallet |
| **AC3.3** | Wallet เป็น `-30.00` บาท | Parent เติม `100.00` บาทสำเร็จ | สำเร็จ (`200 OK`): Wallet เป็น `70.00` บาท |
| **AC3.4** *(เสนอ)* | ยอดสูงสุด 2,000 บาท | Parent เติม 2,001 บาท | ปฏิเสธ (`400 INVALID_TOPUP_AMOUNT`); Wallet ไม่เปลี่ยน |
| **AC3.5** *(เสนอ)* | Student ID ไม่มีในระบบ | Parent ส่งคำขอเติมเงิน | ปฏิเสธ (`404 STUDENT_NOT_FOUND`); ไม่มีการเปลี่ยน Wallet |
| **AC3.6** *(เสนอ)* | ผู้เรียกไม่ login หรือไม่มีสิทธิ์ดูแลนักเรียน | ผู้เรียกส่งคำขอเติมเงิน | ปฏิเสธ (`401 AUTHENTICATION_REQUIRED` หรือ `403 PARENT_STUDENT_ACCESS_DENIED`) |
| **AC3.7** *(เสนอ)* | Gateway ปฏิเสธ/ล้มเหลว | Parent เติมเงิน | ปฏิเสธ (`502 PAYMENT_GATEWAY_FAILED`); Wallet ไม่เพิ่ม |
| **AC3.8** *(เสนอ)* | รายการเติมเงินนี้สำเร็จและได้รับยอดแล้ว | Gateway ส่ง callback เดิมซ้ำ | คืนผลเดิม (`200 OK`); เพิ่มยอด Wallet เพียงครั้งเดียว |

## นอกขอบเขต

- การปรับ policy เติมเงินโดย Staff; PRD ยังไม่มี use case แยก
- การคืนเงินจาก Gateway และการ reconciliation หลังยอด Wallet บันทึกไม่สำเร็จ
- การซื้อสินค้าหรือ Sync รายการ Offline
- การสร้างบัญชีและผูก Parent-Student

## คำถามที่ต้องตอบ

- ขั้นต่ำ/สูงสุดรวมค่าขอบหรือไม่?
- จะจัดการ Gateway timeout และผลการชำระที่ยังไม่แน่ชัดอย่างไร?
- ระบุ Gateway และ payment reference/idempotency key ที่ใช้ได้หรือไม่?
- จะแยก Gateway decline จาก Gateway unavailable ใน HTTP response หรือไม่?
- ควรตอบ `403` หรือ `404` เมื่อ Parent ขอเติมเงินให้เด็กที่ไม่มีสิทธิ์ดูแล?

## Sub-tasks (ร่าง)

- `Spec: รีวิว UC-03 และ AC3.1–AC3.8`
- `Spec: ระบุ request/response และ error ของ top-up endpoint (AC3.1–AC3.8)`
- `DB: ออกแบบการบันทึก top-up และป้องกัน callback ซ้ำ (AC3.1, AC3.3, AC3.8)`
- `Domain: บังคับ policy จำนวนเงินและการเพิ่ม Wallet (AC3.2–AC3.4)`
- `App: ตรวจ Student/Parent access และประสาน Gateway (AC3.5–AC3.7)`
- `Infra: เชื่อม Gateway และทดสอบ persistence/idempotency (AC3.1, AC3.7–AC3.8)`
- `HTTP: ตรวจ input และ map error/status ตาม OpenAPI (AC3.2, AC3.4–AC3.7)`
- `E2E: ทดสอบ top-up success, reject, failure และ replay (AC3.1–AC3.8)`

## Definition of Ready (รอรีวิว)

| รายการ | สถานะ |
|---|---|
| มีกรณีสำเร็จ, ต่ำ/เกิน policy, ไม่พบข้อมูล, ไม่มีสิทธิ์, Gateway fail และ callback ซ้ำ | ✅ |
| ตัวอย่างจำนวนเงินจาก PRD ชัด; inclusive boundary ยังรอคำตอบ | ⚠️ |
| มีนอกขอบเขตและ component | ✅ |
| Story points | ❌ ไม่มีข้อมูล; ไม่เดา |
| Gateway, timeout/reconciliation และ Parent-Student authorization ยังไม่กำหนด | ❌ |
| ขนาด Story | ⚠️ 8 AC; พิจารณาแบ่งหาก estimates/implementation ใหญ่เกิน Story เดียว |

## อ้างอิง

- [Use case UC-03](../usecases/UC-03-parent-top-up.md)
- PRD: `POST /parent/wallet/topup`
- AC3.4–AC3.8 เป็นข้อเสนอและยังไม่เพิ่มลง PRD

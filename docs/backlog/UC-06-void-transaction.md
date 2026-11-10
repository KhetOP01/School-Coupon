# UC-06 ร้านค้ายกเลิกรายการชำระเงิน

**Summary:** UC-06 ร้านค้ายกเลิกรายการชำระเงิน

**Component:** `payments`

**Story points:** ?

**Epic:** ยังไม่ระบุ

## User story

ในฐานะพ่อค้า-แม่ค้า

ฉันต้องการยกเลิกรายการชำระที่เกิดขึ้นในวันเดียวกัน

เพื่อคืนยอดให้กับนักเรียนโดยไม่ต้องสแกนบัตรซ้ำ

## กฎทางธุรกิจ

- ยกเลิกรายการชำระได้ภายในวันเดียวกัน ก่อน 23:59 น. (BR-VOID-01)
- การยกเลิกคืนเงิน Wallet และสร้าง `VOID` ที่อ้างถึงรายการต้นทาง

## Acceptance criteria

| รหัส AC | Given | When | Then |
|---|---|---|---|
| **AC6.1** | รายการชำระเกิดขึ้นภายในวันเดียวกัน ก่อน 23:59 น. | Merchant เลือกรายการในประวัติแล้วกด Void โดยไม่สแกนบัตรซ้ำ | สำเร็จ (`200 OK`): คืนยอดเข้า Wallet และบันทึก Transaction `VOID` ที่อ้างถึงรายการต้นทาง |
| **AC6.2** | รายการชำระเกิดขึ้นวันก่อนหน้า | Merchant กด Void รายการนั้น | ปฏิเสธ (`400 INVALID_VOID_PERIOD`); ไม่เปลี่ยน Wallet หรือรายการ |
| **AC6.3** *(เสนอ)* | Transaction ID ที่ระบุไม่มีในระบบ | Merchant ส่งคำขอ Void | ปฏิเสธ (`404 PAYMENT_NOT_FOUND`); ไม่เปลี่ยน Wallet |
| **AC6.4** *(เสนอ)* | ผู้เรียกไม่ login หรือรายการเป็นของ Merchant อื่น | ผู้เรียกส่งคำขอ Void | ปฏิเสธ (`401 AUTHENTICATION_REQUIRED` หรือ `403 MERCHANT_ACCESS_DENIED`); ไม่เปลี่ยนข้อมูล |
| **AC6.5** *(เสนอ)* | รายการถูก Void สำเร็จแล้ว | Merchant ส่งคำขอ Void ซ้ำ | ปฏิเสธ (`409 PAYMENT_ALREADY_VOIDED`); ไม่คืนยอดหรือสร้าง `VOID` ซ้ำ |
| **AC6.6** *(เสนอ)* | Transaction เป็นชนิดที่ไม่ใช่รายการชำระ หรืออยู่ในสถานะที่ยกเลิกไม่ได้ | Merchant ส่งคำขอ Void | ปฏิเสธ (`409 PAYMENT_NOT_VOIDABLE`); ไม่เปลี่ยนข้อมูล |
| **AC6.7** *(เสนอ)* | คำขอไม่มี Transaction ID หรือ ID มีรูปแบบไม่ถูกต้อง | Merchant ส่งคำขอ Void | ปฏิเสธ (`400 INVALID_REQUEST`); ไม่เปลี่ยนข้อมูล |

## นอกขอบเขต

- การสร้าง Payment อยู่ใน UC-05
- การคำนวณ Settlement อยู่ใน UC-07
- การคืนเงินจริงผ่าน Gateway หรือเงินสด

## คำถามที่ต้องตอบ

- timezone และขอบเขตเวลาสุดท้ายของการ Void คืออะไร?
- รายการ Offline ที่ยังไม่ Sync ยกเลิกได้หรือไม่?
- AC6.3–AC6.7 เป็นข้อเสนอและต้องยืนยัน error code/authorization ก่อนทำ API

## Sub-tasks (ร่าง)

- `Spec: รีวิว use case และ AC6.1–AC6.7`
- `Spec: ระบุ request/response และ error ของ void endpoint (AC6.1–AC6.7)`
- `DB: ผูก VOID กับ Payment ต้นทางและป้องกันการ Void ซ้ำ (AC6.1, AC6.5–AC6.6)`
- `Domain: ตรวจช่วงเวลาและสถานะที่ยกเลิกได้ (AC6.1–AC6.2, AC6.5–AC6.6)`
- `App: ตรวจ Payment และสิทธิ์ Merchant (AC6.3–AC6.4)`
- `HTTP: map error/status ตาม OpenAPI (AC6.2–AC6.7)`
- `E2E: ทดสอบ Void success, period reject, ownership และ retry (AC6.1–AC6.7)`

## Definition of Ready (รอรีวิว)

| รายการ | สถานะ |
|---|---|
| มีกรณีสำเร็จ, หมดเวลา, ไม่พบข้อมูล, ไม่มีสิทธิ์, ซ้ำ, ผิดสถานะ และ input ผิด | ✅ |
| กรอบวันเดียวชัด; timezone/เวลาขอบเขตยังไม่ชัด | ⚠️ |
| มีนอกขอบเขตและ component | ✅ |
| Story points | ❌ ไม่มีข้อมูล; ไม่เดา |
| Ownership, Offline pending และ error code ของ AC เสริมยังรอคำตอบ | ❌ |

## อ้างอิง

- [Use case UC-06](../usecases/UC-06-void-transaction.md)
- PRD: `POST /merchant/payments/:id/void`

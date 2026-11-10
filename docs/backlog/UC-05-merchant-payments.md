# UC-05 ร้านค้ารับชำระเงินแบบ Online และ Offline

**Summary:** UC-05 ร้านค้ารับชำระเงินแบบ Online และ Offline

**Component:** `payments`

**Story points:** ?

**Epic:** ยังไม่ระบุ

## User story

ในฐานะพ่อค้า-แม่ค้า

ฉันต้องการรับชำระค่าสินค้าผ่านบัตร RFID ได้ทั้ง Online และ Offline

เพื่อให้การขายดำเนินต่อได้เมื่อสัญญาณอินเทอร์เน็ตขัดข้อง และ Sync รายการกลับเข้าระบบได้

## กฎทางธุรกิจ

- Offline ใช้ Cached Balance และจำกัดยอดไม่เกิน 100 บาทต่อรายการ (BR-PAY-01)
- เมื่อ Offline เกิน 12 ชั่วโมง แอปล็อกการชำระจนกว่าจะ Sync (BR-PAY-03)
- เมื่อ Sync พบยอดจริงไม่พอ ยอมให้ Wallet ติดลบได้ (BR-PAY-02)
- Daily Limit มีผลกับทั้ง Online และ Offline (BR-LIMIT-01)

## Acceptance criteria

| รหัส AC | Given | When | Then |
|---|---|---|---|
| **AC5.1** | มีสัญญาณเน็ต, บัตร `active`, Wallet `100.00` บาท และยอดซื้อ `35.00` บาท | Merchant ระบุยอดและแตะบัตร | สำเร็จ (`201 Created`): ตัด Wallet เหลือ `65.00` บาทและแสดงผลชำระสำเร็จ |
| **AC5.2** | แอปไม่มีเน็ต, Cached Balance `50.00` บาท และยอดซื้อ `30.00` บาท | Merchant แตะบัตรในโหมด Offline | สำเร็จแบบ Offline: บันทึกใน Local SQLite, Cached Balance เหลือ `20.00` บาท และแสดงสถานะรอ Sync |
| **AC5.3** | แอปไม่มีเน็ตและยอดซื้อ `120.00` บาท | Merchant พยายามชำระแบบ Offline | ปฏิเสธแบบ Offline: แจ้งว่าเพดานต่อรายการคือ 100 บาท; ไม่บันทึกรายการ |
| **AC5.4** | แอป Offline เกิน 12 ชั่วโมงโดยยังมีรายการรอ Sync | Merchant เข้าใช้งานหน้าคิดเงิน | ระงับการชำระและแจ้งให้เชื่อมต่ออินเทอร์เน็ตเพื่อ Sync ก่อน |
| **AC5.5** | แอปกลับมา Online และส่งรายการ Offline พร้อม `offline_trx_id` | Server ประมวลผลรายการ Sync | สำเร็จ (`200 OK`): ตรวจ `offline_trx_id`, บันทึกรายการ และตัดยอดจริง; หากยอดจริงไม่พอ Wallet ติดลบได้ |
| **AC5.6** *(เสนอ)* | ยอดใช้จ่ายสะสมของวันรวมรายการที่กำลังจะทำเกิน Daily Limit ที่มีผล | มีการชำระแบบ Online หรือ Offline | ปฏิเสธด้วย `DAILY_LIMIT_EXCEEDED`; ไม่บันทึกรายการใหม่หรือหักยอด |
| **AC5.7** *(เสนอ)* | คำขอ Online ไม่มีจำนวนเงิน หรือยอดไม่ใช่จำนวนเงินที่ถูกต้อง | Merchant ส่งคำขอชำระ | ปฏิเสธ (`400 INVALID_PAYMENT_REQUEST`); ไม่หัก Wallet |
| **AC5.8** *(เสนอ)* | RFID UID ไม่มีในระบบ หรือบัตรไม่อยู่ในสถานะ `active` | Merchant พยายามชำระ | ปฏิเสธ (`404 CARD_NOT_FOUND` หรือ `409 CARD_NOT_ACTIVE`); ไม่หัก Wallet |
| **AC5.9** *(เสนอ)* | ผู้เรียกไม่ได้ยืนยันตัวตนหรือไม่มีสิทธิ์ Merchant | ผู้เรียกพยายามสร้าง/Sync รายการชำระ | ปฏิเสธ (`401 AUTHENTICATION_REQUIRED` หรือ `403 MERCHANT_ACCESS_DENIED`); ไม่บันทึกรายการ |
| **AC5.10** *(เสนอ)* | รายการที่มี `offline_trx_id` เดียวกันถูก Sync และบันทึกสำเร็จแล้ว | แอปส่งรายการเดิมซ้ำ | คืนผลเดิม (`200 OK`); ไม่สร้างรายการหรือหัก Wallet ซ้ำ |
| **AC5.11** *(เสนอ)* | Wallet มีเงินไม่พอสำหรับยอด Online และไม่ใช่การ Sync รายการ Offline | Merchant ส่งคำขอชำระ | ปฏิเสธ (`409 INSUFFICIENT_BALANCE`); ไม่สร้างรายการและไม่เปลี่ยน Wallet |

## นอกขอบเขต

- การเติมเงินเข้า Wallet อยู่ใน UC-03
- การยกเลิกรายการชำระอยู่ใน UC-06
- การสรุปยอดและอนุมัติโอนเงินอยู่ใน UC-07

## คำถามที่ต้องตอบ

- Offline ตรวจ Daily Limit จาก cache แบบใด?
- Wallet ติดลบได้ต่ำสุดเท่าใด? BR-PAY-02 ไม่ระบุตัวเลข
- ถ้า idempotency key เดิมถูกส่งพร้อมข้อมูลต่างจากเดิมควรตอบอย่างไร?
- รายการที่ค้างเกิน 12 ชั่วโมงยัง Sync ได้หรือไม่?
- AC5.6–AC5.11 เป็นข้อเสนอ; ต้องยืนยัน status/error และพิจารณาแบ่ง Story เพราะมี 11 AC

## Sub-tasks (ร่าง)

- `Spec: รีวิว use case และ AC5.1–AC5.11`
- `Spec: ระบุ request/response และ error ของ payment/sync endpoints (AC5.1–AC5.11)`
- `DB: ออกแบบ Payment, idempotency key และข้อจำกัดยอด (AC5.1, AC5.5, AC5.10–AC5.11)`
- `Domain: บังคับสถานะบัตร, Daily Limit และยอดชำระ (AC5.1, AC5.6, AC5.8, AC5.11)`
- `App: ประสานการตรวจ Merchant/Student และ Sync (AC5.5–AC5.10)`
- `Infra: บันทึก/Sync payment กับ PostgreSQL จริง (AC5.1, AC5.5, AC5.10–AC5.11)`
- `HTTP: ตรวจ input และ map error/status ตาม OpenAPI (AC5.7–AC5.9, AC5.11)`
- `E2E: ทดสอบ Online, Offline, Sync, conflict และ replay (AC5.1–AC5.11)`

## Definition of Ready (รอรีวิว)

| รายการ | สถานะ |
|---|---|
| มี Online/Offline success, limit, 12-hour lock, Sync, invalid input, not found, permission และ duplicate | ✅ |
| ตัวเลข 100 บาทและ 12 ชั่วโมงชัด; ขีดจำกัดยอดติดลบและ cache policy ยังไม่ชัด | ⚠️ |
| มีนอกขอบเขตและ component | ✅ |
| Story points | ❌ ไม่มีข้อมูล; ไม่เดา |
| 11 AC อาจใหญ่เกิน Story เดียว; ควร estimate และพิจารณาแยก Online/Offline/Sync | ⚠️ |

## อ้างอิง

- [Use case UC-05](../usecases/UC-05-merchant-payments.md)
- PRD: `POST /merchant/payments`, `POST /merchant/payments/sync`

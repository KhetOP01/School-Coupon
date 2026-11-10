# Implementation Plan: UC-06 ร้านค้ายกเลิกรายการชำระเงิน (Void Transaction)

## 1. ขอบเขตและ Acceptance Criteria
ตามเอกสาร [UC-06-void-transaction.md](../usecases/UC-06-void-transaction.md) และ PRD:
- **BR-VOID-01:** Merchant สามารถยกเลิกรายการชำระเงินได้ภายในวันเดียวกัน ก่อนเวลา 23:59:59 โดยไม่ต้องสแกนบัตรนักเรียนซ้ำ
- **AC6.1:** รายการเกิดขึ้นภายในวันเดียวกันก่อน 23:59:59 -> กด Void -> `200 OK`: คืนยอดเข้า Wallet นักเรียน และบันทึก Transaction `VOID` อ้างถึงรายการต้นทาง
- **AC6.2:** รายการเกิดขึ้นวันก่อนหน้า -> กด Void -> ปฏิเสธ `400 INVALID_VOID_PERIOD`
- **AC6.3:** ไม่พบ Transaction ID -> ปฏิเสธ `404 PAYMENT_NOT_FOUND`
- **AC6.4:** ไม่ได้ยืนยันตัวตน (`401 AUTHENTICATION_REQUIRED`) หรือไม่ใช่ Merchant เจ้าของรายการ (`403 MERCHANT_ACCESS_DENIED`)
- **AC6.5:** รายการถูก Void ไปแล้ว -> ปฏิเสธ `409 PAYMENT_ALREADY_VOIDED`
- **AC6.6:** รายการไม่อยู่ในสถานะที่ยกเลิกได้ -> ปฏิเสธ `409 PAYMENT_NOT_VOIDABLE`
- **AC6.7:** คำขอไม่มี Transaction ID หรือรูปแบบ UUID ไม่ถูกต้อง -> ปฏิเสธ `400 INVALID_REQUEST`

## 2. การเปลี่ยนแปลงฐานข้อมูล (Database Schema)
- Migration: `db/migrations/20261110_1900_uc_06_void_transactions.sql`
  - ตาราง `payments`: เพิ่มคอลัมน์ `status` ('COMPLETED' | 'VOIDED'), `voided_at`, `void_reason`
  - ตาราง `payment_voids`: บันทึกประวัติการ Void อ้างอิง `payment_id` (Unique foreign key)
- Seed: `db/seed.sql` เพิ่ม fixtures สำหรับทดสอบ AC6.1, AC6.2, AC6.4, AC6.5

## 3. สัญญา API (OpenAPI Specification)
- Path: `POST /merchant/payments/{id}/void`
- Path Parameter: `id` (UUID)
- Request Body (optional): `{ "reason": "string" }`
- Responses:
  - `200`: `VoidPaymentResult`
  - `400`: `INVALID_VOID_PERIOD`, `INVALID_REQUEST`
  - `401`: `AUTHENTICATION_REQUIRED`
  - `403`: `MERCHANT_ACCESS_DENIED`
  - `404`: `PAYMENT_NOT_FOUND`
  - `409`: `PAYMENT_ALREADY_VOIDED`, `PAYMENT_NOT_VOIDABLE`

## 4. สถาปัตยกรรม DDD & แผนการพัฒนาแบบ TDD
1. **Domain Layer:**
   - ขยาย `Payment.ts`: เพิ่ม `status`, `voidedAt`, `voidReason`, เมธอด `void(now: Date, reason?: string)` พร้อม domain invariant checks
   - Unit tests: `src/modules/payments/domain/__tests__/Payment.spec.ts`
2. **Application Layer:**
   - Use Case: `VoidPayment.ts`
   - Ports: เพิ่ม `findPaymentById(id: string)` และ `savePaymentVoidAndCreditWallet(payment, reason)` ใน `PaymentRepository`
   - Unit tests: `src/modules/payments/application/__tests__/VoidPayment.spec.ts`
3. **Infrastructure Layer:**
   - เพิ่ม query ใน `PostgresPaymentRepository.ts`
   - อัปเดต `getDailySpentAmount` ให้รวมเฉพาะรายการ `COMPLETED`
   - Integration tests: `tests/integration/payments.repository.spec.ts`
4. **Interface / HTTP Layer:**
   - เพิ่ม route `POST /merchant/payments/:id/void` ใน `MerchantPaymentController.ts`
   - Controller unit tests: `src/modules/payments/interface/http/__tests__/merchant-payment.controller.spec.ts`
5. **E2E Tests:**
   - ทดสอบ API ทุกเส้นทางตาม AC6.1 - AC6.7 ใน `tests/e2e/void-payment.e2e.spec.ts`

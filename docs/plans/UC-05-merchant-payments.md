# แผนการพัฒนา UC-05: ร้านค้ารับชำระเงินแบบ Online และ Offline (Merchant Payments)

## ขอบเขตงาน (Scope)
ครอบคลุม Acceptance Criteria AC5.1 ถึง AC5.11 จาก `docs/usecases/UC-05-merchant-payments.md` และ `openapi.yaml`:
- **AC5.1:** ชำระเงินแบบ Online สำเร็จ (`201 Created`): ตรวจ Merchant, บัตร `active`, ยอดเงินพอ และไม่เกินวงเงินรายวัน หักยอด Wallet จริง
- **AC5.2 & AC5.3 & AC5.4:** พฤติกรรมฝั่ง Client/App รองรับ Local SQLite, เพดานไม่เกิน 100 บาทต่อรายการ และแจ้งเตือน Sync ภายใน 12 ชั่วโมง
- **AC5.5:** ร้านค้าส่ง Sync รายการ Offline มายัง Server (`200 OK`): ตรวจสอบ `offline_trx_id`, บันทึกรายการ และตัดยอด Wallet จริง (อนุญาตให้ยอดติดลบได้ถึง -500.00 ตาม BR-PAY-02)
- **AC5.6:** ปฏิเสธเมื่อยอดใช้จ่ายสะสมวันนี้เกิน Daily Limit ที่มีผล (`409 DAILY_LIMIT_EXCEEDED`)
- **AC5.7:** ปฏิเสธคำขอชำระเงินที่ยอดไม่ถูกต้อง (`400 INVALID_PAYMENT_REQUEST`)
- **AC5.8:** ปฏิเสธเมื่อไม่พบบัตร RFID (`404 CARD_NOT_FOUND`) หรือบัตรไม่ active (`409 CARD_NOT_ACTIVE`)
- **AC5.9:** ตรวจสอบสิทธิ์ร้านค้า (`401 AUTHENTICATION_REQUIRED` / `403 MERCHANT_ACCESS_DENIED`)
- **AC5.10:** การ Sync รายการที่มี `offline_trx_id` ซ้ำ ส่งผลแบบ idempotent (`200 OK`, `duplicate: true`) โดยไม่ตัดยอด Wallet ซ้ำ
- **AC5.11:** ปฏิเสธรายการ Online หากยอดเงินใน Wallet ไม่เพียงพอ (`409 INSUFFICIENT_BALANCE`)

---

## แผนงานแบ่งตามชั้น DDD และ Acceptance Criteria

### 1. Domain Layer (`src/modules/payments/domain/`)
- **Aggregate Root / Value Objects:**
  - `Payment`: Aggregate Root จัดการสถานะรายการ (`id`, `studentId`, `merchantId`, `cardId`, `amount`, `paymentMode`, `offlineTrxId`, `createdAt`)
  - `PaymentAmount`: Value Object ตรวจสอบยอดเงินชำระเป็นจำนวนบวก ทศนิยมไม่เกิน 2 ตำแหน่ง (AC5.7)
  - `PaymentMode`: 'ONLINE' | 'OFFLINE'
- **Unit Tests:**
  - `src/modules/payments/domain/__tests__/Payment.spec.ts`
  - `src/modules/payments/domain/__tests__/PaymentAmount.spec.ts`

### 2. Application Layer (`src/modules/payments/application/`)
- **Ports & Use Cases:**
  - `MerchantGateway` / `MerchantAccessValidator`: ตรวจสอบสถานะร้านค้า (AC5.9)
  - `StudentAccountGateway`: ตรวจสอบสถานะบัตร RFID, ยอดเงินคงเหลือ, วงเงินใช้จ่ายรายวัน และตัดยอด Wallet (AC5.1, AC5.5, AC5.6, AC5.8, AC5.11)
  - `ProcessOnlinePayment`: รับชำระเงิน Online (AC5.1, AC5.6–AC5.9, AC5.11)
  - `SyncOfflinePayment`: ประมวลผล Sync รายการ Offline พร้อม idempotency ผ่าน `offline_trx_id` (AC5.5, AC5.6, AC5.8–AC5.10)
- **Unit Tests:**
  - `src/modules/payments/application/__tests__/ProcessOnlinePayment.spec.ts`
  - `src/modules/payments/application/__tests__/SyncOfflinePayment.spec.ts`

### 3. Infrastructure Layer (`src/modules/payments/infrastructure/`)
- **Repository:**
  - `PostgresPaymentRepository`: บันทึกข้อมูลลงตาราง `payments`, คำนวณยอดรวมรายวัน, ค้นหา `offline_trx_id` และตัดยอด Wallet ร่วมกับ `students`
- **Integration Tests:**
  - `tests/integration/payments.repository.spec.ts`

### 4. Interface / HTTP Layer (`src/modules/payments/interface/http/`)
- **Controllers & DTOs:**
  - `MerchantPaymentController`:
    - `POST /merchant/payments` (Online payment)
    - `POST /merchant/payments/sync` (Offline sync)
- **Unit / Controller Tests:**
  - `src/modules/payments/interface/http/__tests__/merchant-payment.controller.spec.ts`

### 5. E2E Testing
- **E2E Tests:**
  - `tests/e2e/merchant-payment.e2e.spec.ts`: ทดสอบ flow ทั้ง Online, Offline Sync, Idempotency, Insufficient Balance, Daily Limit Exceeded และ Error ต่างๆ

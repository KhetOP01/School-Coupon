# แผนการพัฒนา UC-03: ผู้ปกครองเติมเงินเข้า Wallet นักเรียน (Parent Top-Up)

## ขอบเขตงาน (Scope)
ครอบคลุม Acceptance Criteria AC3.1 ถึง AC3.9 จาก `docs/usecases/UC-03-parent-top-up.md` และ `openapi.yaml`:
- **AC3.1:** ยอดเติมเข้า Wallet หลัง Payment Gateway ยืนยันชำระสำเร็จ (`200 OK`)
- **AC3.2:** ปฏิเสธยอดเติมต่ำกว่าขั้นต่ำ 50.00 บาท (`400 INVALID_TOPUP_AMOUNT`)
- **AC3.3:** หักกลบยอด Wallet ติดลบอัตโนมัติ (เช่น เดิม -30.00 เติม 100.00 ยอดคงเหลือกลายเป็น 70.00)
- **AC3.4:** ปฏิเสธยอดเติมเกินขั้นสูงสุด 2,000.00 บาท (`400 INVALID_TOPUP_AMOUNT`)
- **AC3.5:** ปฏิเสธกรณีไม่พบนักเรียน (`404 STUDENT_NOT_FOUND`)
- **AC3.6:** ตรวจสอบ authentication และ Parent-Student authorization (`401 AUTHENTICATION_REQUIRED` / `403 PARENT_STUDENT_ACCESS_DENIED`)
- **AC3.7:** จัดการผล Gateway: ล้มเหลว (`502 PAYMENT_GATEWAY_FAILED`) หรือรอผล (`202 ACCEPTED` สถานะ `pending`)
- **AC3.8:** Idempotent Gateway callback: การยืนยันรายการซ้ำด้วย reference เดิม คืนผลเดิม (`duplicate: true`) โดยไม่เพิ่มยอด Wallet ซ้ำ
- **AC3.9:** ตรวจสอบรูปแบบจำนวนเงิน (positive, max 2 decimal places)

---

## แผนงานแบ่งตามชั้น DDD และ Acceptance Criteria

### 1. Domain Layer
- **Aggregate Root / Value Objects:**
  - `Money`: value object จัดการจำนวนเงินและทศนิยม 2 ตำแหน่ง
  - `TopUpAmount`: ตรวจสอบจำนวนเงินเป็นบวกและไม่เกิน 2 ตำแหน่งทศนิยม (AC3.9)
  - `TopUpPolicy`: ตรวจสอบช่วงขั้นต่ำ/ขั้นสูง (inclusive) (AC3.2, AC3.4)
  - `TopUp`: จัดการสถานะรายการเติมเงิน (`pending`, `succeeded`, `failed`) และ idempotency (AC3.1, AC3.7, AC3.8)
  - `Wallet`: จัดการยอดเงินและการรับยอดเติมเงิน รวมถึงหักลบยอดติดลบ (AC3.1, AC3.3)
- **Unit Tests:**
  - `src/modules/student-account/domain/__tests__/top-up-amount.spec.ts`
  - `src/modules/student-account/domain/__tests__/top-up-policy.spec.ts`
  - `src/modules/student-account/domain/__tests__/TopUp.spec.ts`
  - `src/modules/student-account/domain/__tests__/wallet.spec.ts`

### 2. Application Layer
- **Use Cases & Services:**
  - `ValidateTopUpAmount`: ตรวจสอบความถูกต้องของจำนวนเงินตาม policy (AC3.2, AC3.4, AC3.9)
  - `AuthorizeParentStudentAccess`: ตรวจสอบสิทธิ์ผู้ปกครองต่อนักเรียน (AC3.6)
  - `FindStudentForTopUp`: ค้นหานักเรียนและคืน `STUDENT_NOT_FOUND` หากไม่มี (AC3.5)
  - `StartTopUpPayment`: เริ่มรายการชำระกับ Payment Gateway บันทึก pending และจัดการ succeeded/failed/pending (AC3.1, AC3.7)
  - `TopUpStudentWallet`: ประสานงานการเติมเงินหลักสำหรับ Parent App (AC3.1–AC3.7)
  - `ConfirmGatewayTopUp`: จัดการ webhook callback จาก Payment Gateway แบบ idempotent (AC3.8)
- **Unit Tests:**
  - `src/modules/student-account/application/__tests__/ValidateTopUpAmount.spec.ts`
  - `src/modules/student-account/application/__tests__/AuthorizeParentStudentAccess.spec.ts`
  - `src/modules/student-account/application/__tests__/FindStudentForTopUp.spec.ts`
  - `src/modules/student-account/application/__tests__/StartTopUpPayment.spec.ts`
  - `src/modules/student-account/application/__tests__/TopUpStudentWallet.spec.ts`

### 3. Infrastructure Layer
- **Repository:**
  - `PostgresTopUpRepository`: บันทึก `wallet_topups`, อัปเดต `students.wallet_balance`, และบันทึก `wallet_ledger_entries` ใน transaction เดียว พร้อม row-level lock (`FOR UPDATE`) ป้องกัน race condition และ double-credit (AC3.1, AC3.3, AC3.8)
- **Integration Tests:**
  - `tests/integration/top-up.repository.spec.ts`: ทดสอบกับ PostgreSQL จริง

### 4. Interface / HTTP Layer
- **Controllers & DTOs:**
  - `TopUpWalletController`:
    - `POST /parent/wallet/topup` (AC3.1–AC3.7)
    - `GET /parent/wallet/topups/:topUpId` (AC3.7)
  - `GatewayCallbackController`:
    - `POST /callbacks/payment-gateway/topup` (AC3.8)
- **E2E Tests:**
  - `tests/e2e/parent-top-up.e2e.spec.ts`: ทดสอบ flow ทั้งหมดของ UC-03

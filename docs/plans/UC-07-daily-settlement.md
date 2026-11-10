# Implementation Plan: UC-07 สรุปยอดขายรายวันและอนุมัติยอดโอนร้านค้า (Daily Settlement & Approval)

## 1. ขอบเขตและ Acceptance Criteria
ตามเอกสาร [UC-07-daily-settlement.md](../usecases/UC-07-daily-settlement.md) และ PRD:
- **BR-SETTLE-01:** สรุปยอดขายรายวันของร้านค้าและต้องได้รับการอนุมัติจาก Staff ก่อนโอนเงิน
- **BR-FEE-01:** หักค่าธรรมเนียมเป็นร้อยละตามที่กำหนดแยกรายร้านค้า (`fee_percent`)
- **AC7.1:** เมื่อสิ้นวัน (23:59:59 น.) คำนวณ Gross, Fee, Net ของร้านค้าที่มีรายการขาย และสร้าง Settlement สถานะ `PENDING_APPROVAL`
- **AC7.2:** Staff ตรวจสอบยอดและกด Approve ผ่าน `POST /admin/settlements/:id/approve` -> สำเร็จ (`200 OK`): เปลี่ยนสถานะเป็น `APPROVED` พร้อมบันทึกผู้อนุมัติและเวลา
- **AC7.3:** หาก Settlement วันนั้นถูกสร้างแล้ว การรันซ้ำจะไม่สร้างซ้ำหรือเปลี่ยนยอดเดิม (Idempotent)
- **AC7.4:** ไม่พบ Settlement ID -> ปฏิเสธ `404 SETTLEMENT_NOT_FOUND`
- **AC7.5:** ไม่ได้เข้าสู่ระบบ (`401 AUTHENTICATION_REQUIRED`) หรือไม่ใช่ Staff (`403 STAFF_ACCESS_REQUIRED`)
- **AC7.6:** Settlement ไม่อยู่ในสถานะ `PENDING_APPROVAL` -> ปฏิเสธ `409 SETTLEMENT_NOT_PENDING`
- **AC7.7:** Staff อนุมัติ Settlement ที่เป็น `APPROVED` อยู่แล้วซ้ำ -> คืนผลเดิม `200 OK` (Idempotent approval)
- **AC7.8:** รูปแบบ ID ไม่ถูกต้อง -> ปฏิเสธ `400 INVALID_REQUEST`

## 2. การเปลี่ยนแปลงฐานข้อมูล (Database Schema)
- Migration: `db/migrations/20261110_2000_uc_07_daily_settlement.sql`
  - ตาราง `settlements`:
    - `id SERIAL PRIMARY KEY`
    - `merchant_id INT NOT NULL REFERENCES merchants(id)`
    - `settlement_date DATE NOT NULL`
    - `gross_amount NUMERIC(10, 2) NOT NULL`
    - `fee_amount NUMERIC(10, 2) NOT NULL`
    - `net_amount NUMERIC(10, 2) NOT NULL`
    - `status VARCHAR(20) NOT NULL DEFAULT 'PENDING_APPROVAL' CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'PAID'))`
    - `approved_by VARCHAR(100)`
    - `approved_at TIMESTAMPTZ`
    - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
    - `UNIQUE(merchant_id, settlement_date)`
- Seed: `db/seed.sql` เพิ่ม fixtures ร้านค้า 701, 702, 703 และรายการ Settlements

## 3. สัญญา API (OpenAPI Specification)
- Path: `POST /admin/settlements/{id}/approve`
- Parameters: `id` (integer)
- Security: `StaffAdminSessionCookie`
- Responses:
  - `200`: `SettlementResult`
  - `400`: `INVALID_REQUEST`
  - `401`: `AUTHENTICATION_REQUIRED`
  - `403`: `STAFF_ACCESS_REQUIRED`
  - `404`: `SETTLEMENT_NOT_FOUND`
  - `409`: `SETTLEMENT_NOT_PENDING`

## 4. โครงสร้างและการพัฒนาตามแนวทาง DDD & TDD
1. **Domain Layer (`src/modules/merchant-settlement/domain/`):**
   - Aggregate Root `Settlement`:
     - Invariant: คำนวณ fee และ net ถูกต้อง, อนุมัติได้เฉพาะสถานะ `PENDING_APPROVAL` หรือ idempotent เมื่อ `APPROVED`
   - Unit tests: `Settlement.spec.ts`
2. **Application Layer (`src/modules/merchant-settlement/application/`):**
   - Use Cases:
     - `GenerateDailySettlements`: ดึงยอดขายร้านค้าในวันที่กำหนด, คำนวณค่าธรรมเนียม และบันทึก Settlement (ข้ามร้านค้าที่มีอยู่แล้ว)
     - `ApproveSettlement`: โหลด Settlement, ตรวจสอบสถานะ, เรียก `settlement.approve(staffSubject, now)` และบันทึก
   - Ports: `SettlementRepository`, `MerchantSalesGateway`
   - Unit tests: `GenerateDailySettlements.spec.ts`, `ApproveSettlement.spec.ts`
3. **Infrastructure Layer (`src/modules/merchant-settlement/infrastructure/`):**
   - `PostgresSettlementRepository`: ค้นหาและบันทึก Settlement
   - `PostgresMerchantSalesGateway`: รวมยอดขายของร้านค้าจากตาราง `payments` (เฉพาะสถานะ `COMPLETED`)
   - Integration tests: `tests/integration/settlement.repository.spec.ts`
4. **Interface / HTTP Layer (`src/modules/merchant-settlement/interface/http/`):**
   - Controller: `SettlementController` (`POST admin/settlements/:id/approve`)
   - Guard: `StaffAuthGuard`
   - Unit tests: `settlement.controller.spec.ts`
5. **E2E Testing:**
   - `tests/e2e/daily-settlement.e2e.spec.ts` ทดสอบครบทุกข้อ AC7.1 - AC7.7

# แผนการพัฒนา UC-04: ผู้ปกครองตั้งวงเงินใช้จ่ายรายวัน (Daily Limit)

## ขอบเขตงาน (Scope)
ครอบคลุม Acceptance Criteria AC4.1 ถึง AC4.5 จาก `docs/usecases/UC-04-daily-limit.md` และ `openapi.yaml`:
- **AC4.1:** ตั้งวงเงินสำเร็จ (เช่น 100.00 -> 150.00) บันทึก `next_daily_limit = 150.00`, วงเงินของวันปัจจุบันยังคงเป็น 100.00 และมีผลวันถัดไปเวลา 00:00 น. (`200 OK`)
- **AC4.2:** วงเงินไม่ถูกต้อง (ติดลบ, ไม่ใช่ตัวเลข, หรือมีทศนิยมเกิน 2 ตำแหน่ง) ปฏิเสธ (`400 INVALID_DAILY_LIMIT`)
- **AC4.3:** ไม่พบรหัสนักเรียนในระบบ ปฏิเสธ (`404 STUDENT_NOT_FOUND`)
- **AC4.4:** ผู้เรียกไม่ได้ยืนยันตัวตน หรือผู้ปกครองไม่มีสิทธิ์ดูแลนักเรียน ปฏิเสธ (`401 AUTHENTICATION_REQUIRED` / `403 PARENT_STUDENT_ACCESS_DENIED`)
- **AC4.5:** ผู้ปกครองส่งคำขอตั้งวงเงินค่าเดิมซ้ำในวันเดียวกัน ปฏิบัติแบบ idempotent (`200 OK`) ค่า `next_daily_limit` คงเดิมและ `current_daily_limit` ไม่เปลี่ยน

---

## แผนงานแบ่งตามชั้น DDD และ Acceptance Criteria

### 1. Domain Layer
- **Value Objects & Aggregate Root:**
  - `DailyLimitAmount`: ตรวจสอบจำนวนเงินเป็นตัวเลขที่ไม่ติดลบ และทศนิยมไม่เกิน 2 ตำแหน่ง (AC4.2)
  - `Student`: เพิ่มฟิลด์ `currentDailyLimit`, `nextDailyLimit`, `dailyLimitEffectiveDate` และเมธอด `setDailyLimit(newLimit: DailyLimitAmount, now: Date)` จัดการการตั้งค่าแบบมีผลวันถัดไป และรองรับ idempotency (AC4.1, AC4.5)
- **Unit Tests:**
  - `src/modules/student-account/domain/__tests__/daily-limit-amount.spec.ts` (AC4.2)
  - `src/modules/student-account/domain/__tests__/student.spec.ts` (เพิ่มเคส AC4.1, AC4.5)

### 2. Application Layer
- **Use Cases & Services:**
  - `SetDailyLimit`: ตรวจสอบสิทธิ์ผู้ปกครอง ค้นหานักเรียน เรียก domain เพื่อตั้งวงเงิน และบันทึกลง repository (AC4.1–AC4.5)
- **Unit Tests:**
  - `src/modules/student-account/application/__tests__/SetDailyLimit.spec.ts` (AC4.1–AC4.5)

### 3. Infrastructure Layer
- **Repository:**
  - `StudentAccountPostgresRepository`: เพิ่ม/ปรับเมธอดค้นหาและบันทึกวงเงินรายวันของนักเรียน (`current_daily_limit`, `next_daily_limit`, `daily_limit_effective_date`)
- **Integration Tests:**
  - `tests/integration/student-account.repository.spec.ts` (หรือ `daily-limit.repository.spec.ts`)

### 4. Interface / HTTP Layer
- **Controllers & DTOs:**
  - `DailyLimitController`: `PATCH /parent/students/:studentId/daily-limit`
  - ตรวจสอบ input DTO และดึงข้อมูล Parent จาก Authorization header หรือ `x-parent-id`
- **Unit / Controller Tests:**
  - `src/modules/student-account/interface/http/__tests__/daily-limit.controller.spec.ts` (AC4.1–AC4.5)

### 5. E2E Testing
- **E2E Tests:**
  - `tests/e2e/daily-limit.e2e.spec.ts`: ทดสอบ flow ครบทุก AC บน embedded PostgreSQL จริง (AC4.1–AC4.5)

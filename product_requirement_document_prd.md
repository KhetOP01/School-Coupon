# Product Requirement Document (PRD)

## ระบบคูปองดิจิทัลแทนเงินสดด้วย RFID สำหรับโรงเรียน (School Cashless RFID System)

## 1. ข้อมูลทั่วไปและสถาปัตยกรรมระบบ (Project Overview & Tech Stack)

### 1.1 วัตถุประสงค์ (Objectives)

* เปลี่ยนการใช้เงินสดและคูปองกระดาษในโรงเรียนให้เป็นระบบชำระเงินดิจิทัลผ่านบัตร RFID

* เพิ่มความสะดวกให้ผู้ปกครองในการเติมเงิน ติดตามประวัติการใช้จ่าย กำหนดวงเงิน และอายัดบัตรนักเรียนได้ทันที

* ให้สตาฟโรงเรียนบริหารจัดการบัตร อายัดบัตรแทนผู้ปกครอง และคืนเงินนักเรียนย้ายเข้า-ออกได้อย่างรวดเร็ว

* ช่วยให้ร้านค้าในโรงเรียนรับชำระเงินได้รวดเร็ว รองรับการทำงานในสภาวะสัญญาณอินเทอร์เน็ตขัดข้อง (Offline Mode)

### 1.2 สถาปัตยกรรมระบบ และ Tech Stack (Locked Architecture)

* **Backend:** NestJS (TypeScript, Modular Clean Architecture, TDD Supported)

* **Database:** PostgreSQL (ใช้ Relational Transaction ACID, Database Constraints, Indexes และ JSONB)

* **Mobile Applications:** React Native (แอปพลิเคชันสำหรับผู้ปกครอง และแอปพลิเคชันสำหรับพ่อค้า-แม่ค้า)

* **Web Admin Application:** Next.js (สำหรับสตาฟ/เจ้าหน้าที่โรงเรียน)

* **Hardware Integration:** RFID Reader (13.56 MHz MIFARE Classic / USB-OTG Direct Keyboard Emulation / Smartphone NFC)

## 2. ขอบเขตผู้ใช้งาน (Actors & Roles)

1. **นักเรียน (Student):** ถือบัตร RFID แตะชำระเงินค่าอาหารและสินค้าภายในโรงเรียน

2. **ผู้ปกครอง (Parent):** ใช้ React Native Mobile App เติมเงิน กำหนดวงเงินต่อวัน (Daily Limit) ดูประวัติการใช้จ่าย และกดอายัด/ปลดอายัดบัตรชั่วคราวได้ด้วยตนเอง

3. **พ่อค้า-แม่ค้า (Merchant):** ใช้ React Native Mobile App เชื่อมต่อเครื่องสแกน RFID คิดเงิน Void รายการ และดูสรุปยอดขายรายวัน

4. **เจ้าหน้าที่โรงเรียน (Staff / Admin):** ใช้ Next.js Web Admin ออกบัตร ผูกบัตรใหม่ ระงับ/อายัดบัตร (กรณีผู้ปกครองแจ้งเรื่อง) คืนเงินนักเรียนย้ายออก ตั้งค่าวงเงินเติมเงินระบบ และกดอนุมัติการโอนเงิน (Settlement Approval) ให้ร้านค้า

## 3. กฎทางธุรกิจหลัก (Business Rules - BR)

### 3.1 การจัดการบัตร RFID (BR-CARD)

* **BR-CARD-01:** นักเรียน 1 คน สามารถผูกบัตร RFID ที่มีสถานะ `active` ได้เพียง **1 ใบเท่านั้น**

* **BR-CARD-02:** เมื่อเปลี่ยนบัตรใหม่ ยอดเงินคงเหลือใน Wallet จะผูกอยู่กับตัวตนนักเรียน และโอนย้ายมายังบัตรใหม่ **100% ทันที**

* **BR-CARD-03:** การเก็บค่าธรรมเนียมออกบัตรใหม่กรณีบัตรหาย ดำเนินการเก็บเงินสดแยกภายนอกระบบ ไม่หักจากยอดเงินคงเหลือใน Wallet

* **BR-CARD-04 (Parent & Admin Freeze):** การระงับบัตรชั่วคราว (`suspended`) หรือปลดการระงับ สามารถทำได้ทั้งจาก **ผู้ปกครองผ่าน Parent Mobile App** และ **สตาฟ/แอดมินผ่าน Web Admin** บัตรที่ผู้ปกครองแจ้งว่าหายให้เปลี่ยนเป็น `lost` ทันทีและห้ามนำกลับมาใช้ชำระเงิน; ต้องออกบัตรใหม่ตาม UC-01 ส่วนบัตร `suspended` ที่ไม่ได้แจ้งว่าหายจึงปลดกลับเป็น `active` ได้

### 3.2 การชำระเงินและโหมด Offline (BR-PAY)

* **BR-PAY-01:** ในโหมด Offline แอปแม่ค้าจะตรวจสอบยอดเงินจาก **Cached Balance** ล่าสุดในเครื่อง ควบคู่กับการจำกัดยอดชำระสูงสุดไม่เกิน **100 บาท ต่อรายการ**

* **BR-PAY-02:** หากเกิด Conflict ในการ Sync ข้อมูล Offline แล้วพบว่าเงินจริงไม่พอตัด อนุญาตให้ยอดเงินคงเหลือ **ติดลบได้** และระบบจะหักเงินอัตโนมัติเมื่อมีการเติมเงินครั้งถัดไป

* **BR-PAY-03:** แอปแม่ค้าสะสม Transaction แบบ Offline ไว้ในเครื่องได้สูงสุด **12 ชั่วโมง** หากเกินกำหนด แอปจะล็อกการชำระเงินจนกว่าจะ Sync ขึ้น Server

### 3.3 การยกเลิกรายการชำระเงิน (BR-VOID)

* **BR-VOID-01:** พ่อค้า-แม่ค้าสามารถกดยกเลิกรายการ (Void/Refund) รายการใดก็ได้ที่เกิดขึ้น **ภายในวันเดียวกัน** (ก่อน 23:59 น.) ผ่านแอปแม่ค้า โดย **ไม่ต้องสแกนบัตรนักเรียนซ้ำ**

### 3.4 การกำหนดวงเงินและเติมเงิน (BR-LIMIT & BR-TOPUP)

* **BR-TOPUP-01:** ยอดเติมเงินขั้นต่ำและขั้นสูงต่อครั้ง ถูกกำหนดจากระบบกลาง (System Settings) โดยสตาฟโรงเรียนสามารถปรับเปลี่ยนได้บน Web Admin

* **BR-LIMIT-01 (Next Day Effective):** การแก้ไขวงเงินใช้จ่ายรายวัน (Daily Limit) โดยผู้ปกครอง จะ **มีผลในวันถัดไป** (เริ่ม 00:00 น.) เสมอ เพื่อป้องกันนักเรียนแก้ไขวงเงินกลางวัน และวงเงินนี้มีผลครอบคลุมทั้งรายการ Online และ Offline

### 3.5 ค่าธรรมเนียมและการสรุปยอดโอน (BR-SETTLE & BR-FEE)

* **BR-FEE-01:** ค่าธรรมเนียมโรงเรียน คิดแบบ **เปอร์เซ็นต์ (%)** จากยอดขาย โดยตั้งค่าแยกตามรายร้านค้าได้ (บางร้านอาจกำหนดเป็น 0.00% หากคิดรวมในค่าเช่าแผง)

* **BR-SETTLE-01 (Manual Approval):** เมื่อสิ้นวัน (23:59 น.) ระบบจะตัดรอบสรุปยอด Net Amount (ยอดขาย - ค่าธรรมเนียม) ของแต่ละร้านค้า และตั้งสถานะเป็น `PENDING_APPROVAL` โดยสตาฟโรงเรียนต้องเป็นผู้กด **อนุมัติ (Approve)** บน Web Admin เพื่อเปลี่ยนสถานะเป็น `APPROVED` ก่อนดำเนินการโอนเงิน

## 4. รายการ Use Cases และ Acceptance Criteria (AC)

### UC-01: ออกบัตรใหม่และผูกบัตรกรณีบัตรหาย (Card Issuance & Replacement)

* **Actor:** สตาฟโรงเรียน (Staff) - Next.js Web Admin

| รหัส AC | Given | When | Then | 
| ----- | ----- | ----- | ----- | 
| **AC1.1** | นักเรียนมีบัญชีในระบบ, บัตรเดิมสถานะ `lost` หรือ `active` | สตาฟสแกน RFID UID ใบใหม่ ผูกเข้ากับ Student ID | **สำเร็จ (`200 OK`)**: บัตรเดิมเปลี่ยนเป็น `deactivated`, บัตรใหม่เป็น `active`, ยอดเงินคงเหลืออยู่ครบ 100% | 
| **AC1.2** | รหัส RFID UID ที่สแกนถูกผูกใช้งานโดยนักเรียนคนอื่นอยู่แล้ว | สตาฟสแกน RFID UID ใบนั้น | **ปฏิเสธ (`409 CARD_ALREADY_BOUND`)**: แสดงข้อผิดพลาด "บัตรนี้ถูกใช้งานแล้วในระบบ" | 

### UC-02: ระงับบัตรและทำเรื่องคืนเงินย้ายออก (Card Freeze & Refund)

* **Actor:** ผู้ปกครอง (Parent) - React Native App / สตาฟโรงเรียน (Staff) - Next.js Web Admin

| รหัส AC | Given | When | Then | 
| ----- | ----- | ----- | ----- | 
| **AC2.1a** | ผู้ปกครองทราบว่าลูกทำบัตรหาย | ผู้ปกครองกด "อายัดบัตร" ใน Parent Mobile App | **สำเร็จ (`200 OK`)**: สถานะบัตรเปลี่ยนเป็น `lost` ทันที บัตรนั้นไม่สามารถใช้สแกนจ่ายเงินได้และต้องออกบัตรใหม่หากต้องการใช้งานต่อ | 
| **AC2.1b** | ผู้ปกครองแจ้งสตาฟว่าไม่สะดวกกดเอง | สตาฟค้นหานักเรียนแล้วกด "อายัดบัตร" บน Web Admin | **สำเร็จ (`200 OK`)**: สถานะบัตรเปลี่ยนเป็น `suspended` ทันที บัตรนั้นไม่สามารถใช้สแกนจ่ายเงินได้ | 
| **AC2.2** | นักเรียนย้ายออก มีเงินคงเหลือ 250 บาท | สตาฟกด "คืนเงินนักเรียน" บน Web Admin | **สำเร็จ (`200 OK`)**: ปรับสถานะบัตรเป็น `deactivated`, บันทึก Transaction `REFUND` 250 บาท, ยอดเงินใน Wallet กลายเป็น 0.00 บาท | 

### UC-03: เติมเงินเข้าบัตรนักเรียน (Parent Top-Up)

* **Actor:** ผู้ปกครอง (Parent) - React Native Mobile App

| รหัส AC | Given | When | Then | 
| ----- | ----- | ----- | ----- | 
| **AC3.1** | สตาฟตั้งค่ายอดเติมเงินขั้นต่ำ 50 บาท, ขั้นสูง 2,000 บาท | ผู้ปกครองระบุยอดเติมเงิน 100 บาท | **สำเร็จ (`200 OK`)**: ดำเนินการชำระเงินผ่าน Gateway ยอดเงินเข้า Wallet | 
| **AC3.2** | สตาฟตั้งขั้นต่ำ 50 บาท | ผู้ปกครองระบุยอดเติมเงิน 30 บาท | **ปฏิเสธ (`400 INVALID_TOPUP_AMOUNT`)**: ระบบแจ้ง "ยอดเติมเงินต่ำกว่าขั้นต่ำที่โรงเรียนกำหนด (50 บาท)" | 
| **AC3.3** | ยอดเงินคงเหลือใน Wallet ติดลบ -30.00 บาท จากรายการ offline | ผู้ปกครองเติมเงินเข้าสู่ระบบ 100.00 บาท | **สำเร็จ (`200 OK`)**: ระบบหักลบยอดติดลบอัตโนมัติ ยอดเงินคงเหลือใหม่กลายเป็น 70.00 บาท | 

### UC-04: ตั้งค่าวงเงินใช้จ่ายรายวัน (Set Daily Limit)

* **Actor:** ผู้ปกครอง (Parent) - React Native Mobile App

| รหัส AC | Given | When | Then | 
| ----- | ----- | ----- | ----- | 
| **AC4.1** | วงเงินปัจจุบันคือ 100 บาท/วัน | ผู้ปกครองปรับวงเงินใหม่เป็น 150 บาท/วัน ในระหว่างวัน | **สำเร็จ (`200 OK`)**: บันทึก `next_daily_limit` = 150.00, วงเงินของวันนี้ยังคงเป็น 100 บาท และวงเงินใหม่จะมีผลในวันถัดไปเวลา 00:00 น. | 

### UC-05: ชำระเงินแบบ Online & Offline (Merchant Payment)

* **Actor:** พ่อค้า-แม่ค้า (Merchant), นักเรียน (Student) - React Native App + RFID Reader

| รหัส AC | Given | When | Then | 
| ----- | ----- | ----- | ----- | 
| **AC5.1** | มีสัญญาณเน็ต, บัตร active, เงินเหลือ 100 บาท, ชำระ 35 บาท | แม่ค้าใส่ยอด 35 บาท แล้วแตะบัตร RFID | **สำเร็จ (`201 Created`)**: ตัดเงินคงเหลือ 65 บาท, แสดงหน้าจอสีเขียว "ชำระเงินสำเร็จ" | 
| **AC5.2** | แอปแม่ค้าไม่มีเน็ต, Cached Balance มี 50 บาท, ชำระ 30 บาท | แม่ค้าแตะบัตร RFID ในโหมด Offline | **สำเร็จ (Offline)**: บันทึกรายการลง Local SQLite บนมือถือ, หัก Cached Balance เหลือ 20 บาท, แสดงสถานะ "รอ Sync" | 
| **AC5.3** | แอปไม่มีเน็ต, ยอดชำระ 120 บาท | แม่ค้าแตะบัตร RFID ชำระเงิน 120 บาท | **ปฏิเสธ (Offline Error)**: แอปแสดง "ยอดชำระแบบ Offline สูงสุดไม่เกิน 100 บาท ต่อรายการ" | 
| **AC5.4** | แอปไม่มีเน็ตนานเกิน 12 ชั่วโมง | แม่ค้าเข้าหน้าคิดเงิน | **ระงับการทำงาน**: แอปแสดง "กรุณาเชื่อมต่ออินเทอร์เน็ตเพื่อ Sync ข้อมูลก่อนทำรายการต่อ" | 
| **AC5.5** | แอปกลับมามีเน็ต และส่ง Sync รายการ Offline ขึ้น NestJS Server | Server ประมวลผลรายการ Sync | **สำเร็จ (`200 OK`)**: ตรวจสอบ `offline_trx_id` ป้องกัน Sync ซ้ำ, ตัดเงินจริงใน DB หากเงินไม่พอปรับ Balance ติดลบตาม BR-PAY-02 | 

### UC-06: ยกเลิกรายการชำระเงิน (Void Transaction)

* **Actor:** พ่อค้า-แม่ค้า (Merchant) - React Native Mobile App

| รหัส AC | Given | When | Then | 
| ----- | ----- | ----- | ----- | 
| **AC6.1** | รายการชำระเงินเกิดขึ้นภายในวันเดียวกัน (ก่อน 23:59 น.) | แม่ค้าเลือกรายการในประวัติแล้วกด "Void/ยกเลิกรายการ" | **สำเร็จ (`200 OK`)**: คืนยอดเงินเข้า Wallet ของนักเรียนทันที, บันทึก Transaction `VOID` โดยไม่ต้องสแกนบัตรนักเรียนซ้ำ | 
| **AC6.2** | รายการชำระเงินเป็นของวันก่อนหน้า (ข้ามวันแล้ว) | แม่ค้ากด Void รายการนั้น | **ปฏิเสธ (`400 INVALID_VOID_PERIOD`)**: แสดงข้อความ "สามารถยกเลิกได้เฉพาะรายการภายในวันเดียวกันเท่านั้น" | 

### UC-07: สรุปยอดขายและการอนุมัติโอนเงิน (Daily Settlement & Approval)

* **Actor:** สตาฟโรงเรียน (Staff) - Next.js Web Admin, พ่อค้า-แม่ค้า (Merchant) - React Native

| รหัส AC | Given | When | Then | 
| ----- | ----- | ----- | ----- | 
| **AC7.1** | เวลา 23:59:59 น. ของทุกวัน | Cron Job บน NestJS Server ทำงาน | **สำเร็จ (`200 OK`)**: คำนวณ Gross Amount, Deducted Fee และ Net Amount ของแต่ละร้านค้า สร้าง Record ใน `settlements` สถานะ `PENDING_APPROVAL` | 
| **AC7.2** | รายการ Settlement สถานะ `PENDING_APPROVAL` | สตาฟตรวจสอบยอดบน Web Admin แล้วกด "อนุมัติการโอนเงิน (Approve)" | **สำเร็จ (`200 OK`)**: สถานะเปลี่ยนเป็น `APPROVED`, บันทึกเวลาที่อนุมัติ และเตรียมส่งข้อมูลโอนเงินเข้าบัญชีร้านค้า | 

## 5. การออกแบบสกีมาฐานข้อมูล (PostgreSQL Database Schema)

```sql
-- db/migrations/001_initial_schema.sql

-- 1. การตั้งค่าระบบกลาง (System Settings)
CREATE TABLE system_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  min_topup_amount DECIMAL(10,2) NOT NULL DEFAULT 50.00,
  max_topup_amount DECIMAL(10,2) NOT NULL DEFAULT 2000.00,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. นักเรียน และ Wallet
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  student_code VARCHAR(20) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  wallet_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (wallet_balance >= -500.00), -- รองรับยอดติดลบจาก Offline Conflict
  current_daily_limit DECIMAL(10,2) NOT NULL DEFAULT 200.00,
  next_daily_limit DECIMAL(10,2) NOT NULL DEFAULT 200.00, -- สำหรับ BR-LIMIT-01 มีผลวันถัดไป
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. บัตร RFID
CREATE TABLE rfid_cards (
  id SERIAL PRIMARY KEY,
  rfid_uid VARCHAR(50) NOT NULL UNIQUE,
  student_id INT NOT NULL REFERENCES students(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'lost', 'deactivated')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rfid_cards_uid ON rfid_cards(rfid_uid);
CREATE UNIQUE INDEX uq_active_card_per_student ON rfid_cards(student_id) WHERE status = 'active'; -- บังคับ BR-CARD-01

-- 4. ร้านค้า (Merchants)
CREATE TABLE merchants (
  id SERIAL PRIMARY KEY,
  merchant_code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  fee_percent DECIMAL(4,2) NOT NULL DEFAULT 2.00, -- คิดค่าธรรมเนียมเป็น % (BR-FEE-01)
  bank_account_no VARCHAR(50),
  bank_name VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. ประวัติการทำธุรกรรม (Transactions)
CREATE TABLE transactions (
  id BIGSERIAL PRIMARY KEY,
  offline_trx_id UUID UNIQUE, -- idempotency key สำหรับ Offline Sync
  student_id INT NOT NULL REFERENCES students(id),
  merchant_id INT REFERENCES merchants(id),
  card_id INT REFERENCES rfid_cards(id),
  amount DECIMAL(10,2) NOT NULL, -- ค่าบวก = TOPUP/REFUND, ค่าลบ = PURCHASE
  trx_type VARCHAR(20) NOT NULL CHECK (trx_type IN ('PURCHASE', 'REFUND', 'TOPUP', 'VOID')),
  is_offline BOOLEAN NOT NULL DEFAULT FALSE,
  offline_created_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_transactions_student ON transactions(student_id, created_at);
CREATE INDEX idx_transactions_merchant ON transactions(merchant_id, created_at);

-- 6. การสรุปยอดโอนเงินให้ร้านค้า (Settlements)
CREATE TABLE settlements (
  id SERIAL PRIMARY KEY,
  merchant_id INT NOT NULL REFERENCES merchants(id),
  settlement_date DATE NOT NULL,
  gross_amount DECIMAL(10,2) NOT NULL,
  fee_amount DECIMAL(10,2) NOT NULL,
  net_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING_APPROVAL' CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'PAID')),
  approved_by_staff_id INT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(merchant_id, settlement_date)
);
```

## 6. ตารางเปรียบเทียบ API Endpoint และ AC Traceability Matrix

| AC Code | HTTP Method & Path | Primary Logic & DB Constraint | Response Status Code | 
| ----- | ----- | ----- | ----- | 
| **AC1.1, AC1.2** | `POST /admin/cards/reissue` | Deactivate old card, bind new UID | `200 OK` / `409 Conflict` | 
| **AC2.1a** | `PATCH /parent/cards/:id/freeze` | Update lost card status to `lost` by parent | `200 OK` | 
| **AC2.1b, AC2.2** | `PATCH /admin/cards/:id/freeze`, `POST /admin/students/:id/refund` | Update status to `suspended`/`deactivated` by staff | `200 OK` | 
| **AC3.1 - AC3.3** | `POST /parent/wallet/topup` | Check System Settings min/max, update balance | `200 OK` / `400 Bad Request` | 
| **AC4.1** | `PATCH /parent/students/:id/daily-limit` | Set `next_daily_limit` in PostgreSQL | `200 OK` | 
| **AC5.1 - AC5.5** | `POST /merchant/payments`, `POST /merchant/payments/sync` | Transaction logic, Idempotency UUID check | `201 Created` / `200 OK` / `409 Conflict` | 
| **AC6.1, AC6.2** | `POST /merchant/payments/:id/void` | Verify same-day date, create VOID transaction | `200 OK` / `400 Bad Request` | 
| **AC7.1, AC7.2** | `POST /admin/settlements/:id/approve` | Update Settlement status to `APPROVED` | `200 OK` | 

## 7. Definition of Done (DoD)

1. AC ทุกข้อใน PRD ต้องถูกนำไปสร้างเป็น Test Suite ที่ขึ้นต้นด้วยรหัส AC (เช่น `AC1.1`, `AC2.1a`, `AC5.1`)

2. โค้ดผ่านการทดสอบแบบ TDD ทั้ง Unit Test (Services), Integration Test (PostgreSQL Testcontainers) และ E2E API Test

3. Migration SQL สามารถรันจากศูนย์ผ่านสมบูรณ์ พร้อมบังคับใช้ Constraints (NOT NULL, UNIQUE, CHECK, Foreign Keys)

4. OpenAPI Spec (`openapi.yaml`) ต้องได้รับการอัปเดตให้ตรงกับ Request/Response DTO ของ NestJS

5. CI/CD Pipeline ทำงานผ่านสมบูรณ์ก่อนทำการ Merge Pull Request
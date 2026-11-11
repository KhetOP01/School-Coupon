# 🏫 School Coupon System (ระบบคูปองดิจิทัลสำหรับโรงเรียน)

ระบบบริหารจัดการคูปองดิจิทัลผ่านบัตร RFID สำหรับโรงเรียน รองรับการเติมเงิน การจำกัดวงเงินรายวัน การชำระเงินที่โรงอาหารทั้งโหมดออนไลน์และออฟไลน์ การยกเลิกบิล และการสรุปยอดโอนเงินให้ร้านค้าแบบ T+1 ตามข้อกำหนดทางธุรกิจ (PRD) ครบถ้วน 100%

---

## 🌟 จุดเด่นของระบบ (Key Highlights)

- **Domain-Driven Design (DDD):** สถาปัตยกรรมแยกโมดูลตาม Bounded Contexts ชัดเจน (`StudentAccount`, `Payments`, `MerchantSettlement`, `SchoolConfiguration`)
- **ครบถ้วน 8 Use Cases (UC-01 ถึง UC-08):** พัฒนาตาม BDD / Acceptance Criteria ครบทุกข้อ
- **Automated Tests 100%:** ครอบคลุม Unit, Integration และ E2E Tests รวม **43 Test Suites / 230 Tests ผ่าน 100%**
- **Full Day E2E Simulation:** สคริปต์จำลองเหตุการณ์จริง 1 วันของโรงเรียน (`npm run simulate`)
- **Triple-Frontends:**
  1. 🖥️ **Web Admin Dashboard (Next.js):** สำหรับเจ้าหน้าที่การเงิน (ออกบัตรใหม่, อายัด/ปลดอายัด, คืนเงินนักเรียนลาออก, อนุมัติ Settlement)
  2. 📱 **Parent Mobile App (React Native):** สำหรับผู้ปกครอง (ดูยอดเงิน, เติมเงิน PromptPay, ตั้งวงเงินรายวัน, อายัดบัตรหาย)
  3. 🏪 **Merchant Mobile POS (React Native):** สำหรับร้านค้า (เครื่องคิดเงิน Numpad, โหมด Offline ทนทานต่อเน็ตล่ม, ซิงก์ข้อมูล, ยกเลิกบิลภายในวัน)
- **Production Architecture:** รองรับ Docker, PostgreSQL 16, Nginx Reverse Proxy พร้อม Same-Origin Cookie Session
- **CI/CD Pipeline:** ติดตั้ง GitHub Actions ตรวจสอบ Lint, Build, Test, E2E Simulation และ Docker Build อัตโนมัติ

---

## 📐 สถาปัตยกรรมและ Bounded Contexts

```
                       ┌─────────────────────────────────────────┐
                       │           Nginx Reverse Proxy           │
                       │               (Port 80)                 │
                       └────┬──────────────┬────────────────┬────┘
                            │              │                │
            /admin (UI)     │   /admin/api │                │ /parent/*
            /_next/*        │   /admin/auth│                │ /merchant/*
                            ▼              ▼                ▼
                     ┌─────────────┐  ┌────────────────────────────┐
                     │   Next.js   │  │       NestJS Backend       │
                     │  Web Admin  │  │         (Port 3000)        │
                     │ (Port 3001) │  └──────────────┬─────────────┘
                     └─────────────┘                 │
                                                     ▼
                                      ┌────────────────────────────┐
                                      │   PostgreSQL 16 Database   │
                                      │         (Port 5432)        │
                                      └────────────────────────────┘
```

### รายละเอียด Use Cases และ Business Rules:

| Use Case | คำอธิบาย | Business Rules & API Endpoints | ผู้ใช้งาน |
|---|---|---|---|
| **UC-01** | ออกบัตรใหม่แทนบัตรหาย/ชำรุด | **BR-CARD-02, BR-CARD-03:** อายัดบัตรเดิม ย้ายยอดเงินไปบัตรใหม่ทันที<br>`POST /admin/cards/reissue` | เจ้าหน้าที่โรงเรียน (Staff) |
| **UC-02** | ระงับบัตรและคืนเงินนักเรียนลาออก | **BR-CARD-04:** อายัด/ปลดอายัดบัตร และคืนเงินเข้าบัญชีเมื่อลาออก<br>`PATCH /admin/cards/:id/freeze`, `PATCH /admin/cards/:id/unfreeze`<br>`POST /admin/students/:id/refund` | เจ้าหน้าที่โรงเรียน (Staff) |
| **UC-03** | ผู้ปกครองเติมเงินเข้ากระเป๋า | **BR-TOPUP-01, BR-TOPUP-02:** เติมขั้นต่ำ 50 สูงสุด 2,000 บาท (ยอดเงินไม่เกิน 5,000 บาท)<br>`POST /parent/wallet/topup` | ผู้ปกครอง (Parent) |
| **UC-04** | ผู้ปกครองตั้งวงเงินใช้จ่ายต่อวัน | **BR-LIMIT-01:** ปรับวงเงินรายวัน มีผลวันถัดไปเวลา 00:00:00 น.<br>`PATCH /parent/students/:id/daily-limit` | ผู้ปกครอง (Parent) |
| **UC-05** | ร้านค้าคิดเงิน Online & Offline | **BR-PAY-01, BR-PAY-02, BR-PAY-03:** โหมด Offline รับได้สูงสุด 100 บ./รายการ, อนุญาตติดลบได้ถึง -500 บ. เมื่อชนกับรายการอื่น, ล็อกเมื่อออฟไลน์เกิน 12 ชม.<br>`POST /merchant/payments`, `POST /merchant/payments/sync` | ร้านค้า (Merchant) |
| **UC-06** | ยกเลิกรายการชำระเงิน (Void) | **BR-VOID-01, BR-VOID-02:** ยกเลิกและคืนเงินได้ภายในวันเดียวกัน (ก่อน 23:59:59 น.) โดยไม่ต้องแตะบัตรซ้ำ<br>`POST /merchant/payments/:id/void` | ร้านค้า (Merchant) |
| **UC-07** | สรุปยอดขายและโอนเงินรอบ T+1 | **BR-SETTLE-01:** Cron สรุปยอดเที่ยงคืน หักค่าธรรมเนียมโรงเรียน (3%) และเจ้าหน้าที่อนุมัติโอนเงินรอบ T+1<br>`POST /admin/settlements/:id/approve` | ระบบอัตโนมัติ / Staff |
| **UC-08** | ความปลอดภัยและเซสชันเจ้าหน้าที่ | OpenID Connect (OIDC) Single-Sign-On ตรวจสอบ Claim เจ้าหน้าที่ และออก HTTP-only Cookie<br>`GET /admin/auth/oidc/start`, `GET /admin/auth/session`, `POST /admin/auth/logout` | เจ้าหน้าที่โรงเรียน (Staff) |

---

## 🚀 เริ่มต้นใช้งาน (Getting Started)

### ความต้องการของระบบ (Prerequisites)
- **Node.js:** v22.x หรือใหม่กว่า
- **Docker & Docker Compose** (สำหรับ Production หรือ Local DB)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. รันระบบจำลองแบบเบ็ดเสร็จ (Standalone E2E Simulation)
ทดสอบระบบทุก Use Case โดยไม่ต้องเปิด Docker (ระบบจะรัน Embedded PostgreSQL และประมวลผลให้โดยอัตโนมัติ):
```bash
npm run simulate
```

### 3. รันการทดสอบทั้งหมด (Run All Tests)
```bash
npm test
```

### 4. รันระบบแบบ Local Development

#### ขั้นตอนที่ 4.1: เริ่มฐานข้อมูลและ Migrations
```bash
# เปิด PostgreSQL
docker compose up -d postgres

# รัน Migration และใส่ข้อมูลเริ่มต้น
npm run migrate
npm run seed
```

#### ขั้นตอนที่ 4.2: เปิดเซิร์ฟเวอร์ Backend (NestJS)
```bash
npm run start:dev
```
- API ทำงานที่: `http://localhost:3000`
- Interactive API Docs (Swagger UI): `http://localhost:3000/api/docs`
- OpenAPI Specification: `http://localhost:3000/api/openapi.yaml`

#### ขั้นตอนที่ 4.3: เปิดหน้าเว็บ Admin Dashboard (Next.js)
```bash
npm run dev:admin
```
- เปิดเบราว์เซอร์ไปที่: `http://localhost:3001/admin`

---

## 🐳 การเปิดใช้งานบน Production (Docker Compose)

ระบบเตรียมพร้อมสำหรับการ Deploy ระดับ Production ด้วย Multi-stage Dockerfile และ Nginx Reverse Proxy:

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

- เข้าใช้งานหน้า Web Admin ผ่าน Reverse Proxy ที่: `http://localhost/admin`
- เข้าดู Interactive API Docs ผ่าน Reverse Proxy ที่: `http://localhost/api/docs`

---

## 📱 แอปพลิเคชันมือถือ (Mobile Applications)

- **Parent Mobile App:** อยู่ในไดเรกทอรี [`apps/parent-mobile`](apps/parent-mobile)
  - หน้าจอหลัก: [`HomeScreen.tsx`](apps/parent-mobile/src/screens/HomeScreen.tsx)
  - หน้าจอเติมเงิน: [`TopUpScreen.tsx`](apps/parent-mobile/src/screens/TopUpScreen.tsx)
  - หน้าจอวงเงินรายวัน: [`DailyLimitScreen.tsx`](apps/parent-mobile/src/screens/DailyLimitScreen.tsx)
  - หน้าจออายัดบัตรหาย: [`CardSecurityScreen.tsx`](apps/parent-mobile/src/screens/CardSecurityScreen.tsx)
- **Merchant Mobile POS App:** อยู่ในไดเรกทอรี [`apps/merchant-mobile`](apps/merchant-mobile)
  - เครื่องคิดเงิน Numpad: [`PosScreen.tsx`](apps/merchant-mobile/src/screens/PosScreen.tsx)
  - ซิงก์คิวออฟไลน์: [`SyncScreen.tsx`](apps/merchant-mobile/src/screens/SyncScreen.tsx)
  - ยกเลิกบิล Void: [`VoidScreen.tsx`](apps/merchant-mobile/src/screens/VoidScreen.tsx)
  - สรุปยอดขาย T+1: [`SummaryScreen.tsx`](apps/merchant-mobile/src/screens/SummaryScreen.tsx)

---

## 📄 เอกสารอ้างอิงเพิ่มเติม

- [OpenAPI Specification 3.1](openapi.yaml)
- [Product Requirement Document (PRD)](product_requirement_document_prd.md)
- [Production Deployment Guide](docs/deployment/PRODUCTION_SETUP.md)
- [DDD Architecture Guide](docs/architecture/ddd-architecture.md)

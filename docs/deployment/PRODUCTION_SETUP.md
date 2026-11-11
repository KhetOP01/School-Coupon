# คู่มือการติดตั้งและขึ้นใช้งานจริง (Production Deployment Guide)

เอกสารนี้อธิบายขั้นตอนการ Deploy ระบบ **School-Coupon** (ระบบคูปองดิจิทัลแทนเงินสดด้วย RFID สำหรับโรงเรียน) เข้าสู่ Production / Staging Server

---

## 1. ข้อมูลสถาปัตยกรรมระดับ Production (Architecture Overview)

ระบบทำงานภายใต้สถาปัตยกรรม Same-Origin โดยมี Nginx ทำหน้าที่เป็น Reverse Proxy รับ Traffic ที่ Port 80/443:
- `/admin/auth/*` และ `/api/*` -> **NestJS Backend Service** (Container `api` Port 3000)
- `/admin/*` -> **Next.js Web Admin Shell** (Container `admin` Port 3001)
- ฐานข้อมูล -> **PostgreSQL 16** (Container `postgres` Port 5432)

---

## 2. สิ่งที่ต้องจัดเตรียมก่อน Deploy (Prerequisites Checklist)

### 2.1 ข้อมูล OpenID Connect (OIDC) ของโรงเรียน
1. **Issuer URL (`STAFF_OIDC_ISSUER`):** เช่น `https://auth.school.ac.th/` หรือ Google Workspace / Microsoft Entra ID
2. **Client ID (`STAFF_OIDC_CLIENT_ID`):** รหัส Client Application ที่ลงทะเบียนไว้กับ IdP
3. **Client Secret (`STAFF_OIDC_CLIENT_SECRET`):** รหัสลับสำหรับการแลก Token
4. **Redirect URI (`STAFF_OIDC_REDIRECT_URI`):** เช่น `https://coupon.school.ac.th/admin/auth/oidc/callback`
5. **Staff Claim Mapping:**
   - `STAFF_CLAIM_NAME`: เช่น `groups`, `roles`, หรือ `department`
   - `STAFF_CLAIM_VALUE`: เช่น `staff`, `admin`, หรือ `finance`

### 2.2 Domain Name และ SSL/TLS Certificate
- โดเมนสำหรับระบบ เช่น `coupon.school.ac.th`
- ใบรับรอง SSL Certificate (Let's Encrypt / Cloudflare)

---

## 3. ขั้นตอนการติดตั้งด้วย Docker Compose

### ขั้นตอนที่ 1: Clone Repository และเตรียมไฟล์ `.env`
```bash
git clone https://github.com/KhetOP01/School-Coupon.git
cd School-Coupon
cp .env.example .env
```

แก้ไขไฟล์ `.env` กำหนดค่า Production:
```env
# Database Settings
POSTGRES_DB=school_coupon
POSTGRES_USER=school_coupon_admin
POSTGRES_PASSWORD=your_strong_password_here

# Backend Settings
PORT=3000

# School Identity Provider (OIDC) Settings
STAFF_OIDC_ISSUER=https://idp.school.ac.th/
STAFF_OIDC_CLIENT_ID=school-coupon-prod
STAFF_OIDC_CLIENT_SECRET=your_production_oidc_secret
STAFF_OIDC_REDIRECT_URI=https://coupon.school.ac.th/admin/auth/oidc/callback
STAFF_CLAIM_NAME=groups
STAFF_CLAIM_VALUE=staff

# Web Admin Settings
AUTH_API_ORIGIN=http://api:3000
HTTP_PORT=80
```

### ขั้นตอนที่ 2: สั่ง Build และ Start Container ทั้งหมด
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### ขั้นตอนที่ 3: รัน Database Migrations และ Seed ข้อมูลเริ่มต้น
เมื่อ Container `postgres` และ `api` เริ่มต้นเรียบร้อยแล้ว ให้รันคำสั่ง Migration:
```bash
docker compose -f docker-compose.prod.yml exec api npm run migrate
```
*(หากต้องการใส่ข้อมูลตั้งค่าเริ่มต้น เช่น system_settings และร้านค้าตัวอย่าง สามารถรัน `npm run seed` ได้)*
```bash
docker compose -f docker-compose.prod.yml exec api npm run seed
```

---

## 4. การตรวจสอบสถานะการทำงาน (Verification)

1. **ตรวจสอบความพร้อมของ Container:**
   ```bash
   docker compose -f docker-compose.prod.yml ps
   ```
2. **ตรวจสอบ Log ของ Backend API:**
   ```bash
   docker compose -f docker-compose.prod.yml logs -f api
   ```
3. **ตรวจสอบ Log ของ Web Admin:**
   ```bash
   docker compose -f docker-compose.prod.yml logs -f admin
   ```
4. **ทดสอบเปิด Web Admin ผ่าน Browser:**
   - เข้า URL: `http://<your-server-ip>/admin`
   - ระบบจะตรวจพบว่ายังไม่มี Session และ Redirect ไปยังหน้า Login ของ IdP อัตโนมัติ (`/admin/auth/oidc/start`)
   - เมื่อ Login ด้วยบัญชี Staff สำเร็จ จะเข้าสู่หน้า Web Admin Dashboard

---

## 5. การอัปเดตระบบในอนาคต (Continuous Deployment)

เมื่อมีการ Push โค้ดใหม่เข้าสู่ branch `main`:
```bash
git pull origin main
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec api npm run migrate
```

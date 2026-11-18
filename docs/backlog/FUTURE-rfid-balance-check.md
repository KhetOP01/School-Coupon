# Feature Idea (Backlog): สแกนบัตร RFID เพื่อเช็กยอดเงินคงเหลือ (Balance Check)

**สถานะ:** เก็บไอเดียไว้ทำเพิ่มเติมในรอบถัดไป (หลังรีดีไซน์ Mobile App)

## แนวคิด (Concept)
เพิ่มฟังก์ชันให้นักเรียนหรือร้านค้าสามารถ **แตะ/สแกนบัตร RFID เพื่อดูยอดเงินคงเหลือและวงเงินรายวันที่เหลืออยู่** ได้โดยไม่ต้องทำรายการซื้อสินค้า

## ช่องทางที่รองรับได้
1. **Merchant POS App (`apps/merchant-mobile`):**
   - เพิ่มปุ่ม/โหมด **"เช็กยอดเงินบัตร"** ให้แม่ค้าช่วยสแกนดูยอดให้นักเรียนก่อนซื้อของ
2. **ตู้เช็กยอดเงิน (Student Balance Kiosk Mode):**
   - หน้าจอเรียบง่ายสำหรับวางหน้าโรงอาหาร/สหกรณ์ ให้นักเรียนแตะบัตร RFID เองเพื่อดูยอดเงินคงเหลือ, วงเงินวันนี้ที่เหลือ และสถานะบัตร (ไม่ต้องมีปุ่มตัดเงิน/หักเงิน)

## แนวทางเทคนิค (Proposed Backend API)
- เพิ่ม Endpoint แบบ Read-Only เช่น `GET /merchant/cards/:rfidUid/balance` (หรือ `GET /kiosk/cards/:rfidUid/balance`)
- ส่งค่ากลับ: `studentCode`, `firstName`, `walletBalance`, `currentDailyLimit`, `spentToday`, `remainingDailyLimit`, `cardStatus`
- **ความปลอดภัย:** Read-only ไม่มีการตัดยอดเงิน, ตรวจสถานะบัตร (`active` / `suspended` / `lost` / `deactivated`) และแสดงแจ้งเตือนหากบัตรถูกอายัด

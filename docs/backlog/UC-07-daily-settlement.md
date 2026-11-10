# UC-07 สรุปยอดขายรายวันและอนุมัติยอดโอนร้านค้า

**Summary:** UC-07 สรุปยอดขายรายวันและอนุมัติยอดโอนร้านค้า

**Component:** `merchant-settlement`

**Story points:** ?

**Epic:** ยังไม่ระบุ

## User story

ในฐานะ Staff ที่ได้รับอนุญาต

ฉันต้องการตรวจสอบและอนุมัติยอด Settlement รายวันของแต่ละ Merchant

เพื่อให้ยอดสุทธิที่คำนวณจากยอดขายและค่าธรรมเนียมพร้อมเข้าสู่ขั้นตอนโอนเงิน

## กฎทางธุรกิจ

- ระบบสร้าง Settlement ราย Merchant เมื่อสิ้นวัน (`23:59:59`) ด้วยสถานะ `PENDING_APPROVAL`
- ค่าธรรมเนียมคิดเป็นเปอร์เซ็นต์ที่กำหนดแยกตาม Merchant
- `Net Amount = Gross Amount - Fee Amount`
- Staff ต้องอนุมัติก่อนดำเนินการโอนเงินจริง

## Acceptance criteria

| รหัส AC | Given | When | Then |
|---|---|---|---|
| **AC7.1** | ถึงเวลา 23:59:59 น. ของทุกวันและมีรายการขายของ Merchant | Cron Job บน NestJS Server ทำงาน | สำเร็จ: คำนวณ Gross Amount, Fee Amount และ Net Amount ของแต่ละ Merchant และสร้าง Settlement สถานะ `PENDING_APPROVAL` (PRD ระบุ `200 OK` สำหรับผลสำเร็จของ job) |
| **AC7.2** | Settlement อยู่สถานะ `PENDING_APPROVAL` | Staff ตรวจสอบยอดและกด Approve บน Web Admin | สำเร็จ (`200 OK`): สถานะเป็น `APPROVED`, บันทึกเวลาที่อนุมัติ และเตรียมข้อมูลโอนเงิน |
| **AC7.3** *(เสนอ)* | Settlement ของ Merchant และวันที่นั้นถูกสร้างแล้ว | Cron Job ทำงานซ้ำ | ไม่สร้าง Settlement ซ้ำหรือเปลี่ยนยอด/สถานะเดิม; คืนผลการประมวลผลเดิม |
| **AC7.4** *(เสนอ)* | Settlement ID ไม่มีในระบบ | Staff ส่งคำขอ Approve | ปฏิเสธ (`404 SETTLEMENT_NOT_FOUND`); ไม่เปลี่ยนข้อมูล |
| **AC7.5** *(เสนอ)* | ผู้เรียกไม่ login หรือไม่มีสิทธิ์ Staff อนุมัติ | ผู้เรียกส่งคำขอ Approve | ปฏิเสธ (`401 AUTHENTICATION_REQUIRED` หรือ `403 STAFF_ACCESS_REQUIRED`); ไม่เปลี่ยนข้อมูล |
| **AC7.6** *(เสนอ)* | Settlement ไม่อยู่สถานะ `PENDING_APPROVAL` | Staff ส่งคำขอ Approve | ปฏิเสธ (`409 SETTLEMENT_NOT_PENDING`); ไม่เปลี่ยนสถานะหรือยอด |
| **AC7.7** *(เสนอ)* | Staff อนุมัติ Settlement สำเร็จแล้ว แต่ Client ไม่ได้รับ response | Staff ส่งคำขอ Approve เดิมซ้ำ | คืนผลเดิม (`200 OK`) โดยไม่สร้างการอนุมัติหรือการโอนซ้ำ |

## นอกขอบเขต

- การสร้าง Payment/Void อยู่ใน UC-05 และ UC-06
- การโอนเงินจริงและสถานะ `PAID`
- การตั้งค่าอัตราค่าธรรมเนียมโดย Staff

## คำถามที่ต้องตอบ

- timezone ของการปิดวันและ Settlement คืออะไร?
- Gross Amount รวม/หักรายการ Void และรายการ Offline ที่ยังไม่ Sync อย่างไร?
- กติกาปัดเศษ Fee Amount คืออะไร?
- สร้าง Settlement มูลค่า 0 ให้ Merchant ที่ไม่มีรายการขายหรือไม่?
- AC7.3–AC7.7 เป็นข้อเสนอที่ต้องรีวิว; endpoint อ่าน Settlement ของ Merchant ยังไม่มีใน PRD

## Sub-tasks (ร่าง)

- `Spec: รีวิว use case และ AC7.1–AC7.7`
- `Spec: ระบุ request/response/error ของ approve endpoint (AC7.2, AC7.4–AC7.7)`
- `DB: บังคับ Settlement ต่อ Merchant/วันและเก็บข้อมูลผู้อนุมัติ (AC7.1–AC7.3)`
- `Domain: คำนวณยอดและควบคุมสถานะอนุมัติ (AC7.1–AC7.2, AC7.6–AC7.7)`
- `App: ประสานข้อมูล Payment และ authorization ของ Staff (AC7.1–AC7.5)`
- `Infra: ทำ Cron Job แบบ idempotent และทดสอบ persistence (AC7.1, AC7.3)`
- `HTTP: map approve errors/status ตาม OpenAPI (AC7.2, AC7.4–AC7.7)`
- `E2E: ทดสอบสร้าง Settlement, retry และอนุมัติ (AC7.1–AC7.7)`

## Definition of Ready (รอรีวิว)

| รายการ | สถานะ |
|---|---|
| มีการสร้าง/อนุมัติ, job ซ้ำ, not found, permission, wrong state และ retry | ✅ |
| สูตรสุทธิและสถานะชัด; timezone, การนับ Void และการปัดเศษยังไม่ชัด | ⚠️ |
| มีนอกขอบเขตและ component | ✅ |
| Story points | ❌ ไม่มีข้อมูล; ไม่เดา |
| ข้อมูล source สำหรับ Gross Amount และ endpoint อ่าน Settlement ยังไม่กำหนด | ❌ |

## อ้างอิง

- [Use case UC-07](../usecases/UC-07-daily-settlement.md)
- PRD: `POST /admin/settlements/:id/approve`

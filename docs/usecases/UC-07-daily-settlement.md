# UC-07: สรุปยอดขายรายวันและอนุมัติยอดโอนร้านค้า

> สถานะ: ร่างเพื่อรีวิว AC ก่อนออกแบบ Database/API
> Bounded context: `merchant-settlement` (ระดับ `full`)
> แหล่งที่มา: [PRD](../../product_requirement_document_prd.md), UC-07 และ BR-SETTLE-01 / BR-FEE-01
> AC7.3–AC7.7 เป็นข้อเสนอเพิ่มเติม; ยังไม่ได้เพิ่มลง PRD

## ผู้ใช้งาน

- ระบบ NestJS ที่ทำงานตามเวลาสำหรับสร้าง Settlement รายวัน
- Staff ที่ยืนยันตัวตนและมีสิทธิ์อนุมัติ Settlement ผ่าน Web Admin
- Merchant ที่ตรวจสอบยอดสรุปของตนผ่าน Merchant Mobile App

## เงื่อนไขก่อนเริ่ม

- มีข้อมูลรายการขายและการยกเลิกที่ใช้คำนวณยอดของวันนั้น
- Merchant และอัตราค่าธรรมเนียมของ Merchant มีอยู่ในระบบ
- Staff มีสิทธิ์อนุมัติยอดโอน

## ขั้นตอนหลัก

1. เมื่อสิ้นวัน ระบบรวบรวมยอดขายราย Merchant
2. ระบบคำนวณ Gross Amount, Fee Amount และ Net Amount ตามอัตราค่าธรรมเนียมของ Merchant
3. ระบบสร้าง Settlement ต่อ Merchant ต่อวันด้วยสถานะ `PENDING_APPROVAL`
4. Staff ตรวจสอบยอดและกด Approve บน Web Admin
5. ระบบเปลี่ยนสถานะเป็น `APPROVED`, บันทึกผู้อนุมัติและเวลา และเตรียมข้อมูลสำหรับโอนเงิน
6. Merchant ตรวจสอบยอดสรุปของตน

## กฎทางธุรกิจ

- เมื่อสิ้นวัน (`23:59:59`) ระบบสรุปยอดต่อ Merchant และกำหนด `PENDING_APPROVAL` (AC7.1)
- ค่าธรรมเนียมเป็นเปอร์เซ็นต์และกำหนดแยกตาม Merchant ได้ (BR-FEE-01)
- `Net Amount = Gross Amount - Fee Amount`
- Staff ต้องอนุมัติก่อนเริ่มโอนเงิน; การอนุมัติใน UC นี้ไม่ได้ดำเนินการโอนเงินจริง (BR-SETTLE-01)
- Schema ตัวอย่างมี unique key ต่อ Merchant และ Settlement Date
- PRD ยังไม่ระบุกฎปัดเศษ, timezone, หรือการนับรายการ Void ในยอด Gross

## แนวทางออกแบบตาม DDD (ข้อเสนอเพื่อรีวิว)

- **Bounded Context และภาษาธุรกิจ:** `Settlement`, อัตราค่าธรรมเนียม และการอนุมัติเป็นของ `merchant-settlement`; `Payment`/Void เป็นของ `payments`; ใช้คำ Gross, Fee, Net, `PENDING_APPROVAL`, `APPROVED` และ `PAID` ให้ตรงกันในเอกสารและระบบ
- **Aggregate และ invariant:** `Settlement` เป็น aggregate root candidate สำหรับยอดของ Merchant ต่อวันและ state transition; invariant คือมีได้ไม่เกินหนึ่ง Settlement ต่อ Merchant/วัน และอนุมัติได้จากสถานะ `PENDING_APPROVAL` เท่านั้น
- **Value Objects / Entities:** `Money`, อัตรา `FeePercent`, Settlement Date และผลอนุมัติเป็น value object/entity candidates ตาม identity ที่ต้องติดตาม; ใช้ decimal/money value object ไม่คำนวณยอดเงินด้วย floating point
- **Domain behavior:** การคำนวณ fee/net และการเปลี่ยนสถานะอนุมัติเป็นกฎของ `merchant-settlement` domain; หากการคำนวณต้องรวมหลายข้อมูลแต่ไม่มี aggregate เดียวเป็นเจ้าของ ให้พิจารณา domain service ตามจำเป็น ไม่วางสูตรไว้ใน cron/controller
- **Application และ ports:** use case สำหรับปิดรอบประสานการอ่าน Payments/Void และข้อมูล Merchant/fee, สร้าง/บันทึก Settlement; use case อนุมัติโหลด Settlement, เรียก `approve(...)` ที่ root และบันทึกผู้อนุมัติ/เวลา โดยไม่มีกฎอนุมัติซ้ำใน application
- **ขอบเขตข้าม context:** อ่านยอดขาย/Void จาก `payments` ผ่าน read port/event contract ที่ประกาศให้ใช้; ไม่ import Payment domain หรือ query ตารางของ context อื่นโดยตรง; composition root เป็นผู้ต่อ implementation
- **ชั้น HTTP/Infrastructure:** Cron เป็น interface/application entry point ไม่ใช่ HTTP controller; approve endpoint ตรวจรูปแบบ/authorization ที่ HTTP boundary, repository บันทึก aggregate และ constraint unique; response ผ่าน mapper ตาม OpenAPI
- **ประเด็นยังไม่ตัดสิน:** source-of-truth ของยอด Gross, timezone/cutoff, การนับ Void/offline-late-sync, การปัดเศษ fee และยอดศูนย์ ต้องตกลงก่อนกำหนด query contract และ aggregate persistence

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

- การสร้างรายการขายและ Void อยู่ใน UC-05 และ UC-06
- การโอนเงินจริงให้ Merchant และการบันทึกสถานะ `PAID` อยู่นอก UC นี้
- การตั้งค่าอัตราค่าธรรมเนียมโดย Staff ยังไม่มี use case แยกใน PRD

## คำถามที่ต้องตอบ

- เวลา 23:59:59 น. และวัน Settlement อ้างอิง timezone ใด?
- Gross Amount รวม/หักรายการ Void อย่างไร และรวมรายการ Offline ที่ยังไม่ Sync หรือไม่?
- ปัดเศษ Fee Amount ที่กี่ตำแหน่ง และใช้กติกาปัดเศษแบบใด?
- ต้องสร้าง Settlement มูลค่า 0 ให้ Merchant ที่ไม่มีรายการขายหรือไม่?
- AC7.3–AC7.7 เป็นข้อเสนอ; ควรยืนยันการทำงานซ้ำ, authorization และ error code ก่อนกำหนด API

## API ที่เกี่ยวข้อง

- `POST /admin/settlements/:id/approve` ตาม traceability matrix ใน PRD
- Endpoint สำหรับอ่าน Settlement ของ Merchant ยังไม่ได้ระบุใน PRD
- Cron Job เป็นงานเบื้องหลัง ไม่ใช่ HTTP endpoint; AC7.1 คง status ที่ PRD ระบุไว้เพื่อรีวิว

# UC-06: ร้านค้ายกเลิกรายการชำระเงิน

> สถานะ: ร่างเพื่อรีวิว AC ก่อนออกแบบ Database/API
> Bounded context: `payments` (ระดับ `full`)
> แหล่งที่มา: [PRD](../../product_requirement_document_prd.md), UC-06 และ BR-VOID-01
> AC6.3–AC6.6 เป็นข้อเสนอเพิ่มเติม; ยังไม่ได้เพิ่มลง PRD

## ผู้ใช้งาน

พ่อค้า-แม่ค้าที่ผ่านการยืนยันตัวตน ผ่าน Merchant Mobile App

## เงื่อนไขก่อนเริ่ม

- รายการชำระต้นทางมีอยู่ในระบบ
- ผู้เรียกเป็น Merchant ที่มีสิทธิ์จัดการรายการนั้น
- รายการอยู่ภายในวันปัจจุบันและยังไม่ถูกยกเลิก

## ขั้นตอนหลัก

1. Merchant เลือกรายการจากประวัติการขาย โดยไม่ต้องสแกนบัตรนักเรียนซ้ำ
2. ระบบตรวจสอบตัวตน สิทธิ์ Merchant สถานะและเวลาของรายการต้นทาง
3. ระบบคืนเงินเข้า Wallet นักเรียนและบันทึกรายการ `VOID` ที่อ้างถึงรายการต้นทาง
4. ระบบแจ้งผลการยกเลิกให้ Merchant

## กฎทางธุรกิจ

- Merchant ยกเลิกรายการชำระได้ภายในวันเดียวกัน ก่อน 23:59 น. (BR-VOID-01)
- การยกเลิกไม่ต้องสแกนบัตรนักเรียนซ้ำ
- การคืนยอด Wallet และการบันทึก `VOID` ต้องเป็นผลลัพธ์เดียวกัน; คำขอที่ถูกปฏิเสธต้องไม่เปลี่ยนยอด
- PRD ยังไม่ระบุ timezone และนโยบายยกเลิกซ้ำ

## แนวทางออกแบบตาม DDD (ข้อเสนอเพื่อรีวิว)

- **Bounded Context และภาษาธุรกิจ:** `Payment` และการ Void เป็นของ `payments`; Wallet และรายการปรับยอดเป็นของ `student-account`; ใช้ `VOID` อ้างถึง Payment ต้นทาง ไม่ถือว่าเป็นการลบ Payment
- **Aggregate และ invariant:** `Payment` เป็น aggregate root candidate ที่คุมสถานะ voidable/voided และการอ้างอิงการ Void; การ Void ซ้ำต้องไม่ทำให้คืนยอดซ้ำ; พฤติกรรมตรวจช่วงเวลาและสถานะอยู่ใน domain method ของ root
- **Value Objects / Entities:** `PaymentId`, `Money` และเวลาทำรายการเป็น value object candidates; รายการ Void ต้องมี identity หรือ reference ที่เสถียรตามการออกแบบ ledger ซึ่งยังไม่กำหนด
- **Application และ ports:** use case โหลด Payment, ตรวจ authorization ผ่านสัญญา, เรียกพฤติกรรม Void ของ Payment, ประสานการคืนยอดผ่าน port ของ `student-account` และบันทึกผล โดยไม่เป็นผู้ตัดสินกฎช่วงเวลาหรือสถานะเอง
- **ขอบเขตข้าม context:** `payments` ต้องไม่แก้ตารางหรือ import repository ของ `student-account`; ให้ประกาศ port/public contract และเชื่อมที่ composition root; ต้องกำหนดวิธีรับประกันความสอดคล้องเมื่อบันทึก Void และคืน Wallet
- **ชั้น HTTP/Infrastructure:** HTTP ตรวจ ID/request และ map `INVALID_VOID_PERIOD`, not found, unauthorized/forbidden และ state errors; infrastructure จัดการ persistence/constraint; response ใช้ mapper ตาม OpenAPI
- **ประเด็นยังไม่ตัดสิน:** timezone/ขอบเขตเวลา, นโยบาย offline ที่ยังไม่ Sync, idempotency ของการ retry และ atomicity ระหว่าง Payment กับ Wallet ต้องตัดสินก่อนสรุป repository/transaction

## Acceptance criteria

| รหัส AC | Given | When | Then |
|---|---|---|---|
| **AC6.1** | รายการชำระเกิดขึ้นภายในวันเดียวกัน ก่อน 23:59 น. | Merchant เลือกรายการในประวัติแล้วกด Void โดยไม่สแกนบัตรซ้ำ | สำเร็จ (`200 OK`): คืนยอดเข้า Wallet และบันทึก Transaction `VOID` ที่อ้างถึงรายการต้นทาง |
| **AC6.2** | รายการชำระเกิดขึ้นวันก่อนหน้า | Merchant กด Void รายการนั้น | ปฏิเสธ (`400 INVALID_VOID_PERIOD`); ไม่เปลี่ยน Wallet หรือรายการ |
| **AC6.3** *(เสนอ)* | Transaction ID ที่ระบุไม่มีในระบบ | Merchant ส่งคำขอ Void | ปฏิเสธ (`404 PAYMENT_NOT_FOUND`); ไม่เปลี่ยน Wallet |
| **AC6.4** *(เสนอ)* | ผู้เรียกไม่ login หรือรายการเป็นของ Merchant อื่น | ผู้เรียกส่งคำขอ Void | ปฏิเสธ (`401 AUTHENTICATION_REQUIRED` หรือ `403 MERCHANT_ACCESS_DENIED`); ไม่เปลี่ยนข้อมูล |
| **AC6.5** *(เสนอ)* | รายการถูก Void สำเร็จแล้ว | Merchant ส่งคำขอ Void ซ้ำ | ปฏิเสธ (`409 PAYMENT_ALREADY_VOIDED`); ไม่คืนยอดหรือสร้าง `VOID` ซ้ำ |
| **AC6.6** *(เสนอ)* | Transaction เป็นชนิดที่ไม่ใช่รายการชำระ หรืออยู่ในสถานะที่ยกเลิกไม่ได้ | Merchant ส่งคำขอ Void | ปฏิเสธ (`409 PAYMENT_NOT_VOIDABLE`); ไม่เปลี่ยนข้อมูล |
| **AC6.7** *(เสนอ)* | คำขอไม่มี Transaction ID หรือ ID มีรูปแบบไม่ถูกต้อง | Merchant ส่งคำขอ Void | ปฏิเสธ (`400 INVALID_REQUEST`); ไม่เปลี่ยนข้อมูล |

## นอกขอบเขต

- การสร้างรายการชำระ Online/Offline อยู่ใน UC-05
- การสรุปยอดรายวันและจัดการผลต่อ Settlement อยู่ใน UC-07
- การคืนเงินผ่าน Gateway หรือเงินสดอยู่นอก UC นี้

## คำถามที่ต้องตอบ

- วันเดียวกันและเวลา 23:59 น. อ้างอิง timezone ใด และอนุญาตรายการที่เวลาเท่ากับ 23:59:00 หรือไม่?
- ยกเลิกได้เฉพาะรายการซื้อที่สำเร็จและเป็นของ Merchant ผู้เรียกหรือไม่?
- การคืนยอดและ `VOID` ต้องผูก transaction เดียวกันอย่างไรเมื่อเกิดการ retry?
- รายการ Offline ที่ยังไม่ Sync สามารถ Void จากแอปได้หรือไม่?
- AC6.3–AC6.7 เป็นข้อเสนอ; ควรยืนยัน error code และพฤติกรรมยกเลิกซ้ำก่อนกำหนด API

## API ที่เกี่ยวข้อง

- `POST /merchant/payments/:id/void` ตาม traceability matrix ใน PRD
- Error code/response ของ AC6.3–AC6.7 เป็นข้อเสนอและต้องระบุใน `openapi.yaml` หลังรีวิว

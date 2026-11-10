# Context map: School Cashless RFID

> สถานะ: ขอบเขตตั้งต้นที่ผู้ใช้ยืนยันจาก PRD เมื่อ 2026-11-04
> เป็นแผนที่โดเมน ไม่ใช่ข้อสรุป schema หรือ implementation; ปรับได้เมื่อมี use case และโค้ดจริง

## แหล่งข้อมูลและหลักการ

- [Product Requirement Document](../../product_requirement_document_prd.md) ระบุ actors, business rules, use cases และ schema ตัวอย่างของระบบ
- [คู่มือ DDD ฉบับมือใหม่](<../../คู่มือ DDD ฉบับมือใหม่.html>) ใช้กำหนดหลักการแบ่ง bounded context, ภาษาธุรกิจ, aggregate และทิศทางการพึ่งพา
- ตัวอย่าง `catalog`, `circulation` และ `membership` ในคู่มือเป็นโดเมนห้องสมุด ไม่ใช่ context ของ School-Coupon
- ขอบเขต 4 contexts ด้านล่างเป็น baseline ที่ผู้ใช้เลือก; ownership ของตารางและ aggregate ยังต้องตรวจตอนออกแบบ use case และ migration

## Bounded contexts

| Context | ระดับ DDD ตั้งต้น | รับผิดชอบ | ข้อมูลที่เป็นเจ้าของเชิงแนวคิด |
|---|---|---|---|
| `student-account` | full | บัญชีนักเรียน ความสัมพันธ์ผู้ปกครองกับนักเรียน วงจรชีวิตบัตร RFID, Wallet, วงเงินรายวัน, การเติมเงินและคืนเงิน | นักเรียน, ความสัมพันธ์ผู้ปกครอง-นักเรียน, บัตร, ยอด/รายการเคลื่อนไหวของ Wallet และวงเงิน |
| `payments` | full | การชำระออนไลน์/ออฟไลน์ การรับ Sync แบบ idempotent และการ Void รายการ | รายการชำระ, สถานะการ Sync และการอ้างอิงรายการที่ถูก Void |
| `merchant-settlement` | full | ข้อมูลร้านค้า อัตราค่าธรรมเนียม การสรุปยอดรายวัน และการอนุมัติยอดโอน | ร้านค้า, ค่าธรรมเนียม, Settlement และประวัติการอนุมัติ |
| `school-configuration` | crud | บัญชีผู้ใช้และการกำหนดสิทธิ์ Parent/Staff รวมถึงการตั้งค่ายอดเติมเงินขั้นต่ำ/ขั้นสูง | ผู้ใช้/role/permission และ system settings |

`full` ใช้กับ context ที่มีกฎการเงิน สถานะ หรือการประสานงานหลายขั้น; `crud` ของ `school-configuration` จำกัดไว้ที่การจัดการข้อมูลผู้ใช้/สิทธิ์และค่าตั้งต้นที่ PRD ระบุ หากพบกฎสิทธิ์ซับซ้อน ให้เสนอทบทวนระดับ DDD ก่อนเปลี่ยน

## ภาษาธุรกิจตั้งต้น

| Context | คำ | ความหมาย/ข้อกำหนด |
|---|---|---|
| `student-account` | นักเรียน (`Student`) | เจ้าของบัญชีและ Wallet |
| `student-account` | ผู้ปกครอง (`Parent`) | ผู้ใช้ที่ต้องเชื่อมกับนักเรียนที่มีสิทธิ์ดูแล; วิธีผูกความสัมพันธ์ยังต้องกำหนด |
| `student-account` | บัตร (`RFIDCard`) | บัตรที่มี UID และสถานะ `active`, `suspended`, `lost` หรือ `deactivated` ตาม schema ที่ PRD ปรับปรุง |
| `student-account` | Wallet | ยอดเงินและรายการปรับยอดที่ผูกกับนักเรียน ไม่ได้ย้ายตามบัตร |
| `student-account` | วงเงินรายวัน (`DailyLimit`) | วงเงินปัจจุบันและวงเงินที่รอมีผลวันถัดไป |
| `payments` | รายการชำระ (`Payment`) | การซื้อหนึ่งรายการจากร้านค้า มีรหัสอ้างอิงสำหรับป้องกัน Sync ซ้ำ |
| `payments` | Offline Sync | การส่งรายการจากคิวในแอปกลับเข้า server; การเก็บคิว/เวลา 12 ชั่วโมงเป็นความรับผิดชอบฝั่งแอป ส่วนการตรวจซ้ำและบันทึกรายการเป็นความรับผิดชอบของ server |
| `payments` | Void | การยกเลิกรายการชำระเดิมภายในช่วงเวลาที่อนุญาต ต้องอ้างถึงรายการต้นทาง |
| `merchant-settlement` | ร้านค้า (`Merchant`) | ผู้ขายที่รับชำระและมีอัตราค่าธรรมเนียมของตน |
| `merchant-settlement` | Settlement | ยอดสรุปสุทธิของร้านค้าต่อวัน ซึ่งต้องอนุมัติก่อนโอน |
| `school-configuration` | ผู้ใช้และสิทธิ์ | Parent/Staff ที่ยืนยันตัวตนแล้ว พร้อมบทบาทสำหรับอนุญาตการกระทำ |
| `school-configuration` | ข้อกำหนดเติมเงิน (`TopUpPolicy`) | ค่าขั้นต่ำ/ขั้นสูงที่ผู้ปกครองแก้เองไม่ได้ และ Staff ที่ได้รับสิทธิ์ปรับได้ |

คำเดียวกันอาจมีความหมายต่างกันในแต่ละ context; อย่านำ model/entity ข้าม context มาใช้โดยตรง

## ความสัมพันธ์ระหว่าง contexts

| ผู้ใช้ข้อมูล | ต้องการ | สัญญาที่แนะนำ |
|---|---|---|
| `student-account` | ตรวจ policy ยอดเติมเงิน | port สำหรับอ่านค่าขั้นต่ำ/ขั้นสูงจาก `school-configuration` |
| `payments` | ตรวจบัตร/สิทธิ์บัญชี วงเงิน และตัดยอด Wallet | port ที่ประกาศโดย application ของ `payments`; implementation ที่ composition root เชื่อมกับ `student-account` |
| `payments` | ตรวจว่าร้านค้ารับชำระได้ | port สำหรับอ่านสถานะร้านค้าจาก `merchant-settlement` |
| `merchant-settlement` | สรุปยอดขายสุทธิหลังหักรายการ Void | read port หรือข้อมูลเหตุการณ์จาก `payments`; การคำนวณค่าธรรมเนียมและสถานะอนุมัติยังเป็นของ `merchant-settlement` |
| `student-account` / `payments` | ตรวจผู้เรียกและสิทธิ์ตามบทบาท | ใช้ identity/authorization ที่ผ่านการยืนยันจาก `school-configuration`; `student-account` ยังเป็นผู้ตัดสินความสัมพันธ์ Parent-Student |
| `student-account` | ตรวจ Staff session สำหรับ Web Admin endpoint | ให้ HTTP boundary ใช้ public auth port จาก `school-configuration`; ห้ามอ่าน/เขียนตาราง session จาก repository ของ `student-account` |

การเชื่อมต่อให้พึ่งพา interface ใน `ports.ts` หรือ public API ที่ export จาก `index.ts` เท่านั้น และต่อ implementation ที่ composition root (`main.ts`/module ของ NestJS) ห้าม import ไฟล์ภายในหรือเขียนตารางของ context อื่นโดยตรง

### ความสอดคล้องของเงินและรายการข้าม context

PRD ระบุ PostgreSQL transaction แบบ ACID แต่ยังไม่กำหนดขอบเขต atomic transaction ระหว่างการบันทึก `Payment` กับการตัด Wallet การใช้ฐานข้อมูลเดียวกันไม่ได้ทำให้ context เป็นเจ้าของข้อมูลร่วมกันโดยอัตโนมัติ ก่อน implement ต้องกำหนดเจ้าของรายการบัญชีและวิธีรับประกันว่าไม่มีการตัดเงินหรือบันทึกชำระเพียงด้านเดียว

## ตารางใน PRD เทียบกับ ownership

| ตารางตัวอย่างใน PRD | Context ที่เสนอ | หมายเหตุ |
|---|---|---|
| `students`, `rfid_cards` | `student-account` | `wallet_balance` และวงเงินอยู่ใน `students` ตามตัวอย่าง แต่เป็นแนวคิด Wallet; อย่าให้บัตรเป็นเจ้าของยอดเงิน |
| `merchants`, `settlements` | `merchant-settlement` | ควรกำหนดเจ้าของข้อมูลร้านค้า/อัตราค่าธรรมเนียมให้ชัดก่อนสร้าง repository |
| `system_settings` | `school-configuration` | ใช้เก็บ policy ขั้นต่ำ/ขั้นสูงเติมเงิน |
| `staff_admin_sessions`, `staff_admin_oidc_flows` | `school-configuration` | ข้อมูล technical session/one-time OIDC flow; เก็บ hash ของ session identifier เท่านั้น |
| `transactions` | ยังไม่ยืนยัน | ตัวอย่างรวม `PURCHASE`, `REFUND`, `TOPUP`, `VOID` ไว้ตารางเดียว ซึ่งมีความหมายและเจ้าของต่างกัน ต้องตกลง ledger, การอ้างอิงรายการต้นทาง และผู้มีสิทธิ์เขียนก่อน migration |
| บัญชี Parent/Staff และ Parent-Student link | ยังไม่มีใน schema ตัวอย่าง | บัญชี/role อยู่ `school-configuration`; ความสัมพันธ์ที่ใช้พิสูจน์สิทธิ์ดูแลนักเรียนอยู่ `student-account` |

## Aggregate candidates

ชื่อต่อไปนี้เป็นจุดเริ่มสำหรับออกแบบ ไม่ใช่ข้อบังคับให้สร้างคลาสหรือตารางตามชื่อนี้:

- `student-account`: `Wallet` สำหรับยอด/การปรับยอด/วงเงิน และโมเดลบัตรสำหรับ UID/สถานะ/กฎบัตร active ต่อคน แยก aggregate เมื่อกฎและขอบเขต atomicity เอื้อ
- `payments`: `Payment` สำหรับสถานะชำระ, idempotency key และการอ้างอิง Void
- `merchant-settlement`: `Settlement` สำหรับยอดต่อร้านค้าต่อวันและ state transition `PENDING_APPROVAL` → `APPROVED` → `PAID`
- `school-configuration`: โมเดลการตั้งค่าและ role assignment แบบเรียบง่ายตามระดับ `crud`

Aggregate root ต้องเป็นทางเดียวในการเปลี่ยนข้อมูลที่อยู่ภายใต้ invariant; ทำ aggregate ให้เล็กที่สุด และอย่าให้ use case เรียกสร้าง/แก้ entity ย่อยเพื่อข้ามกฎของ root

## ประเด็น PRD ที่ต้องคลี่คลายก่อนลง schema/API

| ประเด็น | หลักฐานใน PRD | ต้องตัดสินใจ |
|---|---|---|
| ขอบเขตยอด Wallet ติดลบ | BR-PAY-02 อนุญาตติดลบ แต่ schema ตัวอย่างกำหนดไม่ต่ำกว่า `-500.00` โดยไม่มี business rule ยืนยันเพดาน | กำหนดเพดานจริงหรือเอา constraint ตัวอย่างออก |
| วงเงินรายวัน | มี `current_daily_limit` และ `next_daily_limit` แต่ไม่มีวันเริ่มใช้/ยอดใช้สะสม/วิธี reset; วงเงินต้องครอบคลุม Offline ด้วย | กำหนดการนับยอดรายวัน, timezone, การใช้กับ cached balance และกรณี sync ล่าช้า |
| รายการเงินและ Void | ตาราง `transactions` รวมหลายประเภทและไม่ได้ระบุ foreign key ไปยังรายการที่ถูก Void | กำหนด ledger owner, เครื่องหมาย amount, ความสัมพันธ์ void/refund และการป้องกันทำซ้ำ |
| Top-up | มีทั้งขั้นต่ำและขั้นสูง แต่ AC3.2 ครอบคลุมเฉพาะยอดต่ำกว่า minimum; ขั้นตอน Gateway/webhook ยังไม่ระบุ | เพิ่ม AC สำหรับขอบเขตสูงสุด, gateway failure/duplicate callback และจังหวะเพิ่มยอด Wallet |
| Settlement cutoff | BR ใช้ 23:59 แต่ AC7.1 ระบุ 23:59:59; ไม่ระบุ timezone และรายการ Offline ที่ sync หลังปิดวัน | กำหนดเวลาปิดรอบ, timezone, การจัดวันของ Offline sale และวิธีหัก Void |
| Identity/authorization | ผู้ใช้ยืนยันให้รวม identity แล้ว แต่ PRD ยังไม่มี schema/use case สำหรับ login, reset, role หรือความสัมพันธ์ Parent-Student; แนวทาง OIDC ของโรงเรียนและ opaque session cookie สำหรับ Web Admin ได้รับอนุมัติแล้ว | ต้องกำหนดค่า IdP, Staff claim mapping, อายุ session และการตั้งค่า same-origin reverse proxy ก่อน deploy; ห้ามอนุมานสิทธิ์จาก ID ที่ส่งมา |

เอกสารนี้ไม่เปลี่ยน acceptance criteria ใน PRD; ให้แก้ PRD/use case และให้ผู้ใช้รีวิวก่อนใช้ข้อสรุปเหล่านี้สร้าง migration หรือ API

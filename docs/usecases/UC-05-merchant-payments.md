# UC-05: ร้านค้ารับชำระเงินแบบ Online และ Offline

> สถานะ: ร่างเพื่อรีวิว AC ก่อนออกแบบ Database/API
> Bounded context: `payments` (ระดับ `full`)
> แหล่งที่มา: [PRD](../../product_requirement_document_prd.md), UC-05 และ BR-PAY-01–03
> AC5.6–AC5.9 และ AC5.11 เป็นข้อเสนอเพิ่มเติม; ยังไม่ได้เพิ่มลง PRD

## ผู้ใช้งาน

- พ่อค้า-แม่ค้าที่ผ่านการยืนยันตัวตน ผ่าน Merchant Mobile App
- นักเรียนที่ใช้บัตร RFID เพื่อชำระค่าสินค้าหรืออาหาร

## เงื่อนไขก่อนเริ่ม

- Merchant และ Student มีบัญชีในระบบ
- Student มีบัตร RFID สถานะ `active`
- กรณี Online แอปเชื่อมต่อ Server ได้
- กรณี Offline แอปมี Cached Balance และยังไม่เกินช่วงเวลาทำงาน Offline

## ขั้นตอนหลัก

### ชำระแบบ Online

1. Merchant ระบุยอดและสแกนบัตร RFID
2. ระบบตรวจสอบ Merchant, บัตร, ยอดเงิน และวงเงินใช้จ่าย
3. ระบบบันทึกรายการชำระและหัก Wallet
4. แอปแสดงผลสำเร็จ

### ชำระแบบ Offline

1. แอปใช้ Cached Balance และตรวจเพดาน Offline ต่อรายการ
2. แอปบันทึกรายการใน Local SQLite และปรับ Cached Balance
3. แอปแสดงสถานะรอ Sync
4. เมื่อกลับมา Online แอปส่งรายการพร้อม `offline_trx_id` ไปยัง Server
5. Server ตรวจรายการซ้ำ บันทึกธุรกรรม และปรับ Wallet จริง

## กฎทางธุรกิจ

- Offline ใช้ Cached Balance และยอดต่อรายการต้องไม่เกิน 100 บาท (BR-PAY-01)
- Offline transactions เก็บในแอปได้ไม่เกิน 12 ชั่วโมง; หากเกินให้ล็อกการชำระจน Sync (BR-PAY-03)
- เมื่อ Sync พบยอดจริงไม่พอ อนุญาตให้ Wallet ติดลบเพื่อรองรับ Offline conflict (BR-PAY-02)
- `offline_trx_id` ใช้ตรวจรายการ Sync ซ้ำ (AC5.5)
- Daily Limit มีผลกับทั้ง Online และ Offline (BR-LIMIT-01)
- PRD ยังไม่กำหนดขีดจำกัดยอดติดลบสำหรับ Online/Offline conflict ในกฎธุรกิจ; ตัวอย่าง schema ระบุ floor `-500.00`

## แนวทางออกแบบตาม DDD (ข้อเสนอเพื่อรีวิว)

- **Bounded Context และภาษาธุรกิจ:** `Payment` และ Offline Sync เป็นของ `payments`; Wallet, บัตร และ Daily Limit เป็นของ `student-account`; สถานะร้านค้าเป็นของ `merchant-settlement` ห้ามใช้ model เดียวแทนกันข้าม context
- **Aggregate และ invariant:** `Payment` เป็น aggregate root candidate สำหรับสถานะรายการและ `offline_trx_id`; การบันทึก Sync ซ้ำต้องไม่สร้างรายการ/ตัดยอดซ้ำ; ทำ aggregate ให้เล็กและให้การเปลี่ยนสถานะ Payment ผ่าน root
- **Value Objects / Entities:** `Money`/ยอดชำระและ payment reference เป็น value object candidates; Payment แต่ละรายการมี identity ของตน ส่วนการจัดเก็บคิว Offline และ Cached Balance ใน Local SQLite เป็นความรับผิดชอบของแอป ไม่ใช่ aggregate ฝั่ง server
- **Application และ ports:** use case ประสานการค้นหา Payment, ตรวจข้อมูลบัตร/Wallet/Daily Limit และสถานะ Merchant, เรียกพฤติกรรม domain และบันทึก Payment; application ไม่ควรมี if/else ที่เป็นกฎยอด/สถานะ
- **ขอบเขตข้าม context:** ประกาศ port ฝั่ง `payments` สำหรับข้อมูล/การดำเนินการที่ต้องการจาก `student-account` และ `merchant-settlement`; composition root เชื่อม implementation; การตัด Wallet พร้อมบันทึก Payment ต้องกำหนด consistency/atomicity ก่อนเลือกกลไก
- **การวางกฎตามชั้น:** เพดาน 100 บาทและช่วง 12 ชั่วโมงที่ปฏิบัติบนอุปกรณ์เป็นกฎฝั่งแอปตาม BR; server รับผิดชอบ idempotency และบันทึก Sync; กฎ Daily Limit ที่ครอบคลุม Offline ต้องมีข้อตกลงข้อมูล cache/การ Sync ก่อนระบุผู้ตัดสิน
- **ชั้น HTTP/Infrastructure:** HTTP ตรวจรูปแบบ request และ map error; infrastructure ทำ SQL/constraints และ persistence; API mapper ตอบตาม OpenAPI ไม่ serialize row โดยตรง
- **ประเด็นยังไม่ตัดสิน:** เพดาน Wallet ติดลบ, ผลเมื่อ idempotency key เดิมมี payload ต่างกัน, การรับ Sync เกิน 12 ชั่วโมง และ atomicity ระหว่าง Payment กับ Wallet ยังต้องออกแบบ

## Acceptance criteria

| รหัส AC | Given | When | Then |
|---|---|---|---|
| **AC5.1** | มีสัญญาณเน็ต, บัตร `active`, Wallet `100.00` บาท และยอดซื้อ `35.00` บาท | Merchant ระบุยอดและแตะบัตร | สำเร็จ (`201 Created`): ตัด Wallet เหลือ `65.00` บาทและแสดงผลชำระสำเร็จ |
| **AC5.2** | แอปไม่มีเน็ต, Cached Balance `50.00` บาท และยอดซื้อ `30.00` บาท | Merchant แตะบัตรในโหมด Offline | สำเร็จแบบ Offline: บันทึกใน Local SQLite, Cached Balance เหลือ `20.00` บาท และแสดงสถานะรอ Sync |
| **AC5.3** | แอปไม่มีเน็ตและยอดซื้อ `120.00` บาท | Merchant พยายามชำระแบบ Offline | ปฏิเสธแบบ Offline: แจ้งว่าเพดานต่อรายการคือ 100 บาท; ไม่บันทึกรายการ |
| **AC5.4** | แอป Offline เกิน 12 ชั่วโมงโดยยังมีรายการรอ Sync | Merchant เข้าใช้งานหน้าคิดเงิน | ระงับการชำระและแจ้งให้เชื่อมต่ออินเทอร์เน็ตเพื่อ Sync ก่อน |
| **AC5.5** | แอปกลับมา Online และส่งรายการ Offline พร้อม `offline_trx_id` | Server ประมวลผลรายการ Sync | สำเร็จ (`200 OK`): ตรวจ `offline_trx_id`, บันทึกรายการ และตัดยอดจริง; หากยอดจริงไม่พอ Wallet ติดลบได้ |
| **AC5.6** *(เสนอ)* | ยอดใช้จ่ายสะสมของวันรวมรายการที่กำลังจะทำเกิน Daily Limit ที่มีผล | มีการชำระแบบ Online หรือ Offline | ปฏิเสธด้วย `DAILY_LIMIT_EXCEEDED`; ไม่บันทึกรายการใหม่หรือหักยอด |
| **AC5.7** *(เสนอ)* | คำขอ Online ไม่มีจำนวนเงิน หรือยอดไม่ใช่จำนวนเงินที่ถูกต้อง | Merchant ส่งคำขอชำระ | ปฏิเสธ (`400 INVALID_PAYMENT_REQUEST`); ไม่หัก Wallet |
| **AC5.8** *(เสนอ)* | RFID UID ไม่มีในระบบ หรือบัตรไม่อยู่ในสถานะ `active` | Merchant พยายามชำระ | ปฏิเสธ (`404 CARD_NOT_FOUND` หรือ `409 CARD_NOT_ACTIVE`); ไม่หัก Wallet |
| **AC5.9** *(เสนอ)* | ผู้เรียกไม่ได้ยืนยันตัวตนหรือไม่มีสิทธิ์ Merchant | ผู้เรียกพยายามสร้าง/Sync รายการชำระ | ปฏิเสธ (`401 AUTHENTICATION_REQUIRED` หรือ `403 MERCHANT_ACCESS_DENIED`); ไม่บันทึกรายการ |
| **AC5.10** *(เสนอ)* | รายการที่มี `offline_trx_id` เดียวกันถูก Sync และบันทึกสำเร็จแล้ว | แอปส่งรายการเดิมซ้ำ | คืนผลเดิม (`200 OK`); ไม่สร้างรายการหรือหัก Wallet ซ้ำ |
| **AC5.11** *(เสนอ)* | Wallet มีเงินไม่พอสำหรับยอด Online และไม่ใช่การ Sync รายการ Offline | Merchant ส่งคำขอชำระ | ปฏิเสธ (`409 INSUFFICIENT_BALANCE`); ไม่สร้างรายการและไม่เปลี่ยน Wallet |

## นอกขอบเขต

- การเติมเงินเข้า Wallet อยู่ใน UC-03
- การยกเลิกรายการชำระอยู่ใน UC-06
- การสรุปยอดและอนุมัติโอนเงินอยู่ใน UC-07
- การจัดการ Cached Balance บนตัวอุปกรณ์และรูปแบบฐานข้อมูลในแอปต้องกำหนดในรายละเอียด implementation

## คำถามที่ต้องตอบ

- วงเงินใช้จ่ายรายวันถูกตรวจใน Offline จาก cache แบบใด และแอปต้อง Sync ข้อมูลวงเงินเมื่อใด?
- Wallet ติดลบได้ต่ำสุดเท่าใด? ตัวอย่าง schema ระบุ `-500.00` แต่ BR-PAY-02 ไม่ได้ระบุขีดจำกัด
- ถ้า `offline_trx_id` เดิมถูกส่งพร้อมข้อมูลที่ต่างจากครั้งแรก ควรตอบ error ใด?
- รายการที่ถูกเก็บไว้นานกว่า 12 ชั่วโมงแต่กลับมา Sync ภายหลังยังรับได้หรือไม่?
- เมื่อ Merchant/บัตรไม่มีสิทธิ์ ควรตอบ `403` หรือซ่อนข้อมูลด้วย `404`?
- กรณี Online ยอดเงินไม่พอควรปฏิเสธตามข้อเสนอ AC5.11 หรืออนุญาตให้ติดลบด้วย?

## API ที่เกี่ยวข้อง

- `POST /merchant/payments`
- `POST /merchant/payments/sync`
- API status/error ของ AC5.6–AC5.11 เป็นข้อเสนอ; การทำรายการ Offline เกิดในแอปและไม่ใช่ HTTP request จนกว่าจะ Sync

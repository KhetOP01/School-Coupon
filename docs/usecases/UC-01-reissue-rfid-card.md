# UC-01: ออกบัตรใหม่และผูกบัตร RFID ทดแทน

> สถานะ: ใช้ AC ที่ทบทวนแล้วและข้อเสนอ DB/API เป็นฐานพัฒนา UC-01; สมมติฐานและประเด็นที่ยังไม่กำหนดระบุไว้ท้ายเอกสาร
> Bounded context: `student-account` (ระดับ `full`)
> แหล่งที่มา: [PRD](../../product_requirement_document_prd.md), หัวข้อ UC-01 และ BR-CARD
> AC1.3–AC1.7 เป็น AC เพิ่มเติมที่ผู้ใช้อนุมัติสำหรับฉบับร่างนี้

## ผู้ใช้งาน

สตาฟโรงเรียนที่ยืนยันตัวตนและมีสิทธิ์จัดการบัตร ผ่าน Web Admin

## เงื่อนไขก่อนเริ่ม

- นักเรียนมีบัญชีอยู่ในระบบ
- ผู้เรียกเป็น Staff ที่ผ่าน OIDC ของโรงเรียนและมี Web Admin session ที่ยังใช้งานได้
- Web Admin และ API ใช้ same-origin routing; session cookie เป็น `HttpOnly`, `Secure` ใน production และ `SameSite=Lax`
- กรณีเปลี่ยนบัตรเดิม บัตรเดิมมีสถานะ `active` หรือ `lost`
- RFID UID ใหม่ต้องไม่เคยถูกลงทะเบียนกับบัตรใดมาก่อน

## ขั้นตอนหลัก

1. Staff ระบุ Student ID ใน Web Admin
2. ระบบค้นหานักเรียนและแสดงบัตรที่เปลี่ยนได้กับยอด Wallet เพื่อให้ Staff ตรวจสอบตัวตนและข้อมูลก่อนดำเนินการ
3. Staff สแกน RFID UID ของบัตรใหม่และยืนยันการเปลี่ยนบัตร
4. ระบบตรวจสิทธิ์ Staff, ความถูกต้องของคำขอ และประวัติ UID
5. ระบบเปลี่ยนบัตรเดิมจาก `active` หรือ `lost` เป็น `deactivated` และผูก UID ใหม่เป็นบัตร `active`
6. ระบบคงยอด Wallet ของนักเรียนไว้เท่าเดิม เพราะยอดเงินผูกกับนักเรียน ไม่ใช่บัตร
7. ระบบบันทึกผลการเปลี่ยนบัตรและแสดงผลใน Web Admin

## กฎทางธุรกิจ

- นักเรียนหนึ่งคนมีบัตรสถานะ `active` ได้ไม่เกิน 1 ใบ (BR-CARD-01)
- เมื่อเปลี่ยนบัตร ยอด Wallet ของนักเรียนต้องคงเดิม 100% (BR-CARD-02)
- ค่าธรรมเนียมออกบัตรใหม่กรณีบัตรหายเก็บเป็นเงินสดนอกระบบ และห้ามหักจาก Wallet (BR-CARD-03)
- อนุญาตให้บัตรเดิมที่นำมาเปลี่ยนมีสถานะ `active` หรือ `lost`; สถานะ `lost` ต้องเป็นสถานะที่ระบบรองรับจริง
- RFID UID ที่เคยลงทะเบียนแล้วห้ามนำกลับมาใช้ซ้ำ ไม่ว่าบัตรเดิมจะเป็นของนักเรียนคนใดหรืออยู่ในสถานะใด
- การเปลี่ยนบัตรต้องเป็นการเปลี่ยนสถานะที่ครบถ้วน: หากคำขอถูกปฏิเสธ บัตรเดิมและ Wallet ต้องไม่เปลี่ยนแปลง

## Acceptance criteria

| รหัส AC | Given | When | Then |
|---|---|---|---|
| **AC1.1** | นักเรียนมีบัญชี, บัตรเดิมเป็น `lost` หรือ `active`, และ UID ใหม่ไม่เคยลงทะเบียน | Staff สแกน UID ใหม่และผูกกับ Student ID | สำเร็จ (`200 OK`): บัตรเดิมเป็น `deactivated`, บัตรใหม่เป็น `active`, และยอด Wallet คงเดิม 100% |
| **AC1.2** | UID เคยผูกกับนักเรียนคนอื่น ไม่ว่าสถานะบัตรเดิมเป็นอย่างไร | Staff ส่งคำขอผูก UID นั้น | ปฏิเสธ (`409 CARD_ALREADY_BOUND`); ไม่มีการเปลี่ยนบัตรหรือ Wallet |
| **AC1.3** | Student ID ไม่มีอยู่ในระบบ | Staff ส่งคำขอออกบัตร | ปฏิเสธ (`404 STUDENT_NOT_FOUND`); ไม่มีการสร้างหรือเปลี่ยนบัตร |
| **AC1.4** | คำขอไม่มี Student ID หรือ RFID UID | Staff ส่งคำขอออกบัตร | ปฏิเสธ (`400 INVALID_REQUEST`); ไม่เปลี่ยนข้อมูล |
| **AC1.5** | ผู้เรียกไม่มี Web Admin session ที่ใช้งานได้ หรือยืนยันตัวตนแล้วแต่ claim ไม่ได้รับ mapping เป็น Staff | ผู้เรียกเปิดหน้า Admin หรือส่งคำขอออกบัตร | หน้า Admin พาไปเริ่ม sign-in เมื่อไม่มี session; API ปฏิเสธ (`401 AUTHENTICATION_REQUIRED` หรือ `403 STAFF_ACCESS_REQUIRED`); ไม่เปลี่ยนข้อมูล |
| **AC1.6** | มีคำขอพร้อมกันสำหรับนักเรียนคนเดียวกัน ซึ่งหากยอมรับทั้งคู่จะทำให้เกิดบัตร `active` ซ้ำ | ระบบประมวลผลคำขอพร้อมกัน | ยอมรับได้ไม่เกินหนึ่งคำขอ; คำขอที่ชนกันถูกปฏิเสธ (`409 ACTIVE_CARD_CONFLICT`) และไม่มีสถานะหรือ Wallet เสียหาย |
| **AC1.7** | UID เคยลงทะเบียนกับบัตรของนักเรียนคนเดิมแล้ว รวมถึงบัตร `deactivated` | Staff พยายามนำ UID เดิมกลับมาใช้ | ปฏิเสธ (`409 CARD_ALREADY_BOUND`); UID ที่ลงทะเบียนแล้วห้ามนำกลับมาใช้ซ้ำ |

## DB + API specification review

Endpoints: `GET /admin/students/{studentId}/card-reissue-preview` และ `POST /admin/cards/reissue` (รายละเอียดใน [`openapi.yaml`](../../openapi.yaml))

หน้าจอค้นข้อมูลก่อน แล้วใช้ `expectedCardId` จากผล preview โดยไม่ให้ Staff กรอกรหัสบัตรภายในเอง `expectedCardId` ยังเป็นเงื่อนไข concurrency: คำขอที่สองซึ่งพยายามแทนที่บัตรเดียวกันหลังคำขอแรกสำเร็จจะได้ `409 ACTIVE_CARD_CONFLICT` แทนการแทนที่บัตรใหม่ซ้ำอีกครั้ง

| AC | API response | Database constraint / behavior |
|---|---|---|
| AC1.1 | Preview `200` แสดงนักเรียน/บัตรที่เปลี่ยนได้/ยอด Wallet; reissue `200` คืนบัตรใหม่และยอด Wallet ที่คงเดิม | Query preview อ่านข้อมูลนักเรียนและบัตร `active`/`lost`; transaction ปิดบัตรเดิมและเพิ่มบัตรใหม่; FK ผูกนักเรียน; partial unique index จำกัดบัตร `active` หนึ่งใบ |
| AC1.2 | `409 CARD_ALREADY_BOUND` | `UNIQUE (rfid_uid)` ป้องกัน UID ซ้ำทุกสถานะ |
| AC1.3 | Preview หรือ reissue ตอบ `404 STUDENT_NOT_FOUND` | ตรวจนักเรียนก่อนเปลี่ยนบัตร; FK ป้องกันบัตรที่ไม่มีนักเรียน |
| AC1.4 | `400 INVALID_REQUEST` | Request schema กำหนด field ที่ต้องมีและชนิดข้อมูล |
| AC1.5 | OIDC start/callback redirect; session endpoint `200` เมื่อ session ยังใช้ได้ และ `401 AUTHENTICATION_REQUIRED` หรือ `403 STAFF_ACCESS_REQUIRED` เมื่อไม่ผ่าน | เก็บเฉพาะ hash ของ session token; OIDC flow เป็น one-time และหมดอายุภายใน 5 นาที; ไม่สร้าง session เมื่อยืนยันตัวตนหรือ Staff mapping ไม่ผ่าน |
| AC1.6 | `409 ACTIVE_CARD_CONFLICT` เมื่อ `expectedCardId` ถูกเปลี่ยนไปแล้ว | อัปเดตบัตรเดิมแบบมีเงื่อนไขใน transaction; partial unique index ป้องกัน active card ซ้ำ |
| AC1.7 | `409 CARD_ALREADY_BOUND` | Unique UID ครอบคลุมบัตร `deactivated` ด้วย จึงนำ UID ที่เคยลงทะเบียนกลับมาใช้ไม่ได้ |

สมมติฐานด้าน API ที่ใช้ในการพัฒนา: `expectedCardId` เป็น field เพิ่มจากตัวอย่าง endpoint ใน PRD เพื่อให้ AC1.6 ตรวจจับคำขอแข่งขันอย่างชัดเจน; `409 CARD_NOT_REPLACEABLE` เป็นกรณีเพิ่มสำหรับบัตรเดิมที่ไม่ได้เป็นของนักเรียนหรือไม่ได้อยู่ในสถานะ `active`/`lost` การยืนยันตัวตนใช้ OIDC และ opaque session cookie ตามข้อเสนอที่ผู้ใช้อนุมัติ; ค่า IdP และ Staff claim mapping จริงยังต้องกำหนดก่อน deploy

Migration สร้างเฉพาะฟิลด์นักเรียนที่จำเป็นต่อ UC-01 และยังไม่เพิ่ม CHECK เพดาน Wallet `-500.00` เพราะ [context map](../architecture/context-map.md) ระบุว่าค่านี้ยังไม่มีข้อสรุปทางธุรกิจ; การเปลี่ยนบัตรไม่เขียนยอด Wallet

## นอกขอบเขต

- การอายัดหรือปลดอายัดบัตรโดย Parent/Staff เป็น UC-02
- การชำระค่าธรรมเนียมออกบัตรใหม่เป็นเงินสดอยู่นอกระบบ Wallet และไม่ได้กำหนด flow รับชำระเงินไว้ใน UC นี้
- การจัดการบัญชี Staff และ reset password ไม่ได้กำหนดใน UC นี้; การยืนยันตัวตนใช้ OIDC ของโรงเรียนเป็น technical prerequisite และไม่สร้างระบบรหัสผ่านภายใน

## คำถามที่ต้องตอบ

- จะอนุญาตให้ออกบัตรใหม่เมื่อนักเรียนมีบัตร `suspended` หรือมีบัตรที่ `deactivated` อยู่แล้วหรือไม่? AC1.1 ระบุเฉพาะบัตรเดิม `lost` หรือ `active`
- รูปแบบ/ความยาว/ตัวอักษรที่อนุญาตของ RFID UID คืออะไร? AC1.4 ครอบคลุมเฉพาะ field ที่ขาด
- ระบบต้องบันทึกผู้ดำเนินการ, เหตุผลการเปลี่ยนบัตร และเวลาออกบัตรเป็น audit data แบบใด?
- ค่าธรรมเนียมเงินสดมีนโยบาย/จำนวนเท่าไร และต้องบันทึกหลักฐานนอกระบบหรือไม่?
- บทบาทใดบ้างที่นับเป็น Staff และได้รับสิทธิ์ใช้ endpoint นี้?

## API ที่เกี่ยวข้อง

- `POST /admin/cards/reissue` ตาม traceability matrix ใน PRD และรายละเอียดใน [`openapi.yaml`](../../openapi.yaml)
- Error code และ response body ของ AC1.3–AC1.6 ระบุใน `openapi.yaml`; ข้อตกลง Authentication ยังเป็น provisional ตามข้อจำกัดของ UC-01

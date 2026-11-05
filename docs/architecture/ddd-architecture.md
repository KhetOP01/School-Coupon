# DDD สำหรับ School-Coupon

เอกสารนี้นำหลักจาก [คู่มือ DDD ฉบับมือใหม่](<../../คู่มือ DDD ฉบับมือใหม่.html>) มาใช้กับ [PRD ของ School-Coupon](../../product_requirement_document_prd.md) โดยไม่ยกตัวอย่างระบบห้องสมุดมาเป็นโดเมนของโปรเจกต์

ขอบเขตเริ่มต้นที่ตกลงกันอยู่ใน [context-map.md](./context-map.md) กติกาโครงสร้างและ workflow ที่ agent ต้องปฏิบัติอยู่ใน [ddd-architecture skill](../../.claude/skills/ddd-architecture/SKILL.md) และ [AGENTS.md](../../AGENTS.md)

## หลัก DDD ที่ใช้ในโปรเจกต์

1. ใช้คำเดียวกันระหว่าง PRD, use case, API และชื่อในโค้ด; ถ้าคำเดียวกันมีความหมายต่างกัน ให้แยกตาม context
2. ให้ bounded context เป็นเจ้าของ model และข้อมูลของตัวเอง; ห้ามมี context อื่นแก้ตารางนั้นโดยตรง
3. วาง invariant ไว้ใน domain model ที่เป็นเจ้าของกฎ และบังคับซ้ำที่ฐานข้อมูลเมื่อเป็น constraint เช่น UNIQUE, CHECK และ FK
4. ให้ aggregate root เป็นทางเข้าเปลี่ยน state ที่เกี่ยวกับ invariant; แบ่ง aggregate เล็กและรักษาความถูกต้องในขอบเขตที่ชัด
5. ให้ use case ประสานโหลด → เรียก domain → บันทึก โดยไม่ตัดสินกฎธุรกิจเอง
6. เริ่มจาก context ที่อนุมัติแล้วใน context map; อย่าสร้าง context หรือเปลี่ยนระดับ DDD เอง

## โครงสร้างโมดูล

ตามสถาปัตยกรรม NestJS ใน PRD ให้แยก bounded context ที่ backend ดังนี้:

```text
src/
├── modules/
│   ├── student-account/
│   ├── payments/
│   ├── merchant-settlement/
│   └── school-configuration/
├── shared/
└── main.ts
```

เมื่อเริ่ม implement ให้จัดชั้นภายในแต่ละ module ตามนี้ และเพิ่มเฉพาะชั้นที่จำเป็นกับระดับของ context:

```text
<context>/
├── domain/             # entity, value object, aggregate, repository interface, domain errors
├── application/        # หนึ่ง use case ต่อไฟล์, ports.ts
├── infrastructure/     # PostgreSQL, payment gateway, identity provider, offline adapters
├── interface/http/     # NestJS controllers, DTO validation, mappers
├── module.ts           # ประกอบ dependencies ของ context
└── index.ts            # public surface สำหรับ context อื่น
```

ใน NestJS ให้ controller/guard/DTO เป็น HTTP boundary; ห้ามย้าย business rule ไปไว้ใน controller หรือ guard เพียงเพราะเป็นจุดที่รู้จัก request/role

## กฎทิศทาง dependency

```text
interface/http → application → domain ← infrastructure
```

- `domain`: อ้างได้เฉพาะ domain ของตัวเองและ shared technical primitives ที่อนุญาต; ห้าม import NestJS, PostgreSQL driver/ORM, HTTP หรือ context อื่น
- `application`: เรียก domain ของตัวเองและประกาศสิ่งที่ต้องการจากภายนอกใน `ports.ts`; ไม่เขียน SQL และไม่รับ `Request`/`Response`
- `infrastructure`: implement repository/ports และต่อระบบภายนอก; ไม่เป็นที่ตัดสิน business rule
- `interface/http`: ตรวจรูปร่าง input, แปลง DTO/response และ map domain error เป็น HTTP ตาม OpenAPI; ไม่ query DB เอง
- ข้าม context ผ่าน port หรือ public export จาก `index.ts` เท่านั้น; composition root เป็นผู้ต่อ implementation
- `shared/` เก็บเฉพาะโค้ดเทคนิคร่วม เช่น clock, database connection และ domain error base; ห้ามย้ายกฎของโรงเรียนมาไว้ที่นี่

## วางกฎของ PRD ในชั้นที่รับผิดชอบ

| เรื่อง | เจ้าของ/ชั้น |
|---|---|
| บัตร active ได้หนึ่งใบต่อบัญชีนักเรียน, อายัด/ปลดอายัด และเปลี่ยนบัตร | `student-account/domain`; repository/DB บังคับ unique active card ต่อ student |
| Wallet debit/credit, ติดลบ, วงเงิน และการมีผลวันถัดไป | `student-account/domain`; application ประสานคำสั่งจาก parent/payment |
| กฎ offline เช่นวงเงินต่อรายการและ idempotency ตอนรับ Sync | ตรวจในแอปสำหรับ UX และตรวจซ้ำใน `payments/domain`/application ฝั่ง server ตามขอบเขตที่ตกลง |
| Void ได้เฉพาะช่วงวันและต้องอ้างรายการเดิม | `payments/domain`; ใช้ injected clock/timezone และ unique/idempotency constraints ตามข้อกำหนด |
| ค่าธรรมเนียมเปอร์เซ็นต์, คำนวณ settlement, approve transition | `merchant-settlement/domain`; ข้อมูลการขายอ่านผ่าน port จาก `payments` |
| ยอดเติมเงินต่ำสุด/สูงสุดและการกำหนดสิทธิ์ผู้ใช้ | `school-configuration`; การอ่านค่าจาก context อื่นผ่าน port |
| ตรวจ field/type ของ HTTP request | `interface/http` ด้วย DTO/validation; ไม่ใช่ business rule |
| SQL, payment gateway, identity provider, local SQLite/secure storage | `infrastructure` ของ context/client ที่รับผิดชอบ |

รายละเอียดความเป็นเจ้าของและจุดเชื่อมต่ออยู่ใน [context-map.md](./context-map.md) ข้อความในตารางเป็นการจัดวางกฎตามขอบเขตตั้งต้น ไม่ใช่การยืนยันว่า schema ตัวอย่างปัจจุบันถูกต้องแล้ว

## แนวทาง aggregate และ transaction

- ออกแบบ aggregate จาก invariant ใน use case ไม่ใช่สร้าง aggregate หนึ่งต่อหนึ่งตามตาราง
- ตัวอย่าง candidate: Wallet ที่คุมยอด/วงเงิน, Payment ที่คุม idempotency/void state และ Settlement ต่อร้านค้าต่อวัน
- การเปลี่ยนบัตรและ invariant "active ได้หนึ่งใบ" ต้องปลอดภัยเมื่อมีคำขอพร้อมกัน; ใช้ transaction/constraint ของ PostgreSQL เป็นแนวป้องกันชั้น persistence เพิ่มเติม
- ห้ามให้ `payments` เขียนยอด Wallet เอง; ให้เรียก port ที่ `student-account` เป็นผู้ให้บริการ
- ก่อนทำ debit ให้กำหนด atomicity ระหว่าง Payment record กับ Wallet movement; PostgreSQL ACID ใช้ได้ภายใน transaction ที่มีขอบเขตชัด แต่ไม่ควรรวม table ownership ของหลาย context เพียงเพื่อให้ transaction ง่าย
- เวลาในกฎเช่นวันถัดไป, 12 ชั่วโมง และ cutoff settlement ต้องระบุ timezone และรับ clock ที่ inject ได้; ห้ามอ่านเวลาระบบตรง ๆ ใน domain/application

## การทดสอบ

| ชั้น | ตรวจอะไร | วิธีทดสอบ |
|---|---|---|
| Domain | invariant ของแต่ละ AC และ state transition | unit test ไม่ต่อ DB; ชื่อเริ่มด้วย AC เช่น `AC1.1: ...` |
| Application | ลำดับ use case, not found, ports และผลข้างเคียงที่ประสาน | fake repositories/ports และ fixed clock |
| Infrastructure | mapping SQL, constraints, concurrent updates | PostgreSQL จริงผ่าน Docker/Testcontainers |
| HTTP | DTO validation, status/error และรูป response | ทดสอบตาม `openapi.yaml` |
| Integration/E2E | flow ข้าม context เช่นชำระเงินแล้วสรุป settlement | DB จริงและทดสอบทั้ง success/failure |
| Mobile offline | queue, cached balance, 100 บาท/รายการ และ lock หลัง 12 ชั่วโมง | ทดสอบ logic ฝั่งแอปแยกจาก server tests แล้วทดสอบ sync integration |

ทุก AC ต้องมีเทสต์ตาม Definition of Done ใน PRD และกติกา TDD ใน `AGENTS.md`; ถ้า AC ยังไม่มี ต้องปรับ use case ให้ผู้ใช้รีวิวก่อนเขียน production code

## ขั้นตอนก่อน implement context ใหม่

1. อ่าน PRD และ context map; เลือก context ที่มีอยู่และยืนยันเจ้าของ invariant/data
2. เขียน/ปรับ use case และ AC ให้ครอบคลุมกรณีผิดพลาด, สิทธิ์, ซ้ำ และ concurrency ที่เกี่ยวข้อง
3. ให้ผู้ใช้รีวิว AC และคลี่คลายรายการในหัวข้อ open questions ของ context map ก่อนเปลี่ยน schema/API
4. เขียน database migration คู่กับ OpenAPI ตาม workflow; ระบุ AC-to-API-to-DB traceability
5. เริ่ม TDD จาก domain ออกไป application, infrastructure และ HTTP; เทสต์ repository กับ PostgreSQL จริง
6. ต่อข้าม context ผ่าน ports/public APIs และเพิ่ม integration/E2E tests

ขั้นตอนนี้อิง Spec-First workflow ของ repo; เอกสาร DDD ไม่ได้แทน use case หรืออนุมัติ business rules ใหม่

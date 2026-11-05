---
name: ddd-architecture
description: ใช้ทุกครั้งที่สร้างหรือย้ายไฟล์ใน src/modules, เพิ่ม entity/aggregate/use case/repository, เพิ่ม bounded context ใหม่ หรือรีวิวโค้ดว่าวางถูกชั้นตาม DDD ไหม
---

# DDD architecture

โปรเจกต์นี้จัดโค้ดแบบ Domain-Driven Design: ระดับบนแบ่งตาม bounded context ข้างในแบ่งเป็น 4 ชั้น กฎธุรกิจอยู่ใน domain เท่านั้น

## ก่อนเริ่มทุกครั้ง
1. อ่าน `docs/architecture/context-map.md` เพื่อดูว่ามี context อะไร แต่ละตัวเป็นเจ้าของตารางไหน และใช้ระดับ DDD แบบไหน (full / light / crud) ถ้ายังไม่มีไฟล์นี้ ให้สร้างจากโค้ดที่มีอยู่ แล้วให้ผู้ใช้ยืนยัน
2. ตัดสินว่างานนี้อยู่ context ไหน ถ้าไม่ชัดหรือดูเหมือนต้องสร้าง context ใหม่ **ให้ถามผู้ใช้ก่อน** อย่าสร้าง context ใหม่เอง
3. ดูโค้ดใน context นั้นก่อน แล้วทำตามรูปแบบที่มีอยู่ (การตั้งชื่อ, รูปแบบ error, วิธีต่อสาย)

## โครงสร้าง
```
src/
├── modules/<context>/
│   ├── domain/            entity, value object, aggregate, repository interface, domain service, errors
│   ├── application/       หนึ่งไฟล์ต่อหนึ่ง use case + ports.ts (สิ่งที่ต้องการจาก context อื่น)
│   ├── infrastructure/    implement repository ด้วย SQL, เรียกระบบภายนอก
│   ├── interface/http/    routes + mapper (domain ↔ JSON ตาม openapi.yaml)
│   ├── module.ts          ต่อสายชิ้นส่วนของ context นี้
│   └── index.ts           สิ่งเดียวที่ context อื่น import ได้
├── shared/                domain-error, clock, db, http-errors (ของเทคนิคล้วน ห้ามมีกฎธุรกิจ)
└── main.ts                ประกอบทุก module
```
เทสต์อยู่ใน `__tests__/` ข้างชั้นนั้นๆ, e2e อยู่ที่ `tests/e2e/`, migration อยู่ที่ `db/migrations/`

## กฎทิศทาง (ห้ามละเมิด)
```
interface/http → application → domain ← infrastructure
```
| ชั้น | import ได้ | ห้าม |
|---|---|---|
| domain | `shared/domain-error`, `shared/clock` (type) เท่านั้น | `pg`, `express`, ORM, ชั้นอื่น, context อื่น |
| application | domain ของ context ตัวเอง, `shared/` | SQL, `req`/`res`, ไฟล์ข้างในของ context อื่น |
| infrastructure | domain ของ context ตัวเอง, `shared/`, driver DB | กฎธุรกิจ |
| interface/http | application, type/error จาก domain, `shared/` | SQL, กฎธุรกิจ |

ข้าม context: import ได้เฉพาะจาก `modules/<other>/index.ts` หรือดีกว่านั้น ให้ application ประกาศ interface ใน `ports.ts` แล้วให้ `main.ts` ส่งของจริงเข้ามา

## ไฟล์นี้ควรอยู่ไหน
| ถ้าโค้ด... | ใส่ใน |
|---|---|
| ตัดสินว่าทำได้หรือไม่ได้ตามกฎธุรกิจ | domain: เมธอดของ entity/aggregate |
| คำนวณค่าที่มีความหมายทางธุรกิจ (วันกำหนดคืน, เงิน) | domain: value object |
| กฎที่ต้องดูหลาย aggregate | domain: domain service |
| โหลด → เรียก domain → บันทึก | application: use case |
| มี SQL / HTTP client / อีเมล / ไฟล์ | infrastructure |
| อ่าน req เขียน res, แปลง JSON, แปลง DomainError เป็น status | interface/http (+ `shared/http-errors.ts`) |
| ตรวจรูปแบบ input (field ขาด, type ผิด) | interface/http |

## ลำดับการสร้าง use case ใหม่ (จากในออกนอก ใช้ TDD ทุกชั้น)
1. **domain**: เขียนเทสต์ตาม AC เรื่องกฎ (`it('AC3: ...')`) ให้ fail → สร้าง/แก้ value object, entity, aggregate ให้ผ่าน
2. **domain**: ประกาศหรือเพิ่มเมธอดใน repository interface
3. **application**: ถ้าต้องใช้ข้อมูล context อื่น เพิ่ม interface ใน `ports.ts` → เขียนเทสต์ use case ด้วย fake repository + `fixedClock` → สร้างคลาส use case
4. **infrastructure**: เขียนเทสต์กับ PostgreSQL จริง → implement repository, แปลง error ของ DB เป็น `DomainError` (เช่น `23505` → code ที่ตรง AC)
5. **interface/http**: route + mapper ให้ตรง `openapi.yaml`, เพิ่ม error code ใน `shared/http-errors.ts`
6. ต่อสายใน `module.ts` / `main.ts` แล้วเพิ่ม e2e ถ้า flow ข้าม context

## รูปแบบโค้ด

Value object: immutable, constructor เป็น private, สร้างผ่าน factory ที่มีกฎ และ `restore()` สำหรับโหลดจาก DB
```ts
export class DueDate {
  static readonly LOAN_DAYS = 14;
  private constructor(readonly value: Date) {}
  static from(borrowedAt: Date) { /* +14 วัน */ }
  static restore(value: Date) { return new DueDate(value); }
}
```

Entity: มี id, มี `start()` (สร้างใหม่ ตรวจกฎ) และ `restore()` (โหลดจาก DB ไม่ตรวจกฎ), เปลี่ยน state ผ่านเมธอดที่มีความหมายเท่านั้น ไม่มี setter
```ts
loan.markReturned(now)   // ถูก
loan.returnedAt = now    // ผิด
```

Aggregate root: เป็นทางเดียวในการเปลี่ยนข้อมูลในกลุ่ม ถือเฉพาะข้อมูลที่จำเป็นต่อกฎ
```ts
const loan = borrower.borrow(copyId, clock.now());  // ถูก
const loan = Loan.start(...)  // ผิด เมื่อเรียกจาก application (ข้ามกฎของ Borrower)
```

Use case: constructor รับ repository, ports, clock; `execute()` อ่านเหมือนขั้นตอนใน `docs/usecases/` และ**ไม่มี if เรื่องกฎธุรกิจ** (ยกเว้นเช็ก "ไม่พบข้อมูล")

Error: domain โยน `new DomainError('UPPER_SNAKE_CODE')` code ต้องตรงกับที่ประกาศใน `openapi.yaml` ห้าม throw HTTP status จาก domain/application

เวลา: ห้ามเรียก `new Date()` หรือ `Date.now()` ใน domain/application ให้รับ `now` เป็นพารามิเตอร์หรือใช้ `Clock`

## ระดับ DDD ต่อ context
ดูจาก `context-map.md`
- **full**: 4 ชั้นครบ ใช้กับ context ที่กฎเยอะ
- **light**: domain บางๆ (entity มีเมธอดไม่กี่ตัว) use case อาจอยู่ไฟล์เดียวกับ domain service
- **crud**: route → repository ตรงๆ ภายใน module ของตัวเอง ยังต้องคุยกับคนอื่นผ่าน `index.ts`

อย่ายกระดับ context เอง ถ้าเห็นว่า crud context เริ่มมีกฎเยอะ ให้เสนอผู้ใช้ก่อน

## ห้ามทำ
- entity ที่มีแต่ getter/setter แล้วกฎไปอยู่ใน use case (anemic model)
- import `pg` / ORM / `express` ใน domain
- aggregate ที่ใหญ่เกินจำเป็น (เช่น `Library` ถือทุกอย่าง)
- ส่งแถวจาก DB ออกเป็น JSON ตรงๆ ต้องผ่าน domain + mapper
- เขียน (INSERT/UPDATE/DELETE) ตารางที่เป็นของ context อื่น; การอ่านตรงๆ ทำได้เฉพาะที่ `context-map.md` อนุญาต
- ใส่กฎธุรกิจใน `shared/`
- ตั้งชื่อเชิงเทคนิค (`LoanManager`, `processData`, `handleRecord`) ให้ใช้คำในภาษาธุรกิจที่อยู่ใน use case และ context map

## ตรวจก่อนบอกว่าเสร็จ
- [ ] `grep -rE "from ['\"](pg|express)" src/modules/*/domain` ไม่มีผลลัพธ์
- [ ] ไม่มีการ import ไฟล์ข้างในของ context อื่น (มีแค่ผ่าน `index.ts` หรือ ports)
- [ ] กฎธุรกิจใหม่ทุกข้ออยู่ใน domain และมีเทสต์ domain ชื่อขึ้นต้นด้วยรหัส AC
- [ ] use case ไม่มี SQL, ไม่มี `req`/`res`, ไม่มีเงื่อนไขกฎธุรกิจ
- [ ] repository มีเทสต์กับ DB จริง
- [ ] error code ใหม่ถูกเพิ่มใน `shared/http-errors.ts` และ `openapi.yaml`
- [ ] ถ้าเพิ่มตารางหรือคำศัพท์ใหม่ อัปเดต `context-map.md`
- [ ] lint ผ่าน (มีกฎ boundaries)

รายงานผู้ใช้ด้วยรายการไฟล์ที่สร้าง/แก้ แยกตามชั้น และบอกถ้ามีจุดที่ตัดสินใจแทนผู้ใช้

---
name: jira-backlog
description: ใช้เมื่อต้องร่างหรือปรับ product backlog ใน Jira เช่นแตก Epic เป็น Story, เขียน Story พร้อม AC, สร้างรายการ Sub-task ตาม workflow, ตั้ง Setup Task, หั่น Story ที่ใหญ่เกิน, ทำไฟล์ CSV สำหรับ import เข้า Jira หรือตรวจว่า Story พร้อมเข้า sprint ไหม
---

# Jira backlog

ร่าง backlog ให้ตรงกับ workflow ของทีม (use case + AC → DB + API spec → mock/seed → TDD → integration) และโครง DDD

## หลักการ
- **1 Story = 1 use case** AC อยู่ใน Story และต้องตรงกับ `docs/usecases/UC-xx.md` ห้ามเขียนให้ต่างกัน
- **Epic = กลุ่มความสามารถที่ผู้ใช้ได้** ("การยืมคืนหนังสือ") ไม่ใช่ชั้นของระบบ ("Backend", "Database")
- **Component = bounded context** ตาม `docs/architecture/context-map.md`
- **Sub-task = ขั้นของ workflow ภายใน Story** Story หนึ่งใบมีเจ้าของหลักคนเดียว
- **Task = งานเทคนิคที่ยืนเดี่ยว** ไม่เป็นของ Story ไหน
- หั่น Story ตาม AC (แนวตั้ง) ไม่หั่นตามชั้น

## ก่อนเริ่ม
1. อ่าน `docs/architecture/context-map.md` และ `docs/usecases/` ที่มีอยู่
2. ถามผู้ใช้ถ้าไม่รู้: project key ของ Jira (เช่น `LIB`), Epic ที่จะใส่, ผลลัพธ์ที่ต้องการ (ข้อความ / CSV / สร้างใน Jira)
   **ถ้าทีมไม่ใช้ Jira:** ไม่ต้องถาม project key ใช้รหัส use case เป็น key (`UC-12`) ทั้งใน branch, commit และแผน และทำผลลัพธ์เป็นข้อความหรือ CSV ใน `docs/backlog/` เท่านั้น
3. ถ้ากฎธุรกิจไม่ชัด (ตัวเลข สิทธิ์ ข้อยกเว้น) ให้ถาม อย่าเดา แล้วใส่คำถามที่ค้างไว้ในส่วน "คำถามที่ต้องตอบ" ของ Story

## Story
ใช้ `templates/story.md` ทุกช่องต้องมี:
- **Summary:** `UC-xx <กริยา + สิ่งของ>` เช่น `UC-01 ยืมหนังสือ`
- **User story:** ในฐานะ ... ฉันต้องการ ... เพื่อ ...
- **กฎทางธุรกิจ** ตัวเลขชัดเจน
- **Acceptance criteria** แบบ Given / When / Then รหัส AC1, AC2, ... ต้องมีเคสไม่สำเร็จครบ (ไม่พบข้อมูล, ไม่มีสิทธิ์, ซ้ำ, ผิดกฎแต่ละข้อ) และ Then ระบุ error code ที่จะอยู่ใน `openapi.yaml`
- **นอกขอบเขต** อย่างน้อย 1 ข้อ
- **อ้างอิง** ไฟล์ use case และ endpoint
- Component, story points (ถ้าผู้ใช้ให้มา ไม่เดาเอง ให้ใส่ `?`)

## Sub-task
ตั้งชื่อ `<คำนำหน้า>: <กริยา + สิ่งของ> (ACx)` เรียงตามนี้ และตัดใบที่ไม่จำเป็นออกตามขนาด Story

| คำนำหน้า | ขั้น | เสร็จเมื่อ |
|---|---|---|
| `Spec:` | เขียน use case + AC ลง `docs/usecases` | ไฟล์ตรงกับ Story |
| `Spec:` | เพิ่ม endpoint ใน `openapi.yaml` | Prism mock ตอบทุก status ได้ |
| `DB:` | migration ใหม่ | migrate จากศูนย์ผ่าน |
| `Review:` | รีวิว spec + migration | ตาราง AC ↔ API ↔ DB ครบ, คนอื่นเป็นคนปิด |
| `Seed:` | ข้อมูลตาม AC | หนึ่งชุดต่อ AC |
| `Domain:` | entity / VO / aggregate (AC กฎ) | เทสต์ domain ผ่าน |
| `App:` | use case (AC ไม่พบข้อมูล) | เทสต์ด้วย fake ผ่าน |
| `Infra:` | repository (AC constraint) | เทสต์ DB จริงผ่าน |
| `HTTP:` | route + mapper + error code | response ตรง spec |
| `E2E:` | flow ข้าม use case | CI เขียว |

กฎ:
- ใส่รหัส AC ในชื่อ Sub-task ที่ทำ AC นั้น ทุก AC ต้องปรากฏอย่างน้อยหนึ่งใบ
- Sub-task ละไม่เกิน 1 วัน ใหญ่กว่านั้นให้หั่นตาม AC
- context ระดับ `crud` ใน context map ไม่ต้องแยก `Domain:` / `App:` ใช้ `HTTP:` + `Infra:` พอ
- Story ที่ไม่เพิ่ม endpoint หรือตารางใหม่ ตัด `Spec: openapi` / `DB:` ออก
- ไม่ประเมิน points ที่ Sub-task

## Task เดี่ยวและประเภทอื่น
- `Setup: ...` งานตั้งต้นที่ปลดล็อกทุก Story (โครง DDD, docker-compose, CI, ESLint boundaries, context map, ไฟล์ AI) วางบนสุดของ backlog
- `Tech: ...` ปรับปรุงโค้ด/หนี้เทคนิค ระบุเหตุผลและผลที่ได้
- `Spike: <คำถาม> (≤ X วัน)` สำหรับเรื่องที่ยังไม่รู้ ผลลัพธ์คือคำตอบหรือ Story ใหม่ ไม่ใช่โค้ด production
- `Bug: <สิ่งที่เกิด> เมื่อ <เงื่อนไข>` ใส่ขั้นตอนทำซ้ำ ผลที่คาด ผลที่เกิด และ Sub-task แรกเป็น "เขียนเทสต์ที่ fail ซ้ำบั๊ก"

## หั่น Story ที่ใหญ่เกิน
สัญญาณ: เกิน 8 points, AC เกิน ~7 ข้อ, Sub-task เกิน ~12 ใบ หรือทำไม่จบใน sprint
- ใบแรก: เส้นทางสำเร็จ + ไม่พบข้อมูล
- ใบถัดไป: กลุ่มกฎทีละกลุ่ม
- ทุกใบต้องเดโมได้ด้วยตัวเอง ห้ามหั่นเป็น "ทำ DB" / "ทำ API"
- ตั้งชื่อ `UC-01a ...`, `UC-01b ...` และ link แบบ blocks

## ตรวจ Definition of Ready
รายงานเป็นตาราง ✅ / ❌ ต่อ Story:
- AC ครบรวมเคสไม่สำเร็จ และมี error code
- ตัวเลขในกฎชัด
- มีนอกขอบเขต
- มี component
- มี story points
- ไม่มีคำถามค้าง (ถ้ามี เสนอ Spike)

## ผลลัพธ์
เลือกตามที่ผู้ใช้ต้องการ ถ้าไม่ได้บอก ให้แสดงเป็นข้อความก่อน แล้วเสนอ CSV หรือสร้างใน Jira

**1. ข้อความ** แสดงเป็นต้นไม้ Epic → Story → Sub-task แล้วตามด้วย description เต็มของแต่ละ Story

**2. CSV สำหรับ import** ใช้หัวคอลัมน์ตาม `templates/import.csv`
- `Issue Id` เป็นเลขชั่วคราวที่ไม่ซ้ำในไฟล์ `Parent Id` อ้างถึง `Issue Id` ของแม่ (Story → Epic, Sub-task → Story)
- ใส่ description เป็นข้อความหลายบรรทัดใน double quote และ escape `"` เป็น `""`
- บันทึกเป็น UTF-8 ที่ `docs/backlog/<ชื่อ>.csv`
- บอกผู้ใช้ว่าใน Jira ไปที่ import issues จาก CSV แล้ว map คอลัมน์ `Issue Id` / `Parent Id` ให้ตรงกับช่อง Issue ID / Parent ในหน้าจอ mapping (ชื่อเมนูและช่องอาจต่างกันตามรุ่นของ Jira)

**3. สร้างใน Jira โดยตรง** ทำได้เมื่อมี Jira/Atlassian MCP tool ในเซสชันเท่านั้น
- แสดงรายการทั้งหมดให้ผู้ใช้อนุมัติก่อนสร้างเสมอ
- สร้างตามลำดับ Epic → Story → Sub-task → link
- ห้ามแก้หรือลบ issue ที่มีอยู่แล้วโดยไม่ได้รับอนุญาต
- จบด้วยรายการ issue key ที่สร้าง

ถ้าไม่มี Jira tool อย่าแกล้งทำว่าสร้างแล้ว ให้ทำเป็นข้อความหรือ CSV แทน

## ต่อกับงานเขียนโค้ด (branch)
ทีมใช้ `main` สายเดียวที่พร้อม deploy เสมอ แตก branch สั้นๆ ต่อ issue ไม่มี develop/release branch
- ชื่อ branch: `<ประเภท>/<KEY>-<ชื่อสั้นภาษาอังกฤษ kebab-case>` (KEY คือ issue key ของ Story หรือรหัส UC ถ้าไม่ใช้ Jira)
  - `feature/` Story · `fix/` Bug · `chore/` Setup/Tech · `spike/` Spike (ไม่ merge) · `hotfix/` production พังด่วน
- ใช้ key ของ Story ไม่ใช่ของ Sub-task, หนึ่ง Story หนึ่ง branch
- commit: `<KEY> AC<n>: <สิ่งที่ทำ>` หรือ `<KEY> <สิ่งที่ทำ>` ถ้าไม่เกี่ยวกับ AC
- PR: ชื่อ `<KEY> <Summary ของ Story>` คำอธิบายมีตาราง AC → ไฟล์เทสต์ → สถานะ
- branch ไม่ควรอยู่เกิน 2–3 วัน ถ้า Story ใหญ่ ให้เสนอแบ่ง PR ตามชั้น: (1) spec + migration + seed (2) domain + app + infra (3) http + e2e
- เมื่อร่าง Sub-task ให้ระบุว่าแต่ละใบอยู่ PR ที่เท่าไหร่ ถ้า Story ต้องแบ่ง PR

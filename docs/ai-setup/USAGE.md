# ใช้ Superpowers กับ workflow ของทีม

หลักง่ายๆ: **`feature-workflow` บอกว่าทำอะไรก่อนหลัง ส่วน Superpowers บอกว่าแต่ละขั้นต้องทำอย่างมีวินัยยังไง** ถ้าสองฝั่งขัดกัน ให้ทำตาม `AGENTS.md`

Superpowers 7.x ไม่มีคำสั่ง `/brainstorm` `/write-plan` `/execute-plan` แล้ว ให้พูดตามปกติแล้ว skill จะทำงานเอง หรือเรียกชื่อ skill ตรงๆ เช่น `/superpowers:brainstorming`

## ภาพรวม: ฟีเจอร์หนึ่งชิ้นผ่านอะไรบ้าง

**KEY** คือ issue key ของ Story ถ้าใช้ Jira (`LIB-12`) หรือรหัส use case ถ้าไม่ใช้ Jira (`UC-12`) หนึ่ง Story ใช้ worktree และ branch เดียวตั้งแต่ขั้นที่ 1 ถึง PR ทุกครั้งที่ Claude เริ่ม skill ต้องประกาศเป็นข้อความว่า `Using <ชื่อ skill>`

| ขั้น (feature-workflow) | skill ที่ทำงาน | ผลลัพธ์ | คุณต้องทำ |
|---|---|---|---|
| 1. Use case + AC | `using-git-worktrees` → `brainstorming` → `jira-backlog` | worktree + branch `feature/<KEY>-...`, `docs/usecases/UC-xx-<name>.md`, ร่าง Story + Sub-task | ตอบคำถาม รีวิว AC **[REVIEW]** |
| 2. DB + API spec | `ddd-architecture` (ดู context map) | migration ใหม่, `openapi.yaml`, ตาราง AC ↔ API ↔ DB | รีวิวตาราง **[REVIEW]** |
| 3. Mock + seed | - | Prism mock เปิดได้, `db/seed.sql` หนึ่งชุดต่อ AC | - |
| 4. แผนงาน | `writing-plans` | `docs/plans/<KEY>-<ชื่อ>.md` หนึ่ง task ต่อ AC จบด้วยคำถาม Subagent-driven หรือ Inline | รีวิวแผน ตอบว่าทำแบบไหน **[REVIEW]** |
| 5. TDD ทีละ AC | `using-git-worktrees` (ตรวจว่าอยู่ใน worktree เดิม) → `subagent-driven-development` หรือ `executing-plans` → `test-driven-development` + `ddd-architecture` | โค้ด + เทสต์ `AC<n>: ...`, หนึ่ง commit ต่อ AC `<KEY> AC<n>: ...`, รายงาน red/green ต่อ AC | ดูรายงาน red/green |
| 6. Integration + CI | `test-driven-development` | E2E หนึ่ง flow, CI รัน migrate → seed → test | - |
| Done | `verification-before-completion` → `requesting-code-review` → `finishing-a-development-branch` | ตาราง AC → เทสต์ → สถานะ, PR | เลือก "เปิด PR" |

## สถานการณ์ที่ 1: Story ใหม่ (ใช้บ่อยที่สุด)

**เริ่ม (ทีมที่ใช้ Jira)**
```
เริ่มฟีเจอร์ LIB-12 ยืมหนังสือ: สมาชิกยืมได้ครั้งละไม่เกิน 3 เล่ม ยืมได้ 14 วัน
```
**เริ่ม (ทีมที่ไม่ใช้ Jira)**
```
เริ่มฟีเจอร์ UC-12 ยืมหนังสือ: สมาชิกยืมได้ครั้งละไม่เกิน 3 เล่ม ยืมได้ 14 วัน
```
ได้ branch `feature/UC-12-borrow-book`, commit `UC-12 AC3: ...`, แผน `docs/plans/UC-12-borrow-book.md` และ backlog เป็นข้อความหรือ CSV ใน `docs/backlog/` Claude ต้องไม่ถาม project key ของ Jira

สิ่งที่ควรเกิด:
1. Claude ขึ้นข้อความ `Using feature-workflow` แล้ว `Using using-git-worktrees` สร้าง worktree พร้อม branch `feature/<KEY>-...` จาก `origin/main` ก่อนเขียนไฟล์ใดๆ
2. `Using brainstorming` ถามคุณ**ทีละคำถาม** เช่น สมาชิกที่ถูกระงับยืมได้ไหม หรือถ้ามีค่าปรับค้างล่ะ ให้ตอบให้ชัด ตัวเลขต้องชัด
3. เขียน `docs/usecases/UC-12-borrow-book.md` พร้อมตาราง AC รวมเคสไม่สำเร็จ แล้ว `Using jira-backlog` ร่าง Story กับ Sub-task และ commit use case ใน branch นี้
4. หยุดรอให้คุณรีวิว

**ถ้า Claude เขียน spec ไปที่ `docs/superpowers/specs/`** หรือกระโดดไปทำแผนเลยหลัง brainstorming ให้บอกว่า:
```
ทำตาม AGENTS.md: spec อยู่ใน docs/usecases/ และหลัง brainstorming ต้องทำขั้นที่ 2-3 ก่อน
```

**รีวิว AC แล้วไปต่อ**
```
AC ผ่าน ไปขั้นที่ 2
```
Claude จะทำ migration กับ `openapi.yaml` แล้วแสดงตาราง `AC | API ตอบ | DB ช่วยกันไว้` ให้ดูว่าทุก AC ตกลงที่ใดที่หนึ่ง

**ขั้นที่ 4: เลือกวิธีทำตามแผน**
หลังเขียนแผน Claude ต้องจบด้วยคำถามว่าทำแบบไหน (ถ้าไม่ถาม ให้ทักว่า "ยังไม่ได้ถามว่าจะทำ Subagent-driven หรือ Inline"):
- **Subagent-driven (แนะนำสำหรับ Story ที่มีหลาย AC):** subagent ตัวใหม่ทำทีละ task แล้วมี reviewer ตรวจทุก task ได้คุณภาพดีสุด แต่เปลือง token กว่า
- **Inline / executing-plans (เหมาะกับ Story เล็ก 1-3 AC):** ทำใน session เดียว ประหยัดกว่า

ทั้งสองแบบจะทำต่อเนื่องโดยไม่หยุดถามระหว่าง task หนึ่ง AC ได้หนึ่ง commit และรายงาน red/green ต่อ AC ต้องมีข้อความ fail เต็มตามกติกาใน `AGENTS.md` ให้อ่านตรวจย้อนหลังว่า fail ด้วยเหตุผลที่ถูก (เช่น `LOAN_LIMIT_REACHED` ไม่ใช่ `Cannot find module`)

**จบงาน**
Claude จะรันเช็กลิสต์ Definition of Done ให้ reviewer ตรวจ แล้วถามว่าจะทำยังไงกับ branch ให้ตอบ:
```
push และเปิด PR
```
ถ้าเห็นตัวเลือก "merge เข้า main บนเครื่อง" ห้ามเลือก ตัวเลือกนี้ผิดกติกาทีม

## สถานการณ์ที่ 2: แก้บั๊ก

```
แก้ LIB-40: ยืมเล่มที่ 4 ได้ทั้งที่ควรติดลิมิต
```
สิ่งที่ควรเกิด: `systematic-debugging` ตั้งสมมติฐาน → เขียนเทสต์ที่ fail ซ้ำบั๊ก (ชื่อผูกกับ AC เดิม เช่น `AC3: ...`) → `test-driven-development` แก้ให้ผ่าน → branch `fix/LIB-40-...`

ไม่ต้องผ่าน brainstorming ถ้า AC เดิมครอบคลุมอยู่แล้ว ถ้าบั๊กเกิดจากกฎที่ไม่มีใน AC Claude ต้องหยุดและเสนอ AC ใหม่ให้รีวิวก่อน

## สถานการณ์ที่ 3: ทำ backlog อย่างเดียว (ยังไม่เขียนโค้ด)

```
แตก Epic "การยืมคืนหนังสือ" เป็น Story ทำเป็น CSV สำหรับ Jira project LIB
```
ใช้ `jira-backlog` เป็นหลัก `brainstorming` อาจถามเรื่องกฎที่ไม่ชัด ซึ่งเป็นเรื่องดี แต่ไม่ควรมีการเขียนแผนหรือโค้ด ผลลัพธ์อยู่ที่ `docs/backlog/<ชื่อ>.csv`

## สถานการณ์ที่ 4: Spike

```
spike LIB-50: ลองว่า Testcontainers รันใน CI ของเราได้ไหม (ไม่เกิน 1 วัน)
```
branch `spike/LIB-50-...` ผลลัพธ์คือคำตอบหรือ Story ใหม่ ไม่ใช่โค้ด production ตอนจบ Superpowers จะถามเรื่อง branch ให้ตอบว่า "เก็บไว้ก่อน" ห้ามเปิด PR เพื่อ merge

## สถานการณ์ที่ 5: งานเล็กที่ไม่ต้องผ่าน workflow

Superpowers มีกฎว่าถ้ามีโอกาสแค่ 1% ที่ skill จะเกี่ยว ก็ต้องเรียกใช้ งานเล็กๆ จึงอาจถูกพาเข้า brainstorming ให้บอกตรงๆ:
```
แก้ typo ใน README ข้าม workflow ได้
```
Superpowers ยอมข้ามขั้นตอนเมื่อผู้ใช้สั่งชัดเจน แต่ถ้างานแตะ behavior ของระบบ ห้ามข้าม TDD

## สถานการณ์ที่ 6: ทำต่อวันพรุ่งนี้ / context ใกล้เต็ม

ก่อนปิด:
```
/handoff ทำ AC4-AC6 ของ UC-12 ต่อ
```
handoff ของทีม (`.claude/skills/handoff`) เก็บไฟล์ไว้ที่ `~/.local/state/claude-handoff/<ชื่อ repo>/` ซึ่ง**ไม่หายเมื่อรีบูต** อยู่นอก repo จึงไม่ถูก commit โดยไม่ตั้งใจ และใช้โฟลเดอร์เดียวกันไม่ว่าจะสั่งจาก repo หลักหรือจาก worktree ในไฟล์จะอ้าง path ของ use case, แผน, branch และ worktree แทนการคัดลอกเนื้อหา

วันถัดไป เปิด Claude Code ใน repo (หรือใน worktree ของ Story นั้น) แล้วพิมพ์:
```
อ่าน handoff ล่าสุด แล้วทำต่อ
```
แผนของ Superpowers มี checkbox (`- [ ]`) อยู่แล้ว จึงทำต่อจาก task ที่ยังไม่ติ๊กได้เลย

ไฟล์ handoff ไม่ถูกลบอัตโนมัติ ถ้าอยากล้าง ให้สั่ง "ล้าง handoff ที่เก่ากว่า 30 วัน" Claude จะแสดงรายการให้ยืนยันก่อนลบ

## เครื่องมือเสริมระหว่างทำงาน

| อยากทำ | ทำแบบนี้ |
|---|---|
| ปิด/เปิดโหมดตอบสั้น | พิมพ์ "normal mode" / `/caveman` |
| ดูผลเทสต์เต็ม (RTK ย่อเหลือแค่ตัวที่ fail) | บอก Claude ว่า "รัน `rtk bypass npm test`" ถ้าถูกปฏิเสธสิทธิ์: "เขียนผลเทสต์ลงไฟล์แล้วอ่านด้วย Read" |
| ดู diff เต็มตอนรีวิว | `rtk bypass git diff origin/main...HEAD` หรือ `git diff origin/main...HEAD > /tmp/review.diff` แล้วอ่านไฟล์ |
| ดูว่าแก้ไฟล์นี้แล้วกระทบอะไร | "ใช้ code-review-graph ดู impact radius ของการเปลี่ยนแปลงนี้" |
| ดูว่า RTK ประหยัดไปเท่าไหร่ | `rtk gain` ใน terminal |
| สร้าง AGENTS.md ย่อยให้ context ที่ใหญ่ขึ้น | "ใช้ intent-layer สร้าง node ให้ src/modules/circulation โดย root คือ AGENTS.md" |

## สัญญาณว่ามีอะไรผิด

| เห็นแบบนี้ | แปลว่า | แก้ |
|---|---|---|
| ไม่เห็นข้อความ `Using <skill>` หรือเริ่มเขียนไฟล์ก่อนสร้าง worktree | Claude ไม่ได้ทำตาม `feature-workflow` | บอกว่า "ทำตาม feature-workflow ตั้งแต่ขั้นที่ 1" |
| ไฟล์ใหม่ใน `docs/superpowers/specs/` หรือ `docs/superpowers/plans/` | Superpowers ไม่ได้อ่าน AGENTS.md | ย้ายไฟล์ไป `docs/usecases/` หรือ `docs/plans/` แล้วเตือน Claude |
| commit แบบ `feat: ...` หรือ `fix(loan): ...` | `writing-plans` หรือ `caveman-commit` ใช้รูปแบบของตัวเอง | `git commit --amend` เป็น `<KEY> AC<n>: ...` |
| Claude พูดว่า "Using caveman:lean-build" หรือ "investigate-first" | Caveman skill แย่งงาน Superpowers | บอกให้ใช้ skill ตามตาราง "ลำดับความสำคัญ" ใน AGENTS.md |
| มีหัวข้อ `## Intent Layer` ใน `CLAUDE.md` | intent-layer เลือกไฟล์ root ผิด | ย้ายเนื้อหาไป AGENTS.md แล้วคืน CLAUDE.md เป็นบรรทัด import |
| คำถามของ Claude สั้นจนอ่านไม่รู้เรื่อง | Caveman ย่อเกิน | พิมพ์ "normal mode" แล้วถามซ้ำ |

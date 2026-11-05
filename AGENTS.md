# AGENTS.md

> ไฟล์นี้เป็นกติกาหลักไฟล์เดียวของทุก AI coding tool (Claude Code, Codex, Cursor ฯลฯ) CLAUDE.md แค่ import ไฟล์นี้ แก้กติกาที่ไฟล์นี้ที่เดียว
> ก่อนเริ่มฟีเจอร์ใหม่ อ่าน .claude/skills/feature-workflow/SKILL.md
> ก่อนสร้างหรือย้ายไฟล์ใน src/modules/ อ่าน .claude/skills/ddd-architecture/SKILL.md และ docs/architecture/context-map.md
> ก่อนร่าง Epic/Story/Sub-task อ่าน .claude/skills/jira-backlog/SKILL.md
> คู่มือติดตั้งและใช้งานเครื่องมือ AI ของทีมอยู่ที่ docs/ai-setup/


## Workflow (Spec-First)
ทุกฟีเจอร์ใหม่ทำตามลำดับนี้ อ่าน `.claude/skills/feature-workflow/SKILL.md` เมื่อเริ่มฟีเจอร์ใหม่
1. Use case + acceptance criteria (AC) ใน `docs/usecases/`
2. Database (migration) คู่กับ API spec (`openapi.yaml`)
3. Mock server + seed data
4. แบ่งงานตาม use case
5. Dev แบบ TDD
6. Integration test + CI

## ลำดับความสำคัญเมื่อ skill ซ้อนกัน
ไฟล์นี้ > skill ของทีม (`feature-workflow`, `ddd-architecture`, `jira-backlog`) > Superpowers > skill อื่น (Caveman, code-review-graph) ถ้าขัดกันให้ทำตามตัวที่อยู่ซ้ายกว่า

ทุกครั้งที่เริ่มใช้ skill ให้ประกาศเป็นข้อความว่า `Using <ชื่อ skill>` งานแต่ละแบบให้ใช้ skill ตามตารางนี้เท่านั้น ห้ามใช้ skill ในคอลัมน์ "ห้ามใช้" แม้ description จะดูตรง เพราะจะได้สองกระบวนการซ้อนกัน

| งาน | ใช้ | ห้ามใช้ |
|---|---|---|
| ฟีเจอร์ / use case ใหม่ | `feature-workflow` (คุมลำดับ) + Superpowers ตามตารางข้างล่าง | `caveman:lean-build` |
| แก้บั๊ก | `superpowers:systematic-debugging` → เทสต์ที่ fail ซ้ำบั๊ก → `superpowers:test-driven-development` | `caveman:investigate-first`, `caveman:surgical-patch`, `debug-issue` |
| refactor | `superpowers:test-driven-development` (เทสต์ต้องผ่านก่อนและหลัง) + `ddd-architecture` | `caveman:safe-refactor`, `refactor-safely` |
| migration / เปลี่ยน schema | `feature-workflow` ขั้นที่ 2 + กติกา migration ในไฟล์นี้ | `caveman:migration` |
| ตรวจก่อนบอกว่าเสร็จ | `superpowers:verification-before-completion` + Definition of Done | `caveman:verify-and-stop` |
| code review | `superpowers:requesting-code-review` (reviewer ใช้ MCP tool ของ code-review-graph ได้) | `caveman:caveman-review`, `review-changes` |
| สำรวจโค้ด | MCP tool ของ code-review-graph หรือค้นตรงๆ | `caveman:cavecrew`, `caveman:caveman-explore` |
| commit message | รูปแบบทีม `<KEY> AC<n>: ...` | `caveman:caveman-commit` (`/commit`) ใช้ Conventional Commits ผิดรูปแบบทีม |
| ไฟล์กติกา AI (`AGENTS.md`, `CLAUDE.md`, `SKILL.md`) | แก้ด้วยมือหรือให้ AI แก้แบบอ่านออกได้ | `caveman:caveman-compress`, `caveman:caveman-learn`, `/caveman-init` |

## ใช้ร่วมกับ Superpowers (obra/superpowers)
Superpowers ทำหน้าที่ "วินัย" ส่วน skill ของทีมเป็นตัวกำหนด "รูปแบบงาน" วิธีใช้แบบละเอียดดู `docs/ai-setup/USAGE.md`

| Superpowers skill | ใช้ในทีมแบบนี้ |
|---|---|
| `brainstorming` | ใช้ถามคำถามและหาเคสในขั้นที่ 1 ของ `feature-workflow` แต่**ผลลัพธ์เขียนลง `docs/usecases/UC-xx-<name>.md`** (ตาราง AC แบบ Given/When/Then) ไม่ใช่ `docs/superpowers/specs/` ห้ามข้ามไปขั้นที่ 2 ก่อนผู้ใช้รีวิว AC **เมื่อ brainstorming จบ ให้กลับไปทำ `feature-workflow` ขั้นที่ 2 (DB + API spec) และ 3 (mock + seed) ก่อน ห้ามกระโดดไป `writing-plans` ทันทีตามที่ brainstorming บอก** |
| `writing-plans` | ใช้ในขั้นที่ 4 แผนบันทึกที่ `docs/plans/<KEY>-<ชื่อสั้น>.md` แบ่ง task **ต่อ AC** เรียงตามชั้น DDD (domain → application → infrastructure → interface/http) ทุก task ระบุรหัส AC และ commit message เป็น `<KEY> AC<n>: ...` ไม่ใช้ `feat: ...` |
| `test-driven-development` | ใช้ในขั้นที่ 5 ตามปกติ เพิ่มกติกาทีม: ชื่อเทสต์ `AC<n>: ...`, repository เทสต์กับ DB จริง, service ใช้ fake repository + `fixedClock` |
| `using-git-worktrees` | **บังคับ** สร้างครั้งเดียวที่ต้นขั้นที่ 1 (worktree พร้อม branch) ขั้นที่ 5 แค่ตรวจว่ายังอยู่ใน worktree นั้น ห้ามสร้างซ้ำ ใช้ native worktree ของ Claude Code เมื่อมีให้ใช้ มิฉะนั้นใช้ `git worktree add` จาก `origin/main` ล่าสุด (ตัวอย่าง PowerShell อยู่ใน `docs/ai-setup/INSTALL-WINDOWS.md`) ชื่อ branch ต้องเป็น `feature/<KEY>-<ชื่อสั้น>` (หรือ `fix/` `chore/` `spike/` `hotfix/`) ถ้าเครื่องมือตั้งชื่อให้ไม่ตรง ให้ `git branch -m` ก่อน commit แรก |
| `subagent-driven-development` / `executing-plans` | ใช้ได้ subagent ทุกตัวต้องได้รับกติกาจากไฟล์นี้และ skill `ddd-architecture` ไปด้วย รายงานของแต่ละ task ต้องมีผลรันเทสต์ตอน red (ข้อความ fail) เพื่อให้ผู้ใช้ตรวจย้อนหลังได้ว่า fail ด้วยเหตุผลที่ถูก |
| `requesting-code-review` | reviewer ดู diff เต็มด้วย `rtk bypass git diff origin/main...HEAD` หรือเขียน diff ลงไฟล์แล้วอ่านด้วย Read (diff ที่ RTK ย่อตัดบริบทออก) และตรวจ Definition of Done ของ `feature-workflow` กับเช็กลิสต์ของ `ddd-architecture` |
| `verification-before-completion` | ใช้คู่กับ Definition of Done รายงานเป็นตาราง AC → ไฟล์เทสต์ → สถานะ |
| `systematic-debugging` | ใช้กับ Bug ได้เลย ขั้นแรกต้องเป็นเทสต์ที่ fail ซ้ำบั๊ก (ตาม `jira-backlog`) |
| `finishing-a-development-branch` | **เลือกได้แค่ "Push และเปิด PR" หรือ "เก็บไว้ก่อน"** ห้าม merge เข้า `main` บนเครื่อง ก่อน push ให้ rebase บน `origin/main` และเทสต์ผ่านทั้งหมด branch `spike/` ห้ามเปิด PR เพื่อ merge |

## กติกาที่ต้องทำเสมอ
- ห้ามเขียนโค้ด production ก่อนมีเทสต์ที่ fail ด้วยเหตุผลที่ถูกต้อง (Red → Green → Refactor)
- ชื่อเทสต์ขึ้นต้นด้วยรหัส AC เช่น `it('AC3: ...')`
- ถ้างานไม่มี AC รองรับ ให้หยุดและเสนอ AC ให้ผู้ใช้รีวิวก่อน อย่าเดาเอง
- ห้ามแก้ไฟล์ migration ที่ merge แล้ว ให้สร้าง migration ใหม่
- ห้ามแก้ API ให้หลุดจาก `openapi.yaml` ถ้าต้องเปลี่ยน ให้แก้ spec ก่อนและแจ้งผู้ใช้
- API ไม่ต้องหน้าตาเหมือนตาราง: รับ/ตอบตามสิ่งที่ผู้ใช้เห็น แล้วแปลงในโค้ด
- เทสต์ repository รันกับ database จริง (Docker/Testcontainers) ไม่ mock
- ใช้ clock ที่ inject ได้ ห้ามเรียก `new Date()` ตรงๆ ใน business logic
- กฎทางธุรกิจที่บังคับได้ที่ DB (NOT NULL, UNIQUE, CHECK, FK) ให้ใส่ใน schema ด้วย

## สถาปัตยกรรม (DDD)
อ่าน `.claude/skills/ddd-architecture/SKILL.md` ทุกครั้งที่สร้างหรือย้ายไฟล์ใน `src/modules/` และอ่าน `docs/architecture/context-map.md` ก่อน
- โค้ดแบ่งเป็น `src/modules/<context>/{domain,application,infrastructure,interface/http}`
- domain ไม่ import อะไรจากชั้นอื่น (ห้าม `pg`, `express`, ORM)
- กฎธุรกิจอยู่ใน domain เท่านั้น use case แค่โหลด → เรียก domain → บันทึก
- context อื่นใช้ได้เฉพาะสิ่งที่ `index.ts` export หรือผ่าน `ports.ts`
- เปลี่ยนข้อมูลผ่าน aggregate root เสมอ (`borrower.borrow()` ไม่ใช่ `Loan.start()` จาก use case)
- ชื่อในโค้ดตรงกับคำศัพท์ใน `context-map.md`
- ห้ามสร้าง context ใหม่หรือเปลี่ยนระดับ DDD ของ context โดยไม่ถามผู้ใช้

## Intent Layer
**ก่อนแก้โค้ดใน `src/modules/<context>/` ให้อ่าน `src/modules/<context>/AGENTS.md` ของ context นั้นก่อน ถ้ามี** ไฟล์ย่อยเขียนเฉพาะสิ่งที่เป็นของ context นั้น (entry point, invariant, ข้อห้าม) ห้ามคัดลอกกติกาจากไฟล์นี้ไปซ้ำ

- ไฟล์ root มีไฟล์เดียวคือไฟล์นี้ (`AGENTS.md`) เมื่อใช้ skill `intent-layer` ให้ถือว่า root คือ `AGENTS.md` ห้ามเพิ่มหัวข้อหรือเนื้อหาลง `CLAUDE.md`
- สร้างไฟล์ย่อยเฉพาะ context ที่ใหญ่เกินราว 20k tokens หรือมี invariant ที่คนใหม่พลาดบ่อย ไม่ต้องสร้างให้ทุก context
- เมื่อสร้างไฟล์ย่อยแล้ว ให้เพิ่มรายการไว้ใต้บรรทัดนี้ในรูปแบบ `- **<context>**: src/modules/<context>/AGENTS.md - <หน้าที่>`

## Git และ Jira
อ่าน `.claude/skills/jira-backlog/SKILL.md` เมื่อร่างหรือแก้ Epic, Story, Sub-task หรือทำ CSV สำหรับ Jira
- `main` พร้อม deploy เสมอ ห้าม commit หรือ push ตรงเข้า main
- branch: `feature/` `fix/` `chore/` `spike/` `hotfix/` + `<KEY>-<ชื่อสั้น>` เช่น `feature/LIB-12-borrow-book`
- ใช้ key ของ Story ไม่ใช่ Sub-task; commit: `LIB-12 AC3: ...`
- **ทีมที่ไม่ใช้ Jira:** key คือรหัส use case เช่น branch `feature/UC-12-borrow-book`, commit `UC-12 AC3: ...`, แผน `docs/plans/UC-12-borrow-book.md` ส่วน backlog เป็นข้อความหรือ CSV ใน `docs/backlog/`
- หนึ่ง Story ใช้ worktree และ branch เดียวตั้งแต่ขั้นที่ 1 ถึง PR (use case, spec และโค้ดอยู่ใน PR เดียวกัน)
- ก่อนเปิด PR ให้ rebase บน `origin/main` และเทสต์ผ่านทั้งหมด
- ชื่อไฟล์ migration ใช้ timestamp (`YYYYMMDD_HHMM_<name>.sql`) กันชนกับ branch อื่น
- branch `spike/` ห้าม merge

## ประหยัด token
- โหมดตอบสั้น (Caveman) ใช้ได้กับข้อความในแชตเท่านั้น ไฟล์ที่คนในทีมต้องอ่าน (`docs/usecases/`, แผนใน `docs/plans/`, Story/Sub-task ใน Jira, คำอธิบาย PR, commit message) ต้องเขียนเต็มประโยคตามรูปแบบเดิม
- ตอนถามคำถามหรือให้ผู้ใช้รีวิว AC ใน `brainstorming` และ `feature-workflow` ให้อธิบายเต็ม ไม่ต้องย่อ
- ก่อนปิด session ที่งานยังไม่จบ ให้ใช้ `/handoff` สรุปส่งต่อ โดยอ้างถึงไฟล์ use case, แผน, branch และ worktree ด้วย path แทนการคัดลอกเนื้อหา ไฟล์ handoff อยู่นอก repo: Windows ใช้ `%LOCALAPPDATA%\claude-handoff\<repo>\`; Linux/macOS ใช้ `~/.local/state/claude-handoff/<repo>/` เมื่อผู้ใช้บอกว่า "อ่าน handoff ล่าสุด" ให้อ่านไฟล์ใหม่สุดในโฟลเดอร์นั้น
- RTK ย่อ output ของคำสั่ง ถ้าต้องดูผลเต็ม (เช่นเทสต์ red ที่ต้องยืนยันว่า fail ด้วยเหตุผลที่ถูก หรือ diff สำหรับรีวิว) ให้ใช้ `rtk bypass <คำสั่ง>` เช่น `rtk bypass npm test` ถ้าไม่มี RTK หรือ `rtk bypass` ถูกปฏิเสธสิทธิ์ ให้เขียน output ลงไฟล์ชั่วคราวที่เหมาะกับ shell/OS แล้วอ่านด้วย Read tool แทน ห้ามสรุปผล red จาก output ที่ถูกย่อ

## ความปลอดภัยของ environment
- ห้ามรันเทสต์ migration หรือ seed กับ production
- ใช้ `docker compose up` สำหรับ DB และ mock บนเครื่อง

## คำสั่ง (แก้ให้ตรงกับโปรเจกต์)
- `npm test` รันเทสต์ทั้งหมด
- `npm run migrate` / `npm run seed`
- `npx @stoplight/prism-cli mock openapi.yaml` เปิด mock server

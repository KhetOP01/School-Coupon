# รายงานความขัดแย้งของเครื่องมือ AI

ตรวจวันที่ 19 ต.ค. 2026 โดยอ่านซอร์สโค้ดจริงของแต่ละ repo (ไม่ได้อ่านแค่ README)

| เครื่องมือ | เวอร์ชัน / commit ที่ตรวจ | License |
|---|---|---|
| obra/superpowers | 7.0.0 | MIT |
| JuliusBrussee/caveman | 4.0.1 | MIT |
| rtk-ai/rtk | main ล่าสุด | Apache-2.0 (+ BUSL-1.1 เฉพาะ engine/proxy ใช้ใน production ได้ฟรี) |
| tirth8205/code-review-graph | main ล่าสุด | MIT |
| mattpocock/skills (`handoff`) | main ล่าสุด | MIT |
| crafter-station/skills (`intent-layer`) | 1.0.0 | MIT |

ตัดออก: **Token Optimizer** (alexgreensh) ใช้ license PolyForm Noncommercial ใช้ในเชิงพาณิชย์ฟรีได้เฉพาะองค์กรที่มีคนน้อยกว่า 5 คนและรายได้ต่ำกว่า US$20,000 ต่อเดือน

ระดับ: 🔴 ทำให้ผิดกติกาทีมถ้าไม่แก้ · 🟡 ได้ผลซ้ำซ้อนหรือสับสน · 🟢 ไม่ขัดกัน แค่ต้องรู้ไว้

## 🔴 ความขัดแย้งที่ต้องแก้ (แก้แล้วทั้งหมด)

| # | ความขัดแย้ง | หลักฐานในซอร์ส | แก้ไว้ที่ |
|---|---|---|---|
| C1 | `brainstorming` เขียน spec ไปที่ `docs/superpowers/specs/` แต่ทีมใช้ `docs/usecases/UC-xx.md` | `skills/brainstorming/SKILL.md`: "docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md" | `AGENTS.md` ตาราง Superpowers, `feature-workflow` ขั้นที่ 1 |
| C2 | หลัง brainstorming สั่งให้ "invoke superpowers:writing-plans and no other skill" ซึ่งข้าม DB + API spec และ mock/seed ของทีม | `skills/brainstorming/SKILL.md` บรรทัด "For software, invoke superpowers:writing-plans and no other skill" | `AGENTS.md`, `feature-workflow` ขั้นที่ 1 |
| C3 | `writing-plans` เก็บแผนที่ `docs/superpowers/plans/` และใช้ commit `feat: ...` | `skills/writing-plans/SKILL.md`: "Save plans to", `git commit -m "feat: ..."` | `AGENTS.md`, `feature-workflow` ขั้นที่ 4 |
| C4 | `finishing-a-development-branch` มีตัวเลือก "Merge back to main locally" ผิดกติกาห้าม commit ตรงเข้า main | `skills/finishing-a-development-branch/SKILL.md` Step 4 Option 1 | `AGENTS.md` ตาราง Superpowers, `feature-workflow` Definition of Done |
| C5 | `caveman-commit` (และ `/commit`) บังคับรูปแบบ Conventional Commits แต่ทีมใช้ `<KEY> AC<n>: ...` | `skills/caveman-commit/SKILL.md`: "Conventional Commits format" | `AGENTS.md` ตารางลำดับความสำคัญ |
| C6 | `caveman-compress`, `caveman-learn` และ `/caveman-init` เขียนทับหรือบีบไฟล์กติกา (`CLAUDE.md`, `AGENTS.md`) ให้คนอ่านยาก | `skills/caveman-compress/SKILL.md`, `skills/caveman-learn/SKILL.md`, `commands/caveman-init.md` ("Write the per-repo caveman rule files ... AGENTS.md") | `AGENTS.md` ตารางลำดับความสำคัญ, `INSTALL.md` ขั้นที่ 2 |
| C7 | `code-review-graph install` เพิ่มข้อความลง `CLAUDE.md` และ `AGENTS.md` | `docs/USAGE.md`: "adds graph instructions to the platform's rules file (CLAUDE.md, AGENTS.md...)" | `INSTALL.md` ใช้ `--no-instructions` |
| C8 | `intent-layer` ตรวจ `CLAUDE.md` ก่อน `AGENTS.md` จึงจะเพิ่มหัวข้อ Intent Layer ลง `CLAUDE.md` (ซึ่งตอนนี้เป็นแค่บรรทัด import) | `scripts/detect_state.sh`: `if [ -f CLAUDE.md ] ... elif AGENTS.md` | `AGENTS.md` มีหัวข้อ `## Intent Layer` อยู่แล้ว และระบุว่า root คือ `AGENTS.md` |
| C9 | ติดตั้ง `mattpocock/skills` ทั้งชุดจะได้ `tdd` และ skill แนวสัมภาษณ์ซ้ำกับ Superpowers | โฟลเดอร์ `skills/engineering/tdd`, `skills/productivity/grill-me` | `INSTALL.md` ขั้นที่ 5 ติดตั้งเฉพาะ `handoff` |

## 🟡 skill ซ้ำซ้อน (กำหนดตัวที่ใช้แล้ว)

Caveman 4.x ไม่ได้มีแค่โหมดพูดสั้น แต่มี workflow skill ของตัวเองที่ทำงานเดียวกับ Superpowers ถ้าไม่กำหนด Claude อาจเลือกตัวไหนก็ได้ตาม description

| งาน | ใช้ | ตัวที่ซ้ำ (ห้ามใช้) |
|---|---|---|
| ฟีเจอร์ใหม่ | `feature-workflow` + `superpowers:brainstorming` | `caveman:lean-build` |
| debug | `superpowers:systematic-debugging` | `caveman:investigate-first`, `caveman:surgical-patch`, `debug-issue` (CRG) |
| refactor | `superpowers:test-driven-development` + `ddd-architecture` | `caveman:safe-refactor`, `refactor-safely` (CRG) |
| migration | `feature-workflow` ขั้นที่ 2 | `caveman:migration` |
| ตรวจก่อนเสร็จ | `superpowers:verification-before-completion` | `caveman:verify-and-stop` |
| code review | `superpowers:requesting-code-review` | `caveman:caveman-review`, `review-changes` / `review-pr` / `review-delta` (CRG) |
| สำรวจโค้ด | MCP tool ของ code-review-graph | `caveman:cavecrew`, `caveman:caveman-explore`, `explore-codebase` (CRG) |

แก้ไว้ที่: `AGENTS.md` หัวข้อ "ลำดับความสำคัญเมื่อ skill ซ้อนกัน" ส่วน skill ของ CRG ไม่ได้ติดตั้งเพราะใช้ `--no-skills` (`INSTALL.md` ขั้นที่ 4)

Caveman ยังมี skill ที่เกี่ยวกับ Caveman Cloud (`caveman-setup`, `caveman-discover`, `caveman-manage`, `caveman-optimize`, `caveman-evidence-review`) **ห้ามใช้** โดยเฉพาะ `caveman-setup` ที่ส่ง request ของ LLM ผ่าน gateway ภายนอก

## 🟡 ผลข้างเคียงที่ต้องรู้ (มีวิธีรับมือแล้ว)

| # | เรื่อง | รับมือ |
|---|---|---|
| S1 | RTK ย่อ `npm test` ให้เหลือแค่เทสต์ที่ fail และย่อ `git diff` (ตัดบริบท) ตอนรีวิวอาจขาดข้อมูล | `rtk bypass <คำสั่ง>` ตอนต้องดูผลเต็ม (`AGENTS.md` หัวข้อ "ประหยัด token" และแถว `requesting-code-review`) |
| S2 | `subagent-driven-development` ทำทุก task ต่อเนื่องโดยไม่หยุด แต่ `feature-workflow` อยากให้ผู้ใช้เห็นผล red | ให้รายงานของแต่ละ task มีข้อความ fail ตอน red (`AGENTS.md`) |
| S3 | Caveman เปิดอัตโนมัติทุก session และทุก subagent (hook `SessionStart` + `SubagentStart`) | กฎของ Caveman เองยกเว้นไฟล์ที่บันทึก (code, commit, docs, PR, ticket) และคำถามถึงผู้ใช้ไว้แล้ว ถ้ายังสั้นเกินใช้ `"defaultMode": "manual"` (`INSTALL.md` ขั้นที่ 2) |
| S4 | ถ้าเครื่องไม่มี `node` hook ของ Caveman จะปิดตัวเองเงียบๆ (`command -v node \|\| exit 0`) | `INSTALL.md` ขั้นที่ 0 ติดตั้ง `nodejs` และตรวจ |
| S5 | hook `PostToolUse` ของ CRG รัน `code-review-graph update` ทุกครั้งที่ Write / Edit / Bash (timeout 30 วินาที) ถ้าบางคนในทีมไม่ได้ติดตั้ง hook จะ error | ทั้งทีมติดตั้ง CRG หรือย้าย hook ไป `.claude/settings.local.json` (`INSTALL.md` ขั้นที่ 6) |
| S6 | `.mcp.json` ที่ CRG สร้างมี path ของเครื่องแต่ละคน | ใส่ใน `.gitignore` แต่ละคนรัน `install` เอง (`INSTALL.md` ขั้นที่ 6) |
| S7 | `/handoff` ฉบับเดิมเขียนไฟล์ไว้ใน `$TMPDIR` หรือ `/tmp` ซึ่งบน Arch เป็น tmpfs หายเมื่อรีบูต | **แก้แล้ว:** ทีมใช้ฉบับที่แก้ใน `.claude/skills/handoff/` เก็บไว้ที่ `~/.local/state/claude-handoff/<repo>/` ห้ามติดตั้งฉบับเดิมทับ (`INSTALL.md` ขั้นที่ 5) |
| S9 | `rtk init` ที่ไม่ได้รันใน terminal จริง (เช่นให้ Claude Code รัน) จะตอบ No เองและไม่แก้ `settings.json` (`src/hooks/README.md`: "defaults to No if stdin not terminal") | ใช้ `--auto-patch` (`INSTALL.md` ขั้นที่ 3) |
| S10 | hook ของ RTK เรียก `rtk` จาก PATH ถ้า Claude Code หาไม่เจอ คำสั่ง shell ทุกคำสั่งพัง Claude Code ที่เปิดจาก launcher ไม่ได้อ่าน `~/.bashrc` | ลิงก์ `rtk` ไว้ใน `~/.local/bin` แล้วตรวจด้วย `bash -c 'command -v rtk'` (`INSTALL.md` ขั้นที่ 3) |
| S11 | ตัวกรองสิทธิ์ของ auto mode ปฏิเสธ `rtk bypass` เพราะมีคำว่า "bypass" | เพิ่ม allow rule `Bash(rtk bypass:*)` ถ้ายังถูกปฏิเสธ ให้เขียน output ลงไฟล์แล้วอ่านด้วย Read (`AGENTS.md`, `INSTALL.md` ขั้นที่ 3) |
| S12 | `code-review-graph install` เพิ่ม git hook `pre-commit` ด้วย (`docs/USAGE.md` "Git pre-commit hook") ไม่บล็อก commit แต่ทำให้ commit ช้าลงเล็กน้อย และอาจซ้อนกับ pre-commit ที่ repo มีอยู่แล้ว | บันทึกไว้ใน `INSTALL.md` ขั้นที่ 4 ถ้าไม่ต้องการใช้ `--no-hooks` |
| S13 | เดิม `feature-workflow` สร้าง branch ตอนขั้นที่ 1 แล้ว `using-git-worktrees` สร้าง worktree ตอนขั้นที่ 5 แต่ git checkout branch เดียวกันสองที่ไม่ได้ | **แก้แล้ว:** สร้าง worktree พร้อม branch ครั้งเดียวที่ต้นขั้นที่ 1 ขั้นที่ 5 แค่ตรวจว่ายังอยู่ในนั้น (`feature-workflow`, `AGENTS.md`) ไม่เลือกทางสร้าง worktree ที่ขั้นที่ 5 เพราะ use case กับ spec ต้อง commit ที่ไหนสักแห่งก่อน และที่เดียวที่เหลือคือ `main` ซึ่งห้าม commit |
| S14 | status line ของ Caveman ใช้ช่อง `statusLine` ซึ่ง Claude Code มีได้อันเดียว | ไม่บังคับ ถ้ามี status line อื่นอยู่แล้วให้เลือกอย่างใดอย่างหนึ่ง (`INSTALL.md` ขั้นที่ 2) |
| S8 | Superpowers 7.x ลบคำสั่ง `/brainstorm`, `/write-plan`, `/execute-plan` แล้ว บทความเก่าหลายที่ยังอ้างถึง | เรียกชื่อ skill แทน เช่น `/superpowers:brainstorming` (`USAGE.md`) |

## 🟢 ตรวจแล้วไม่ขัดกัน

| เรื่อง | เหตุผล |
|---|---|
| hook ของทุกตัวทำงานร่วมกันได้ | Superpowers: `SessionStart` · Caveman: `SessionStart`, `SubagentStart`, `UserPromptSubmit`, `SessionEnd` · RTK: `PreToolUse` (Bash) · CRG: `SessionStart`, `PostToolUse` ไม่มีตัวไหนบล็อกหรือแก้ผลของอีกตัว |
| ชื่อ skill ไม่ชนกัน | plugin มี namespace (`superpowers:`, `caveman:`) ส่วน skill ใน repo (`feature-workflow`, `ddd-architecture`, `jira-backlog`, `handoff`, `intent-layer`) ไม่มีชื่อซ้ำ |
| Superpowers ยอมให้ไฟล์กติกาของทีมชนะ | `skills/using-superpowers/SKILL.md`: "User instructions (CLAUDE.md, AGENTS.md, ...) take precedence over skills" |
| RTK กับ worktree ของ Superpowers | RTK ไม่แปลงคำสั่ง `git` ใน worktree ที่ Claude Code สร้าง (`.claude/worktrees/`) เพื่อไม่ให้ชนกับระบบป้องกันของ Claude Code (`src/hooks/decision.rs`) จึงกำหนดให้ใช้ worktree แบบ native |
| CRG กับ worktree | CRG มี hook `PostToolUse` ที่ `EnterWorktree` สั่ง build กราฟให้ worktree ใหม่อัตโนมัติ |
| Caveman กับเอกสารของทีม | `skills/caveman/SKILL.md` "When to break the rules" ข้อ 5: ไม่ย่อ code, comment, commit, docs, issue, PR, ticket |
| `handoff` กับแผนของ Superpowers | handoff สั่งให้อ้าง spec/plan ด้วย path ไม่คัดลอกเนื้อหา และถูกเรียกได้เฉพาะเมื่อผู้ใช้สั่ง (`disable-model-invocation: true`) |
| `test-driven-development` ของ Superpowers กับกติกาทีม | ทั้งสองฝั่งใช้กฎ "เขียนโค้ดก่อนเทสต์ ให้ลบแล้วเริ่มใหม่" และไม่ mock ถ้าไม่จำเป็น สอดคล้องกับการเทสต์ repository กับ DB จริง |

## เมื่อมีเวอร์ชันใหม่

ตรวจซ้ำเมื่อ Superpowers หรือ Caveman ขึ้นเวอร์ชันหลัก (major) ใหม่:
```bash
git clone --depth 1 https://github.com/obra/superpowers /tmp/sp
git clone --depth 1 https://github.com/JuliusBrussee/caveman /tmp/cm

# C1-C4: path และตัวเลือก merge ของ Superpowers
grep -rn "docs/superpowers\|and no other skill\|Merge back" /tmp/sp/skills
# skill ใหม่ที่อาจซ้ำกับ workflow ของทีม
ls /tmp/sp/skills /tmp/cm/skills
# hook ที่เพิ่มมาใหม่
cat /tmp/sp/hooks/hooks.json; grep -A2 '"hooks"' /tmp/cm/.claude-plugin/plugin.json
```
ถ้าเจอ skill ใหม่ที่ทำงานซ้ำกับตาราง "ลำดับความสำคัญ" ใน `AGENTS.md` ให้เพิ่มลงคอลัมน์ "ห้ามใช้"

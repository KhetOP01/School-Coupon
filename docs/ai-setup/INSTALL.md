# ติดตั้งเครื่องมือ AI ของทีม (Arch Linux)

ทำตามลำดับจากบนลงล่าง ทุกขั้นมีคำสั่งตรวจว่าติดตั้งสำเร็จ ถ้าขั้นไหนไม่ผ่าน ให้แก้ก่อนไปขั้นถัดไป

เวอร์ชันที่ทีมตรวจความเข้ากันได้แล้ว (ต.ค. 2026): Superpowers 7.0.0, Caveman 4.0.1 ถ้าเวอร์ชันใหม่กว่านี้ ให้เปิด `docs/ai-setup/CONFLICTS.md` แล้วตรวจซ้ำตามหัวข้อ "เมื่อมีเวอร์ชันใหม่"

## สิ่งที่จะได้

| ชิ้น | ชนิด | ติดตั้งที่ | ทำอะไร |
|---|---|---|---|
| skill ของทีม (`feature-workflow`, `ddd-architecture`, `jira-backlog`) | skill | ใน repo (`.claude/skills/`) | รูปแบบงานของทีม มากับ repo แล้ว ไม่ต้องติดตั้ง |
| Superpowers | plugin | Claude Code ของแต่ละคน | วินัย: brainstorm → plan → TDD → review → verify |
| Caveman | plugin | Claude Code ของแต่ละคน | ตอบสั้นในแชต |
| RTK | โปรแกรม + hook | เครื่องของแต่ละคน | ย่อ output ของคำสั่ง shell |
| code-review-graph | โปรแกรม + MCP + hook | เครื่อง + ต่อโปรเจกต์ | แผนผังโค้ดสำหรับรีวิวและสำรวจโค้ด |
| handoff | skill | ใน repo (`.claude/skills/`) | `/handoff` สรุปงานส่งต่อ session ใหม่ |
| intent-layer | skill | ใน repo (`.claude/skills/`) | สร้าง `AGENTS.md` ย่อยต่อ bounded context |

handoff กับ intent-layer ติดตั้งครั้งเดียวโดยคนหนึ่งคน แล้ว commit เข้า repo ให้ทั้งทีมใช้

## 0. เตรียมเครื่อง

ต้องมี Claude Code ติดตั้งอยู่แล้ว (ดูวิธีติดตั้งที่ https://docs.claude.com/en/docs/claude-code)

```bash
sudo pacman -S --needed git nodejs npm python python-pipx rustup docker docker-compose
rustup default stable
pipx ensurepath
```
ปิดแล้วเปิด terminal ใหม่ จากนั้นตรวจ:
```bash
node --version      # ต้องมี: hook ของ Caveman ใช้ node ถ้าไม่มี Caveman จะปิดตัวเองเงียบๆ โดยไม่แจ้ง
pipx --version
cargo --version
echo $PATH | tr ':' '\n' | grep -E '\.cargo/bin|\.local/bin'   # ต้องเห็นทั้งสองบรรทัด
```
ถ้าไม่เห็น `~/.cargo/bin` ให้เพิ่ม `export PATH="$HOME/.cargo/bin:$PATH"` ใน `~/.bashrc` หรือ `~/.zshrc`

## 1. Superpowers

ใน Claude Code:
```
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```
restart Claude Code แล้วตรวจ: พิมพ์ `/help` ต้องเห็นคำสั่ง `superpowers:...` เช่น brainstorm และ write-plan

## 2. Caveman

```bash
claude plugin marketplace add JuliusBrussee/caveman
claude plugin install caveman@caveman
```
restart Claude Code แล้วตรวจ: ตอนเปิด session ต้องเห็นข้อความ "Loading caveman mode..." และคำตอบสั้นลง

ค่าเริ่มต้นของ Caveman คือเปิดทุก session รวมถึง subagent ถ้าอยากเปิดเองเฉพาะตอนต้องการ ให้สร้าง `~/.config/caveman/config.json`:
```json
{ "defaultMode": "manual" }
```
แล้วพิมพ์ `/caveman` เมื่ออยากเปิด และพิมพ์ "normal mode" เมื่ออยากปิด

**status line (ไม่บังคับ)** แสดงโหมดที่เปิดอยู่ เช่น `[CAVEMAN]` ที่ล่างจอ ตอนเปิด session แรก Caveman จะเสนอให้ตั้งค่าครั้งเดียว ให้ตอบตกลง หรือเพิ่มเองใน `~/.claude/settings.json`:
```json
"statusLine": { "type": "command", "command": "bash \"$HOME/.claude/hooks/caveman-statusline.sh\"" }
```
ตรวจก่อนว่ามีไฟล์ `~/.claude/hooks/caveman-statusline.sh` ถ้าไม่มี ให้ใช้ path ที่ Caveman แนะนำตอนเปิด session Claude Code มี status line ได้อันเดียว ถ้าคุณมี status line อื่นอยู่แล้ว อันใหม่จะทับอันเดิม ให้สำรอง `settings.json` ก่อนแก้

**ห้ามรัน** `/caveman-init`, `/caveman-compress` และ `caveman-setup` ใน repo นี้ เพราะจะเขียนทับไฟล์กติกาของทีม หรือส่ง request ผ่าน Caveman Cloud (ดูเหตุผลใน `CONFLICTS.md`)

## 3. RTK

```bash
cargo install --git https://github.com/rtk-ai/rtk rtk
```
ห้ามใช้ `cargo install rtk` เฉยๆ เพราะบน crates.io มีแพ็กเกจชื่อ rtk อีกตัวที่ไม่เกี่ยวกัน (Rust Type Kit) ส่วนใน AUR ยังไม่มีแพ็กเกจที่ rtk-ai ยืนยันว่าเป็นของทางการ

ตรวจ:
```bash
rtk --version
rtk gain            # ต้องเห็นหน้าสรุปการประหยัด ถ้าขึ้น command not found แปลว่าได้ rtk ผิดตัว
```
**ให้ rtk อยู่ใน PATH ที่ Claude Code มองเห็น** hook ของ RTK จะเปลี่ยนคำสั่งเป็น `rtk ...` ถ้า Claude Code หา `rtk` ไม่เจอ คำสั่ง shell ทุกคำสั่งจะพัง Claude Code ที่เปิดจากเมนูหรือ launcher ไม่ได้อ่าน `~/.bashrc` จึงต้องลิงก์ไว้ใน `~/.local/bin` ด้วย:
```bash
mkdir -p ~/.local/bin && ln -sf ~/.cargo/bin/rtk ~/.local/bin/rtk
bash -c 'command -v rtk'      # shell แบบไม่ interactive ต้องหาเจอ ถ้าไม่เจอ ห้ามไปขั้นต่อไป
```

ต่อเข้ากับ Claude Code (รันใน terminal ของคุณเอง):
```bash
rtk init -g --hook-only
```
- `--hook-only` ติดตั้งแค่ hook โดยไม่เพิ่ม `@RTK.md` เข้า `~/.claude/CLAUDE.md` กฎ `rtk bypass` ที่ทีมต้องใช้มีอยู่ใน `AGENTS.md` แล้ว
- ระบบจะถามว่า "Patch settings.json?" ให้ตอบ `y` (RTK จะสำรองไฟล์เดิมไว้ที่ `~/.claude/settings.json.bak`)
- **ถ้าให้ Claude Code หรือสคริปต์รันคำสั่งนี้แทน** จะไม่มี terminal ให้ตอบ RTK จึงตอบ No เองและไม่แก้ settings.json ให้ใช้ `rtk init -g --hook-only --auto-patch` แทน

ตรวจว่า hook ลงแล้ว:
```bash
grep -n rtk ~/.claude/settings.json     # ต้องเห็น hook PreToolUse ที่เรียก rtk
```
restart Claude Code แล้วสั่ง Claude ให้รัน `git status` ต้องได้ output สั้นกว่าปกติ และคำสั่งต้องไม่ error ว่า `rtk: command not found`

**อนุญาต `rtk bypass`** ถ้าใช้ auto mode ตัวกรองสิทธิ์อาจปฏิเสธคำสั่งที่มีคำว่า "bypass" ให้เพิ่มใน `~/.claude/settings.json` (หรือ `.claude/settings.json` ของโปรเจกต์ถ้าทั้งทีมใช้ RTK):
```json
{ "permissions": { "allow": ["Bash(rtk bypass:*)"] } }
```
ถ้าเพิ่มแล้วยังถูกปฏิเสธ ไม่เป็นไร `AGENTS.md` มีวิธีสำรองอยู่แล้ว (เขียน output ลงไฟล์แล้วอ่านด้วย Read)

## 4. code-review-graph

```bash
pipx install code-review-graph
```
Arch ไม่ให้ใช้ `pip install` ลงระบบตรงๆ (externally-managed-environment) จึงต้องใช้ pipx

ในโฟลเดอร์โปรเจกต์ ให้ดูก่อนว่าจะเขียนไฟล์อะไรบ้าง:
```bash
code-review-graph install --platform claude-code --no-skills --no-instructions --dry-run
```
ถ้ารายการดูถูกต้อง ให้รันจริงแล้ว build กราฟ:
```bash
code-review-graph install --platform claude-code --no-skills --no-instructions
code-review-graph build
```
- `--no-instructions` กันไม่ให้เขียนเพิ่มลง `AGENTS.md` และ `CLAUDE.md`
- `--no-skills` กันไม่ให้วาง skill 4 ตัว (`explore-codebase`, `review-changes`, `debug-issue`, `refactor-safely`) ลงใน `.claude/skills/` ซึ่งจะชนกับ Superpowers (ดู `CONFLICTS.md`) MCP tool ยังใช้ได้ครบ
- คำสั่งนี้**เพิ่ม git hook `pre-commit`** ใน `.git/hooks/pre-commit` ด้วย hook จะอัปเดตกราฟและพิมพ์สรุปความเสี่ยงก่อน commit ทุกครั้ง ไม่บล็อก commit และข้าม worktree ที่ลิงก์ไว้ (worktree ของ Superpowers) ถ้าไม่อยากได้ให้เพิ่ม `--no-hooks` แต่จะไม่ได้ hook ของ Claude Code ไปด้วย ถ้า repo มี pre-commit ของตัวเองอยู่แล้ว (เช่น husky) ให้ตรวจว่ายังทำงานครบหลังติดตั้ง

restart Claude Code แล้วตรวจ:
```bash
ls .mcp.json                  # ต้องมีไฟล์นี้
code-review-graph status
```
ใน Claude Code พิมพ์ `/mcp` ต้องเห็น server ของ code-review-graph

## 5. handoff และ intent-layer (คนเดียวทำ แล้ว commit)

**handoff มากับ repo แล้ว** (`.claude/skills/handoff/`) เป็นฉบับที่ทีมแก้ให้เก็บไฟล์ไว้ที่ `~/.local/state/claude-handoff/<repo>/` แทน `/tmp` ซึ่งบน Arch หายเมื่อรีบูต **ห้ามรัน `npx skills add mattpocock/skills --skill handoff` ทับ** เพราะจะได้ฉบับเดิมที่เก็บไฟล์ใน `/tmp` กลับมา

ติดตั้งแค่ intent-layer:
```bash
npx -y skills add crafter-station/skills --skill intent-layer --agent claude-code
ls .claude/skills/            # ต้องเห็น handoff และ intent-layer อยู่คู่กับ skill ของทีม
grep -n "local/state" .claude/skills/handoff/SKILL.md   # ต้องเจอ ถ้าไม่เจอแปลว่าโดนฉบับเดิมทับ
```
**ห้ามติดตั้ง mattpocock/skills ทั้งชุด** (ห้ามใช้ `claude plugin install mattpocock-skills@...`) เพราะในชุดนั้นมี `tdd` และ skill แนวสัมภาษณ์ที่ซ้ำกับ Superpowers

commit:
```bash
git switch -c chore/<KEY>-ai-tooling origin/main
git add .claude/skills/handoff .claude/skills/intent-layer
git commit -m "<KEY> เพิ่ม skill handoff และ intent-layer"
```

## 6. .gitignore

เพิ่มบรรทัดเหล่านี้ใน `.gitignore` ของ repo:
```gitignore
# AI tooling (ของแต่ละเครื่อง)
.code-review-graph/
.claude/worktrees/
.worktrees/
.mcp.json
.claude/settings.local.json
```
- `.mcp.json` ที่ code-review-graph สร้างมี path ของเครื่องแต่ละคนอยู่ข้างใน แต่ละคนต้องรัน `install` เอง
- ไฟล์ `.claude/settings.json` ที่ code-review-graph เพิ่ม hook ลงไป **ให้ commit ได้ ถ้าทั้งทีมติดตั้ง code-review-graph** ถ้ามีบางคนไม่ได้ติดตั้ง hook จะ error ทุกครั้งที่แก้ไฟล์ ในกรณีนั้นให้ย้าย hook ไปไว้ใน `.claude/settings.local.json` แทน

## 7. ตรวจรวม

เปิด Claude Code ใหม่ใน repo แล้วสั่ง:
```
เริ่มฟีเจอร์ UC-99 ทดสอบ setup (ไม่ต้องเขียนไฟล์จริง แค่บอกว่าจะทำอะไรในแต่ละขั้น)
```
ถ้าตั้งค่าถูก ต้องเห็นทั้งหมดนี้:
- [ ] ขึ้นข้อความ `Using feature-workflow` ในคำตอบ (เป็นข้อความ ไม่ใช่แค่เรียก tool เงียบๆ) และประกาศ `Using <skill>` ทุกครั้งที่เริ่ม skill ใหม่
- [ ] ขั้นที่ 1 สร้าง worktree พร้อม branch `feature/UC-99-...` **ก่อน**เขียนไฟล์ใดๆ
- [ ] ขั้นที่ 1 เรียก `superpowers:brainstorming` และบอกว่าจะเขียนผลลง `docs/usecases/` (ไม่ใช่ `docs/superpowers/specs/`)
- [ ] ไม่เรียก `caveman:lean-build`
- [ ] คำถามที่ถามคุณเป็นประโยคเต็ม แม้ Caveman จะเปิดอยู่
- [ ] ขั้นที่ 4 บอกว่าแผนอยู่ที่ `docs/plans/UC-99-...md` และจบด้วยคำถาม Subagent-driven หรือ Inline
- [ ] ขั้นที่ 5 บอกว่าจะตรวจ worktree เดิม (ไม่สร้างใหม่) และทำหนึ่ง commit ต่อ AC พร้อมรายงาน red/green
- [ ] ไม่ถาม project key ของ Jira (ถ้าทีมไม่ใช้ Jira)
- [ ] ขั้นสุดท้ายเสนอแค่เปิด PR หรือเก็บไว้ ไม่เสนอ merge เข้า main

ถ้าข้อไหนไม่ผ่าน ดู `docs/ai-setup/CONFLICTS.md`

## ถอนการติดตั้ง

| ชิ้น | คำสั่ง |
|---|---|
| Superpowers | `/plugin uninstall superpowers@superpowers-marketplace` |
| Caveman | `/plugin uninstall caveman@caveman` |
| RTK | `rtk init -g --uninstall` แล้ว `cargo uninstall rtk` (ถ้า hook ยังค้าง: `cp ~/.claude/settings.json.bak ~/.claude/settings.json`) |
| code-review-graph | `code-review-graph uninstall --dry-run` ดูก่อน แล้ว `code-review-graph uninstall` และ `pipx uninstall code-review-graph` |
| handoff / intent-layer | ลบโฟลเดอร์ใน `.claude/skills/` แล้ว commit |

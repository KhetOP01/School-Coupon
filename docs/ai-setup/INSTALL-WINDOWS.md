# ตั้งค่า workflow AI บน Windows

คู่มือนี้ตั้งค่าส่วนที่แชร์กับทีมผ่าน repo และใช้ได้ใน Windows/VS Code โดยไม่ติดตั้งโปรแกรมหรือแก้การตั้งค่าระดับเครื่อง

## ไฟล์ที่ติดตั้งใน repo แล้ว

- `AGENTS.md` เป็นกติกาหลัก และ `CLAUDE.md` import กติกาเดียวกัน
- `.claude/skills/` มี skill `feature-workflow`, `ddd-architecture`, `jira-backlog` และ `handoff`
- `docs/ai-setup/` มีคู่มือ workflow และข้อขัดแย้งของเครื่องมือ

VS Code รองรับ project skills ใน `.claude/skills/` ด้วย เปิดหน้าต่างโปรเจกต์ใหม่หลังเพิ่มไฟล์ แล้วตรวจว่า agent เห็น skill ของทีมก่อนเริ่มงาน

## ตรวจเครื่องมือพื้นฐาน

เปิด PowerShell ที่ root ของ repo:

```powershell
git --version
Get-Command git -ErrorAction Stop
```

Node.js, npm และ Docker จำเป็นเฉพาะเมื่อโปรเจกต์เพิ่ม scripts หรือการทดสอบที่ใช้เครื่องมือเหล่านั้น:

```powershell
Get-Command node, npm, docker, claude -ErrorAction SilentlyContinue |
    Select-Object Name, Source
```

ไม่ต้องติดตั้ง runtime เหล่านี้เพียงเพื่อโหลด AGENTS.md หรือ skills

## ใช้ worktree บน Windows

ถ้า agent ที่ใช้ไม่มีการสร้าง worktree ในตัว ให้ใช้ Git จาก PowerShell แทน โดยรันก่อนแก้ไฟล์ฟีเจอร์:

```powershell
git fetch origin main
$branch = 'feature/UC-12-short-name'
$worktree = '..\School-Coupon-UC-12'
git worktree add -b $branch $worktree origin/main
Set-Location $worktree
```

เปลี่ยน KEY, ชื่อ branch และ path ให้ตรงกับงาน ห้ามสร้าง branch ซ้ำใน checkout หลักก่อนสร้าง worktree ขั้น implementation ต้องทำต่อใน worktree เดิม หากไม่มี `origin/main` ให้หยุดและยืนยัน branch ฐานกับผู้ใช้ก่อน

## ส่วนที่ยังไม่ติดตั้ง

ตั้งใจเว้นรายการต่อไปนี้ไว้ เพราะต้องติดตั้งโปรแกรม/plugin เพิ่มหรือยังไม่เหมาะกับ repo ปัจจุบัน:

- Superpowers และ Caveman เป็น plugin ของ Claude Code ไม่ได้ติดตั้งใน VS Code Copilot ให้อัตโนมัติ
- RTK และ code-review-graph ต้องลงโปรแกรมและ hook ระดับเครื่อง/repo เพิ่ม จึงไม่รันคำสั่งติดตั้งจากคู่มือ Arch Linux บน Windows โดยอัตโนมัติ
- `intent-layer` ไม่ได้รวมอยู่ใน ZIP และต้องดาวน์โหลดเพิ่ม
- `eslint.boundaries.js` ไม่ได้ติดตั้ง เพราะ repo ปัจจุบันยังไม่มี `package.json` หรือโครง `src/modules/` ให้ตั้งค่า lint
- `docs/architecture/context-map.md` ใน ZIP เป็นตัวอย่างระบบห้องสมุด ไม่ใช่โมเดลของ School-Coupon จึงไม่คัดลอกมาเป็นกติกาจริง ให้สร้างและรีวิว context map จาก requirement/โค้ดจริงก่อนเริ่มงาน DDD

คู่มือ [INSTALL.md](INSTALL.md) ใช้คำสั่ง Arch Linux; อย่ารันคำสั่ง `pacman`, `pipx` หรือ shell hook ในนั้นบน Windows

## ตรวจการตั้งค่า

เปิด chat ใหม่ใน VS Code ที่ workspace นี้ แล้วขอให้ agent สรุป workflow สำหรับฟีเจอร์โดยยังไม่แก้ไฟล์ ตรวจว่า agent:

1. อ่าน `AGENTS.md` และเห็น skills ใน `.claude/skills/`
2. ใช้รหัส use case แทน Jira key เมื่อทีมไม่ได้ใช้ Jira
3. ไม่สมมติว่า context map ของห้องสมุดเป็นโดเมนของ School-Coupon
4. เสนอ worktree ที่สร้างได้จาก PowerShell/Git เมื่อไม่มี native worktree support

---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up. Saves to a persistent folder that survives reboot.
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
---

<!-- ดัดแปลงจาก mattpocock/skills (MIT) skills/productivity/handoff; เก็บไฟล์นอก repo ในโฟลเดอร์ถาวร -->

Write a handoff document summarising the current conversation so a fresh agent can continue the work.

## Where to save

Save it outside the repository, in a folder that survives reboot. On Windows PowerShell:

```powershell
$common = git rev-parse --path-format=absolute --git-common-dir 2>$null
if ($LASTEXITCODE -eq 0) {
    $repo = Split-Path (Split-Path $common -Parent) -Leaf
} else {
    $repo = Split-Path (Get-Location).Path -Leaf
}
$dir = Join-Path $env:LOCALAPPDATA "claude-handoff\$repo"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
```

On Linux/macOS:

```bash
COMMON=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)
REPO=$(basename "${COMMON%/.git}")
[ -n "$COMMON" ] || REPO=$(basename "$PWD")
DIR="${XDG_STATE_HOME:-$HOME/.local/state}/claude-handoff/$REPO"
mkdir -p "$DIR"
```

- Use `--git-common-dir` so a session inside a worktree saves to the same folder as the main checkout.
- File name: `$DIR/<YYYY-MM-DD-HHMM>-<KEY>-<short-topic>.md`, where KEY is the Story key or UC id (for example `UC-12`), or `misc` if there is none.
- Never save into the repository or a worktree, and never into `/tmp`.
- After writing, print the absolute path of the file so the user can copy it.

## What to include

- What the work is, the KEY, the branch, and the worktree path.
- Where the work stands in `feature-workflow` (which step, which ACs are done, which are next).
- Decisions made in this conversation that are not written anywhere else, and open questions.
- A "suggested skills" section naming which skills the next agent should call the Skill tool for.

Do not duplicate content already captured in other artifacts (use case files in `docs/usecases/`, plans in `docs/plans/`, ADRs, issues, commits, diffs). Reference them by path or URL instead.

Redact any sensitive information, such as API keys, passwords, or personally identifiable information.

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc accordingly.

## Resuming

To pick up the latest handoff for this repo in a new session, the user can say "อ่าน handoff ล่าสุด". On Windows, list files with `Get-ChildItem -LiteralPath $dir -File | Sort-Object LastWriteTime -Descending | Select-Object -First 5`; on Linux/macOS, use `ls -t "$DIR" | head -5`. Read the newest file, and confirm with the user before continuing if more than one file was written in the last day.

## Cleanup

Handoff files are not deleted automatically. When the user asks to clean up, list files older than 30 days and delete only after the user confirms.

# Logs Guide

- Location: `logs/`
  - Per-service: `bff.YYYY-MM-DD.log`, `frontend.YYYY-MM-DD.log`
  - Combined: `stack.YYYY-MM-DD.log`
- Auto-saved: `scripts/start.sh` pipes output to logs while also printing to terminal.
- View quickly: `./scripts/tail.sh` (shows last 200 lines and follows)

Common tips
- New day, new files: logs rotate by date. Older days remain for reference.
- Share with Codex: just mention a filepath (e.g. `logs/bff.2025-09-02.log:1`) or paste relevant lines.
- Clean up: delete old files in `logs/` if they get large.


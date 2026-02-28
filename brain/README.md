# TradeMind.bot Frontend Brain - Knowledge Base

## What Is This?

This `brain/` directory is the **persistent knowledge base** for the TradeMind.bot frontend (Next.js). It ensures continuity across AI sessions, machine changes, and logins.

## How It Works

1. **On session start**: Agent reads `00_INDEX.md` and latest session snapshot
2. **During session**: Agent updates brain docs as decisions are made
3. **On session end**: Run `/end-session` to create snapshot

## Directory Structure

```
brain/
├── 00_INDEX.md                  # Master index (read first)
├── 01_PRODUCT_VISION.md         # Product goals, UX principles
├── 02_ARCHITECTURE_OVERVIEW.md  # Frontend architecture
├── 90_DECISIONS_LOG.md          # ADR-style decisions
└── snapshots/                   # Per-session snapshots
```

## Related Workspaces
- **Backend (Theta Trading)**: `d:\Projects\tastywork-trading-1\brain\`
- **IB Trading**: `d:\Projects\IB-program-trading\brain\`

## Related Config

- `.agent/rules/brain-bootstrap.md` - Forces brain loading
- `.agent/workflows/end-session.md` - Session snapshot generation
- `.agent/skills/brain-manager/SKILL.md` - Knowledge management

## Version Control

This directory is tracked in Git:
```bash
git add brain/ .agent/
git commit -m "update: brain knowledge base"
```

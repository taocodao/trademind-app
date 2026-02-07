# TradeMind.bot Frontend - Brain Index

## How to Use This Brain
- This folder is the complete knowledge base for the frontend workspace.
- Before doing anything significant:
  - Read this file.
  - Skim headings of all other brain/*.md files.
  - Ask the user which sub-area is relevant if unclear.

## Document Map

| File | Description |
|------|-------------|
| [00_INDEX.md](./00_INDEX.md) | This file - table of contents |
| [01_PRODUCT_VISION.md](./01_PRODUCT_VISION.md) | Product goals, UX principles |
| [02_ARCHITECTURE_OVERVIEW.md](./02_ARCHITECTURE_OVERVIEW.md) | Frontend architecture |
| [10_COMPONENTS.md](./10_COMPONENTS.md) | UI components reference |
| [11_PAGES.md](./11_PAGES.md) | Page structure and routes |
| [90_DECISIONS_LOG.md](./90_DECISIONS_LOG.md) | All key decisions |

## Related Workspaces
- **Backend**: `d:\Projects\tastywork-trading-1\brain\`
- **IB Trading**: `d:\Projects\IB-program-trading\brain\`

## Session Snapshots
Located in `snapshots/` - per-session summaries of work done.

## Tech Stack
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- WebSocket (signals)

## Key Files
- `src/app/signals/page.tsx` - Signal display
- `src/components/providers/SignalProvider.tsx` - WebSocket integration
- `src/lib/tastytrade-api.ts` - Tastytrade API client
- `src/lib/strategy-executor.ts` - Trade execution

# TradeMind.bot Frontend — Architecture Overview

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 14 | App Router framework |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| WebSocket | Real-time signals |

## Key Files

| File | Purpose |
|------|---------|
| `src/app/signals/page.tsx` | Signal display page |
| `src/components/providers/SignalProvider.tsx` | WebSocket integration |
| `src/lib/tastytrade-api.ts` | Tastytrade API client |
| `src/lib/strategy-executor.ts` | Trade execution logic |

## Data Flow

```
Backend (EC2)
  └─ WebSocket ─→ SignalProvider.tsx
                    └─→ signals/page.tsx (display)
                    └─→ strategy-executor.ts (execute)
                          └─→ tastytrade-api.ts
                                └─→ Tastytrade API
```

## Authentication
- Tastytrade OAuth for trade execution
- Session tokens managed client-side

## Deployment
- **Frontend**: Vercel (auto-deploy from main branch)
- **Backend**: EC2 (see `tastywork-trading-1` workspace)

## Related Workspaces
- **Backend**: `d:\Projects\tastywork-trading-1\brain\`
- **IB Trading**: `d:\Projects\IB-program-trading\brain\`

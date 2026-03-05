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

### Trade Execution
```
1. Frontend calls Vercel /api/signals/[id]/approve
2. Execution Path Selection:
   - Local: Direct to Tastytrade API (Theta/Diagonal)
   - Proxy: Route to EC2 Backend (TurboBounce/ZEBRA)
3. EC2 Backend (Proxy Path):
   - Connects to IB for Live Price
   - Executes via Tastytrade SDK
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

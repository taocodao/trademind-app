import React from 'react';

interface TurboSignalContext {
  regime: string;
  confidence: number;
  mlScore?: number;
  allocation: Record<string, number>;
}

export function SignalContextBadge({ signal }: { signal: TurboSignalContext | null }) {
  if (!signal) return null;

  const getColors = (regime: string) => {
    switch (regime?.toUpperCase()) {
      case 'BULL':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      case 'BEAR':
        return 'bg-red-500/10 border-red-500/20 text-red-400';
      case 'SIDEWAYS':
      default:
        return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
    }
  };

  const colors = getColors(signal.regime);

  return (
    <div className={`rounded-xl border px-3 py-2.5 ${colors} shadow-sm backdrop-blur-sm`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-40"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
          </span>
          Today's TurboCore
        </span>
        <span className="text-[10px] uppercase font-semibold opacity-60 tracking-wider">Context Injected ↓</span>
      </div>
      
      <div className="flex items-baseline gap-3 mt-0.5">
        <span className="font-bold text-sm">{signal.regime}</span>
        <div className="flex items-center gap-2 opacity-90">
          <span className="text-xs font-medium">{signal.confidence}% conf</span>
          {signal.mlScore !== undefined && (
             <>
               <span className="w-1 h-1 rounded-full bg-current opacity-40" />
               <span className="text-xs font-medium">ML: {signal.mlScore}</span>
             </>
          )}
        </div>
      </div>
      
      {Object.keys(signal.allocation).length > 0 && (
        <div className="text-[11px] mt-1.5 font-medium opacity-75 bg-black/10 rounded px-2 py-1 inline-block">
          {Object.entries(signal.allocation).map(([k,v]) => `${k} ${v}%`).join(' • ')}
        </div>
      )}
    </div>
  );
}

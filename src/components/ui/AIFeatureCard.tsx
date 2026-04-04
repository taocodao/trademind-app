import Link from 'next/link';

interface AIFeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  featureKey: string;
  price: number;
  isActive: boolean;
  isFreePickAvailable: boolean;
  userTier: string;
  onSubscribe?: (featureKey: string) => void;
  onUnsubscribe?: (featureKey: string) => void;
  href?: string;
}

export function AIFeatureCard({
  icon,
  title,
  description,
  featureKey,
  price,
  isActive,
  isFreePickAvailable,
  userTier,
  onSubscribe,
  onUnsubscribe,
  href,
}: AIFeatureCardProps) {
  const isObserver = userTier === 'observer';
  
  // State 1: Active
  if (isActive) {
    return (
      <div className="relative h-full flex flex-col rounded-xl border border-tm-border/50 bg-tm-surface p-4 transition-all">
        <div className="absolute top-3 right-3 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider shadow-sm flex items-center gap-1">
          <span className="text-[8px]">●</span> ACTIVE
        </div>
        
        <Link href={href || `/ai/${featureKey}`} className="flex-grow flex flex-col cursor-pointer hover:opacity-80 transition-opacity">
            <div className="text-2xl mb-2">{icon}</div>
            <div className="text-white font-semibold text-sm leading-tight">{title}</div>
            <div className="text-tm-muted text-xs mt-1.5 leading-relaxed flex-grow">{description}</div>
        </Link>
        
        {featureKey !== 'chat' && (
            <div className="mt-3 pt-2 text-right">
                <button 
                  onClick={() => onUnsubscribe && onUnsubscribe(featureKey)}
                  className="text-tm-muted/60 hover:text-red-400 text-[10px] uppercase font-medium transition-colors"
                >
                  Remove Access
                </button>
            </div>
        )}
      </div>
    );
  }

  // State 2: Observer (Fully Locked)
  if (isObserver && featureKey !== 'chat') {
    return (
      <div className="relative h-full flex flex-col rounded-xl border border-tm-border bg-tm-surface/40 p-4 opacity-70">
        <div className="text-2xl mb-2 opacity-50">{icon}</div>
        <div className="text-white font-semibold text-sm leading-tight">{title}</div>
        <div className="text-tm-muted text-xs mt-1.5 leading-relaxed flex-grow">{description}</div>
        <div className="absolute inset-0 bg-tm-bg/60 backdrop-blur-[2px] flex items-center justify-center rounded-2xl z-20">
            <div className="bg-tm-card/90 border border-tm-purple/30 p-4 rounded-xl text-center max-w-[80%] shadow-lg">
                <Crown className="w-6 h-6 text-tm-purple mx-auto mb-2" />
                <p className="text-white text-sm font-bold mb-1">Upgrade Required</p>
                <p className="text-tm-muted text-xs mb-3">Available on paid plans</p>
                <Link href="https://www.trademind.bot/#pricing" className="text-tm-purple text-xs font-semibold hover:underline">Subscribe to unlock</Link>
            </div>
        </div>
      </div>
    );
  }

  // State 3: Free Pick Available
  if (isFreePickAvailable && featureKey !== 'chat') {
    return (
      <div className="relative h-full flex flex-col rounded-xl border border-tm-purple/50 bg-tm-surface p-4 shadow-[0_0_15px_rgba(168,85,247,0.1)] transition-all">
        <div className="absolute top-3 right-3 bg-tm-purple text-white rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm animate-pulse">
          FREE PICK
        </div>
        <div className="text-2xl mb-2">{icon}</div>
        <div className="text-white font-semibold text-sm leading-tight">{title}</div>
        <div className="text-tm-muted text-xs mt-1.5 leading-relaxed flex-grow">{description}</div>
        
        <button 
            onClick={() => onSubscribe && onSubscribe(featureKey)}
            className="mt-3 w-full py-1.5 rounded-lg bg-tm-purple hover:bg-tm-purple/90 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1"
        >
            Add for FREE
        </button>
      </div>
    );
  }

  // State 4: Paid Locked ($5/mo)
  return (
    <div className="relative h-full flex flex-col rounded-xl border border-tm-border/50 bg-tm-surface/80 p-4 transition-all">
        <div className="absolute top-3 right-3 bg-tm-surface/80 border border-tm-border rounded-full px-2 py-0.5 text-[10px] text-tm-muted font-semibold shadow-sm">
          ${price}/mo
        </div>
        <div className="text-2xl mb-2 opacity-80">{icon}</div>
        <div className="text-white font-semibold text-sm leading-tight">{title}</div>
        <div className="text-tm-muted text-xs mt-1.5 leading-relaxed flex-grow">{description}</div>
        
        <button 
            onClick={() => onSubscribe && onSubscribe(featureKey)}
            className="mt-3 w-full py-1.5 rounded-lg border border-tm-border hover:border-tm-purple/50 hover:bg-tm-purple/10 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1"
        >
            Unlock for ${price}/mo
        </button>
    </div>
  );
}

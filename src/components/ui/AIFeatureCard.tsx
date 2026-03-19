import Link from 'next/link';

interface AIFeatureCardProps {
  icon: string | React.ReactNode;
  title: string;
  description: string;
  tier: 'all' | 'pro' | 'bundle';
  messagesRequired: number;
  href: string;
  userTier: string;
}

export function AIFeatureCard({ icon, title, description, tier, messagesRequired, href, userTier }: AIFeatureCardProps) {
  const isLocked = (tier === 'pro' && !['pro', 'bundle'].includes(userTier)) || 
                   (tier === 'bundle' && userTier !== 'bundle');

  return (
    <Link href={isLocked ? '#' : href} className="block h-full">
      <div className={`relative h-full flex flex-col rounded-xl border p-4 
        ${isLocked 
          ? 'bg-tm-surface/40 border-tm-border opacity-70 cursor-not-allowed' 
          : 'bg-tm-surface border-tm-border/50 hover:border-tm-purple/50 active:scale-[0.98]'
        } transition-all`}>
        {isLocked && (
          <div className="absolute top-3 right-3 bg-tm-purple/20 border border-tm-purple/30 rounded-full px-2 py-0.5 text-[10px] text-tm-purple font-semibold uppercase tracking-wider shadow-sm">
            {tier === 'pro' ? 'PRO' : 'BUNDLE'}
          </div>
        )}
        <div className="text-2xl mb-2">{icon}</div>
        <div className="text-white font-semibold text-sm leading-tight">{title}</div>
        <div className="text-tm-muted text-xs mt-1.5 leading-relaxed flex-grow">{description}</div>
        {!isLocked && (
          <div className="text-tm-muted/60 text-[10px] mt-3 font-medium flex items-center gap-1.5 pt-2 border-t border-tm-border/30">
            <span className="flex h-1.5 w-1.5 rounded-full bg-tm-purple/50" />
            Uses {messagesRequired} {messagesRequired === 1 ? 'message' : 'messages'}
          </div>
        )}
      </div>
    </Link>
  );
}

"use client";

interface Badge {
    type: string;
    name: string;
    icon: string;
    earnedAt: string | null;
    progress: number;
    requirement?: string;
}

interface BadgeGridProps {
    badges: Badge[];
    showLocked?: boolean;
}

export function BadgeGrid({ badges, showLocked = true }: BadgeGridProps) {
    const earnedBadges = badges.filter(b => b.earnedAt);
    const lockedBadges = badges.filter(b => !b.earnedAt);

    const displayBadges = showLocked
        ? [...earnedBadges, ...lockedBadges]
        : earnedBadges;

    if (displayBadges.length === 0) {
        return (
            <div className="text-center py-8 text-tm-muted">
                <p>No badges yet. Start trading to earn badges!</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {displayBadges.map((badge) => (
                <BadgeCard key={badge.type} badge={badge} />
            ))}
        </div>
    );
}

function BadgeCard({ badge }: { badge: Badge }) {
    const isEarned = !!badge.earnedAt;

    return (
        <div
            className={`relative rounded-2xl p-4 text-center transition-all ${isEarned
                    ? 'bg-gradient-to-br from-yellow-500/20 via-amber-500/10 to-orange-500/20 border border-yellow-500/30'
                    : 'bg-tm-surface/50 border border-white/5 opacity-60'
                }`}
        >
            {/* Badge Icon */}
            <div className={`text-4xl mb-2 ${!isEarned && 'grayscale'}`}>
                {badge.icon}
            </div>

            {/* Badge Name */}
            <h4 className={`font-semibold text-sm ${isEarned ? '' : 'text-tm-muted'}`}>
                {badge.name}
            </h4>

            {/* Progress or Date */}
            {isEarned ? (
                <p className="text-xs text-tm-green mt-1">
                    ✓ Earned
                </p>
            ) : (
                <div className="mt-2">
                    {/* Progress Bar */}
                    <div className="h-1.5 bg-tm-surface rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-tm-purple to-tm-green transition-all"
                            style={{ width: `${badge.progress}%` }}
                        />
                    </div>
                    <p className="text-xs text-tm-muted mt-1">
                        {badge.progress}%
                    </p>
                </div>
            )}

            {/* Requirement Tooltip on Hover */}
            {badge.requirement && (
                <p className="text-xs text-tm-muted mt-2 line-clamp-2">
                    {badge.requirement}
                </p>
            )}

            {/* Shine effect for earned badges */}
            {isEarned && (
                <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                    <div className="absolute -inset-[100%] animate-[spin_10s_linear_infinite] bg-gradient-conic from-yellow-500/10 via-transparent to-transparent" />
                </div>
            )}
        </div>
    );
}

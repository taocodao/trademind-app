'use client';

import { SECTION_LIST } from '@/lib/start/sections';
import { useToken } from './TokenLink';

export default function ExploreRow({ current }: { current?: string }) {
    const tok = useToken();
    const q = tok ? `?k=${tok}` : '';
    return (
        <nav aria-label="Explore" className="mt-10 border-t border-white/10 pt-4 text-sm text-gray-400">
            <span className="mr-2">Explore:</span>
            {SECTION_LIST.filter((s) => s.key !== current).map((s, i) => (
                <span key={s.key}>
                    {i > 0 && <span className="mx-2 text-gray-600">|</span>}
                    <a href={`/start/${s.key}${q}`} className="text-blue-300 hover:underline">{s.label}</a>
                </span>
            ))}
        </nav>
    );
}

'use client';

/** A link that carries the campaign token (t or k) from the current address, so in-site navigation stays attributed. */
import { useEffect, useState } from 'react';

const TOKEN_RE = /^[A-Za-z0-9_-]{10,11}$/;

export function useToken(): string {
    const [tok, setTok] = useState('');
    useEffect(() => {
        const p = new URLSearchParams(window.location.search);
        const v = p.get('t') || p.get('k') || '';
        if (TOKEN_RE.test(v)) setTok(v);
    }, []);
    return tok;
}

export default function TokenLink({ href, className, children, param = 'k' }: { href: string; className?: string; children: React.ReactNode; param?: 'k' | 't' }) {
    const tok = useToken();
    const url = tok ? `${href}${href.includes('?') ? '&' : '?'}${param}=${tok}` : href;
    return <a href={url} className={className}>{children}</a>;
}

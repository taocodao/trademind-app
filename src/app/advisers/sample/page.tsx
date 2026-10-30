import Sample from './Sample';

export const metadata = { title: 'Research sample for advisers | TradeMind', robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
    const { t } = await searchParams;
    const ok = typeof t === 'string' && /^[A-Za-z0-9_-]{10,11}$/.test(t);
    const subscribeUrl = ok ? `/r/${t}/sw?s=21` : '/newsletter/join';
    const bookUrl = ok ? `/r/${t}/mt?s=21` : 'https://calendar.app.google/dKsXK6G3cV3ppbAo7';
    return <Sample subscribeUrl={subscribeUrl} bookUrl={bookUrl} />;
}

import type { MetadataRoute } from 'next';
import { ISSUES_DESC, issueUrl } from '@/lib/newsletter/issues';
import { GUIDE_CONTENT } from '@/lib/newsletter/guides';

const BASE = 'https://trademind.bot';

export default function sitemap(): MetadataRoute.Sitemap {
    const staticPages: MetadataRoute.Sitemap = [
        '',
        '/how-it-works',
        '/verify',
        '/newsletter',
        '/newsletter/issues',
        '/newsletter/start-here',
        '/newsletter/offer',
        '/newsletter/disclosures',
        '/newsletter/research/backtest-validation',
        '/newsletter/research/ml-framework',
        '/newsletter/research/risk-framework',
    ].map((path) => ({
        url: BASE + path,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: path === '/newsletter' ? 0.9 : 0.6,
    }));

    const issuePages: MetadataRoute.Sitemap = ISSUES_DESC.map((i) => ({
        url: BASE + issueUrl(i),
        lastModified: new Date(i.publishDate + 'T12:00:00Z'),
        changeFrequency: 'monthly',
        priority: 0.7,
    }));

    const guidePages: MetadataRoute.Sitemap = GUIDE_CONTENT.map((g) => ({
        url: `${BASE}/newsletter/guides/${g.slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.6,
    }));

    return [...staticPages, ...issuePages, ...guidePages];
}

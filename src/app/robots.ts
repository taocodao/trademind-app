import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/api/',
                    '/admin',
                    '/account',
                    '/accounts',
                    '/activity',
                    '/dashboard',
                    '/positions',
                    '/settings',
                    '/signals',
                    '/upgrade',
                    '/newsletter/confirm',
                    '/newsletter/change-email',
                ],
            },
        ],
        sitemap: 'https://trademind.bot/sitemap.xml',
    };
}

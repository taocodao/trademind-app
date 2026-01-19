import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // TradeMind Design System
                'tm-bg': '#0A0A0F',
                'tm-surface': '#1A1A2E',
                'tm-purple': '#7C3AED',
                'tm-green': '#10B981',
                'tm-red': '#EF4444',
                'tm-text': '#F8FAFC',
                'tm-muted': '#94A3B8',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
        },
    },
    plugins: [],
};
export default config;

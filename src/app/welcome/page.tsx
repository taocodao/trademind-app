import type { Metadata } from 'next';
import { Suspense } from 'react';
import WelcomeClient from './WelcomeClient';

export const metadata: Metadata = { title: 'Welcome - TradeMind', robots: { index: false } };

export default function WelcomePage() {
    return <Suspense fallback={null}><WelcomeClient /></Suspense>;
}

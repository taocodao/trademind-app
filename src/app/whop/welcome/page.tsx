import Link from 'next/link';

export default function RetiredWhopWelcomePage() {
    return (
        <main className="min-h-screen bg-[#070710] px-6 py-24 text-center text-white">
            <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8">
                <h1 className="text-2xl font-bold">Billing has moved</h1>
                <p className="mt-3 text-sm text-gray-400">Create or select an account to manage its annual membership.</p>
                <Link href="/accounts" className="mt-6 inline-flex rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold">Manage accounts</Link>
            </div>
        </main>
    );
}

import OutreachEngage from '@/components/newsletter/OutreachEngage';

export default function NewsletterLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <OutreachEngage />
        </>
    );
}

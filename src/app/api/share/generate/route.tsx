/**
 * Share Image Generator API
 * POST /api/share/generate - Generate shareable images for trades, streaks, badges
 */

import { NextRequest, NextResponse } from 'next/server';
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

interface ShareData {
    type: 'trade' | 'streak' | 'badge';
    title?: string;
    amount?: number;
    symbol?: string;
    returnPercent?: number;
    streak?: number;
    badgeName?: string;
    badgeIcon?: string;
}

export async function POST(request: NextRequest) {
    try {
        const data: ShareData = await request.json();

        // Generate image based on type
        const imageResponse = new ImageResponse(
            (
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                        fontFamily: 'system-ui, sans-serif',
                    }}
                >
                    {/* Background Decoration */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'radial-gradient(circle at 30% 20%, rgba(139, 92, 246, 0.2) 0%, transparent 50%)',
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'radial-gradient(circle at 70% 80%, rgba(34, 197, 94, 0.15) 0%, transparent 50%)',
                        }}
                    />

                    {/* Content Card */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '60px 80px',
                            borderRadius: '32px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(10px)',
                        }}
                    >
                        {/* Logo */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                marginBottom: '32px',
                            }}
                        >
                            <div
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '24px',
                                }}
                            >
                                🤖
                            </div>
                            <span style={{ color: 'white', fontSize: '28px', fontWeight: 600 }}>
                                TradeMind.bot
                            </span>
                        </div>

                        {/* Trade Win Content */}
                        {data.type === 'trade' && (
                            <>
                                <div
                                    style={{
                                        fontSize: '72px',
                                        fontWeight: 800,
                                        color: '#22c55e',
                                        marginBottom: '8px',
                                    }}
                                >
                                    +${data.amount?.toLocaleString()}
                                </div>
                                <div
                                    style={{
                                        fontSize: '32px',
                                        color: 'white',
                                        marginBottom: '8px',
                                    }}
                                >
                                    {data.symbol}
                                </div>
                                <div
                                    style={{
                                        fontSize: '24px',
                                        color: 'rgba(255, 255, 255, 0.6)',
                                    }}
                                >
                                    {data.returnPercent}% return
                                </div>
                            </>
                        )}

                        {/* Streak Content */}
                        {data.type === 'streak' && (
                            <>
                                <div style={{ fontSize: '80px', marginBottom: '16px' }}>🔥</div>
                                <div
                                    style={{
                                        fontSize: '56px',
                                        fontWeight: 800,
                                        color: '#f97316',
                                        marginBottom: '8px',
                                    }}
                                >
                                    {data.streak} Winning Weeks!
                                </div>
                                <div
                                    style={{
                                        fontSize: '24px',
                                        color: 'rgba(255, 255, 255, 0.6)',
                                    }}
                                >
                                    AI-powered trading streak
                                </div>
                            </>
                        )}

                        {/* Badge Content */}
                        {data.type === 'badge' && (
                            <>
                                <div style={{ fontSize: '96px', marginBottom: '16px' }}>
                                    {data.badgeIcon || '🏆'}
                                </div>
                                <div
                                    style={{
                                        fontSize: '40px',
                                        fontWeight: 700,
                                        color: '#fbbf24',
                                        marginBottom: '12px',
                                    }}
                                >
                                    {data.badgeName}
                                </div>
                                <div
                                    style={{
                                        fontSize: '24px',
                                        color: 'rgba(255, 255, 255, 0.6)',
                                    }}
                                >
                                    Badge Unlocked!
                                </div>
                            </>
                        )}

                        {/* Tagline */}
                        <div
                            style={{
                                marginTop: '40px',
                                padding: '12px 24px',
                                borderRadius: '999px',
                                background: 'rgba(139, 92, 246, 0.2)',
                                border: '1px solid rgba(139, 92, 246, 0.3)',
                                color: '#a78bfa',
                                fontSize: '20px',
                            }}
                        >
                            AI made money while I slept 💤
                        </div>
                    </div>

                    {/* Footer */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: 'rgba(255, 255, 255, 0.5)',
                            fontSize: '18px',
                        }}
                    >
                        Join the AI trading revolution → trademind.bot
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
            }
        );

        return imageResponse;
    } catch (error) {
        console.error('❌ Error generating share image:', error);
        return NextResponse.json(
            { error: 'Failed to generate image' },
            { status: 500 }
        );
    }
}

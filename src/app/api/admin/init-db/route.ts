/**
 * Database Initialization API
 * One-time setup to create user_settings table
 */

import { NextResponse } from 'next/server';
import { initializeUserTables } from '@/lib/db';

export async function POST() {
    try {
        console.log('🔧 Initializing database tables...');

        await initializeUserTables();

        return NextResponse.json({
            success: true,
            message: 'Database tables initialized successfully',
        });

    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to initialize database',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

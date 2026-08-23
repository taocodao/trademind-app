import { NextResponse } from 'next/server';

const retired = () => NextResponse.json({ error: 'Whop billing has been retired' }, { status: 410 });

export async function GET() { return retired(); }
export async function POST() { return retired(); }
export async function PUT() { return retired(); }
export async function PATCH() { return retired(); }
export async function DELETE() { return retired(); }

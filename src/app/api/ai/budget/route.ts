import { NextRequest, NextResponse } from 'next/server';
import { checkAIBudget, getUserFromRequest } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    const budget = await checkAIBudget(user.privyDid, 0); // Cost 0 just checking
    return NextResponse.json(budget);
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

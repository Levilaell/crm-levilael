import { NextResponse } from 'next/server';
import { requireCrmSession } from '@/lib/auth';
import { runHealthChecks } from '@/lib/health';

export async function GET() {
  await requireCrmSession();
  const results = await runHealthChecks();
  return NextResponse.json({
    ok: results.every((r) => r.ok),
    results,
    checked_at: new Date().toISOString(),
  });
}

import { NextResponse } from 'next/server';
import { runHealthChecks } from '@/lib/health';
import { notifyHealthFailures } from '@/lib/notifications';

export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  if (request.headers.get('x-vercel-cron')) return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

/**
 * Cron diário (9h da manhã) — checa Anthropic, OpenAI, Telegram, Supabase.
 * Se algum falhar, manda Telegram pros admins. Evita ficar uma semana com
 * chave expirada e descobrir só quando lead reclamar.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const results = await runHealthChecks();
  const failures = results
    .filter((r) => !r.ok)
    .map((r) => ({ service: r.service, detail: r.detail }));

  let notified = 0;
  if (failures.length > 0) {
    notified = await notifyHealthFailures({ failures });
  }

  return NextResponse.json({
    ok: failures.length === 0,
    failures,
    results,
    notified,
    checked_at: new Date().toISOString(),
  });
}

export const POST = GET;

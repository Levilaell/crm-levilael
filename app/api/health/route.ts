import { NextResponse } from 'next/server';
import { requireCrmSession } from '@/lib/auth';

interface HealthResult {
  service: string;
  ok: boolean;
  latency_ms?: number;
  detail?: string;
}

async function checkAnthropic(): Promise<HealthResult> {
  const t = Date.now();
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return { service: 'anthropic', ok: false, detail: 'missing key' };
    // /v1/models é o endpoint mais barato
    const res = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    });
    return {
      service: 'anthropic',
      ok: res.ok,
      latency_ms: Date.now() - t,
      detail: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      service: 'anthropic',
      ok: false,
      detail: err instanceof Error ? err.message : 'unknown',
    };
  }
}

async function checkOpenAI(): Promise<HealthResult> {
  const t = Date.now();
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return { service: 'openai', ok: false, detail: 'missing key' };
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    return {
      service: 'openai',
      ok: res.ok,
      latency_ms: Date.now() - t,
      detail: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      service: 'openai',
      ok: false,
      detail: err instanceof Error ? err.message : 'unknown',
    };
  }
}

async function checkTelegram(): Promise<HealthResult> {
  const t = Date.now();
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return { service: 'telegram', ok: false, detail: 'missing token' };
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const json = (await res.json()) as { ok: boolean; description?: string };
    return {
      service: 'telegram',
      ok: json.ok,
      latency_ms: Date.now() - t,
      detail: json.ok ? undefined : json.description,
    };
  } catch (err) {
    return {
      service: 'telegram',
      ok: false,
      detail: err instanceof Error ? err.message : 'unknown',
    };
  }
}

async function checkSupabase(): Promise<HealthResult> {
  const t = Date.now();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return { service: 'supabase', ok: false, detail: 'missing url' };
  try {
    const res = await fetch(`${url}/auth/v1/health`);
    return {
      service: 'supabase',
      ok: res.ok,
      latency_ms: Date.now() - t,
      detail: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      service: 'supabase',
      ok: false,
      detail: err instanceof Error ? err.message : 'unknown',
    };
  }
}

export async function GET() {
  await requireCrmSession();
  const [anthropic, openai, telegram, supabase] = await Promise.all([
    checkAnthropic(),
    checkOpenAI(),
    checkTelegram(),
    checkSupabase(),
  ]);
  const results = [supabase, anthropic, openai, telegram];
  return NextResponse.json({
    ok: results.every((r) => r.ok),
    results,
    checked_at: new Date().toISOString(),
  });
}

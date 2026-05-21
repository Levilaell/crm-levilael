import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { normalizePhoneBR } from '@/lib/phone';

const PayloadSchema = z.object({
  source_diagnosis_id: z.string().uuid(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  name: z.string().max(200).nullable().optional(),
  score: z.number().int().min(0).max(100),
  answers: z.record(z.string(), z.unknown()),
  ai_analysis: z.record(z.string(), z.unknown()).nullable().optional(),
  completed_at: z.string().datetime(),
});

/**
 * Recebido quando alguém completa o diagnóstico no site.
 * NÃO cria lead. NÃO dispara Telegram. Só armazena o snapshot pra
 * matching futuro caso a pessoa vire lead via formulário/calcom.
 */
export async function POST(request: Request) {
  const expected = process.env.CRM_WEBHOOK_SECRET;
  if (!expected) {
    return NextResponse.json({ ok: false, error: 'server not configured' }, { status: 500 });
  }
  if (request.headers.get('x-webhook-secret') !== expected) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }
  const parsed = PayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'invalid payload', issues: parsed.error.issues },
      { status: 422 },
    );
  }
  const payload = parsed.data;
  const phoneNormalized = normalizePhoneBR(payload.phone ?? null);

  const admin = createServiceRoleClient();

  // Idempotência por source_diagnosis_id (unique constraint na tabela)
  const { data: existing } = await admin
    .from('crm_diagnosis_snapshots')
    .select('id')
    .eq('source_diagnosis_id', payload.source_diagnosis_id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({
      id: (existing as { id: string }).id,
      status: 'stored',
      duplicate: true,
    });
  }

  const { data: inserted, error } = await admin
    .from('crm_diagnosis_snapshots')
    .insert({
      source_diagnosis_id: payload.source_diagnosis_id,
      email: payload.email?.toLowerCase() ?? null,
      phone: phoneNormalized,
      name: payload.name ?? null,
      score: payload.score,
      answers: payload.answers,
      ai_analysis: payload.ai_analysis ?? null,
      completed_at: payload.completed_at,
    })
    .select('id')
    .single();

  if (error || !inserted) {
    console.error('[webhook/diagnosis] insert failed', error);
    return NextResponse.json({ ok: false, error: 'insert failed' }, { status: 500 });
  }

  return NextResponse.json({
    id: (inserted as { id: string }).id,
    status: 'stored',
    duplicate: false,
  });
}

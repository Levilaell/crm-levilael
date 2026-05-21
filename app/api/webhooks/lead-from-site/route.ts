import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { notifyNewLead } from '@/lib/notifications';
import { normalizePhoneBR } from '@/lib/phone';
import { findMatchingSnapshot, markSnapshotConverted } from '@/lib/diagnosis-snapshots';

const PayloadSchema = z.object({
  source: z.enum(['whatsapp_form', 'calcom']),
  name: z.string().min(1).max(200),
  email: z.string().email().nullable().optional(),
  phone: z.string().min(1).max(50),
  company_name: z.string().max(200).nullable().optional(),
  message: z.string().max(2000).nullable().optional(),
  calcom_event_uri: z.string().url().nullable().optional(),
});

/**
 * Recebido quando alguém preenche o formulário "Vamos conversar" OU
 * agenda no Cal.com. ESSE é o gatilho real de lead — cria registro,
 * faz matching com diagnostic snapshot prévio, dispara Telegram.
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
  const phoneNormalized = normalizePhoneBR(payload.phone);
  if (!phoneNormalized) {
    return NextResponse.json(
      { ok: false, error: 'phone could not be normalized to BR format' },
      { status: 422 },
    );
  }

  const admin = createServiceRoleClient();

  // Idempotência: unique (source, phone) na tabela. Se já existir, retorna.
  const { data: existing } = await admin
    .from('crm_leads')
    .select('id, name')
    .eq('source', payload.source)
    .eq('phone', phoneNormalized)
    .maybeSingle();
  if (existing) {
    const row = existing as { id: string; name: string };
    return NextResponse.json({
      id: row.id,
      telegram_sent: false,
      matched_diagnosis: false,
      duplicate: true,
    });
  }

  // Matching com diagnosis snapshot recente
  const snapshot = await findMatchingSnapshot({
    email: payload.email ?? null,
    phoneNormalized,
  });

  const insertFields: Record<string, unknown> = {
    source: payload.source,
    name: payload.name,
    email: payload.email?.toLowerCase() ?? null,
    phone: phoneNormalized,
    company_name: payload.company_name ?? null,
    notes: payload.message ?? null,
    stage: 'new',
  };
  if (snapshot) {
    insertFields.matched_diagnosis_id = snapshot.id;
    insertFields.diagnosis_answers = snapshot.answers;
    insertFields.diagnosis_score = snapshot.score;
  }

  const { data: inserted, error: insertErr } = await admin
    .from('crm_leads')
    .insert(insertFields)
    .select('id, name, company_name, phone, email, source, qualification, diagnosis_score')
    .single();

  if (insertErr || !inserted) {
    console.error('[webhook/lead] insert failed', insertErr);
    return NextResponse.json({ ok: false, error: 'insert failed' }, { status: 500 });
  }
  const lead = inserted as {
    id: string;
    name: string;
    company_name: string | null;
    phone: string | null;
    email: string | null;
    source: 'whatsapp_form' | 'calcom' | 'manual' | 'referral';
    qualification: 'AAA' | 'AA' | 'A' | 'B' | 'C' | null;
    diagnosis_score: number | null;
  };

  if (snapshot) {
    await markSnapshotConverted(snapshot.id, lead.id);
  }

  await admin.from('crm_lead_events').insert({
    lead_id: lead.id,
    event_type: 'lead_created',
    payload: {
      source: payload.source,
      matched_diagnosis: !!snapshot,
      diagnosis_snapshot_id: snapshot?.id ?? null,
      calcom_event_uri: payload.calcom_event_uri ?? null,
    },
  });

  const sentCount = await notifyNewLead({
    leadId: lead.id,
    name: lead.name,
    companyName: lead.company_name,
    phone: lead.phone,
    email: lead.email,
    source: lead.source,
    qualification: lead.qualification,
    diagnosisScore: lead.diagnosis_score,
    matchedDiagnosis: !!snapshot,
    message: payload.message ?? null,
  });

  return NextResponse.json({
    id: lead.id,
    telegram_sent: sentCount > 0,
    matched_diagnosis: !!snapshot,
    duplicate: false,
  });
}

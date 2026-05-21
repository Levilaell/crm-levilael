import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { notifyNewLead } from '@/lib/notifications';

const PayloadSchema = z.object({
  source: z.enum(['diagnosis', 'calcom', 'manual', 'telegram', 'referral']),
  source_lead_id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  company_name: z.string().max(200).optional().nullable(),
  role_title: z.string().max(120).optional().nullable(),
  diagnosis_score: z.number().int().min(0).max(100).optional().nullable(),
  diagnosis_answers: z.record(z.string(), z.unknown()).optional().nullable(),
});

export async function POST(request: Request) {
  const expected = process.env.CRM_WEBHOOK_SECRET;
  if (!expected) {
    return NextResponse.json({ ok: false, error: 'server not configured' }, { status: 500 });
  }
  const provided = request.headers.get('x-webhook-secret');
  if (provided !== expected) {
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
  const admin = createServiceRoleClient();

  // Idempotência: se já existe lead com (source, source_lead_id), retorna o existente
  if (payload.source_lead_id) {
    const { data: existing } = await admin
      .from('crm_leads')
      .select('id, name, company_name, phone, email, source, qualification, diagnosis_score')
      .eq('source', payload.source)
      .eq('source_lead_id', payload.source_lead_id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({
        id: (existing as { id: string }).id,
        telegram_sent: false,
        created: false,
      });
    }
  }

  // Insert lead
  const { data: inserted, error: insertErr } = await admin
    .from('crm_leads')
    .insert({
      source: payload.source,
      source_lead_id: payload.source_lead_id ?? null,
      name: payload.name,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      company_name: payload.company_name ?? null,
      role_title: payload.role_title ?? null,
      diagnosis_answers: payload.diagnosis_answers ?? null,
      diagnosis_score: payload.diagnosis_score ?? null,
      stage: 'new',
    })
    .select('id, name, company_name, phone, email, source, qualification, diagnosis_score')
    .single();

  if (insertErr || !inserted) {
    console.error('[webhook] insert failed', insertErr);
    return NextResponse.json({ ok: false, error: 'insert failed' }, { status: 500 });
  }

  const lead = inserted as {
    id: string;
    name: string;
    company_name: string | null;
    phone: string | null;
    email: string | null;
    source: 'diagnosis' | 'calcom' | 'manual' | 'telegram' | 'referral';
    qualification: 'AAA' | 'AA' | 'A' | 'B' | 'C' | null;
    diagnosis_score: number | null;
  };

  await admin.from('crm_lead_events').insert({
    lead_id: lead.id,
    event_type: 'lead_created',
    payload: { source: payload.source, source_lead_id: payload.source_lead_id ?? null },
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
  });

  return NextResponse.json({ id: lead.id, telegram_sent: sentCount > 0, created: true });
}

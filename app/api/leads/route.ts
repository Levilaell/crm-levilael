import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCrmSession } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { normalizePhoneBR } from '@/lib/phone';
import { getSnapshot, markSnapshotConverted } from '@/lib/diagnosis-snapshots';

const PostSchema = z.object({
  source: z.enum(['whatsapp_form', 'calcom', 'manual', 'referral']),
  name: z.string().min(1).max(200),
  email: z.string().email().nullable().optional(),
  phone: z.string().min(1).max(50),
  company_name: z.string().max(200).nullable().optional(),
  role_title: z.string().max(120).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  from_diagnosis: z.string().uuid().nullable().optional(),
});

export async function POST(request: Request) {
  const session = await requireCrmSession();
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }
  const parsed = PostSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'invalid body', issues: parsed.error.issues },
      { status: 422 },
    );
  }
  const payload = parsed.data;
  const phoneNormalized = normalizePhoneBR(payload.phone);
  if (!phoneNormalized) {
    return NextResponse.json({ ok: false, error: 'phone inválido' }, { status: 422 });
  }

  const admin = createServiceRoleClient();
  const snapshot = payload.from_diagnosis ? await getSnapshot(payload.from_diagnosis) : null;

  const insertFields: Record<string, unknown> = {
    source: payload.source,
    name: payload.name,
    email: payload.email?.toLowerCase() ?? null,
    phone: phoneNormalized,
    company_name: payload.company_name ?? null,
    role_title: payload.role_title ?? null,
    notes: payload.notes ?? null,
    stage: 'new',
  };
  if (snapshot) {
    insertFields.matched_diagnosis_id = snapshot.id;
    insertFields.diagnosis_answers = snapshot.answers;
    insertFields.diagnosis_score = snapshot.score;
  }

  const { data: inserted, error } = await admin
    .from('crm_leads')
    .insert(insertFields)
    .select('id')
    .single();
  if (error || !inserted) {
    if (error?.code === '23505') {
      // unique violation por (source, phone) — devolve existente
      const { data: existing } = await admin
        .from('crm_leads')
        .select('id')
        .eq('source', payload.source)
        .eq('phone', phoneNormalized)
        .maybeSingle();
      return NextResponse.json(
        {
          ok: false,
          error: 'já existe lead com esse phone+source',
          existing_id: (existing as { id?: string } | null)?.id ?? null,
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: false, error: error?.message ?? 'insert failed' }, { status: 500 });
  }
  const leadId = (inserted as { id: string }).id;

  if (snapshot) {
    await markSnapshotConverted(snapshot.id, leadId);
  }

  await admin.from('crm_lead_events').insert({
    lead_id: leadId,
    actor_id: session.crmUser.id,
    event_type: 'lead_created',
    payload: {
      source: payload.source,
      manual: true,
      matched_diagnosis: !!snapshot,
      diagnosis_snapshot_id: snapshot?.id ?? null,
    },
  });

  return NextResponse.json({ ok: true, data: { id: leadId } });
}

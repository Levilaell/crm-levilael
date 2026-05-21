import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCrmSession } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { LEAD_STAGES, QUALIFICATIONS } from '@/types/crm';

const PatchSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().max(50).nullable().optional(),
    company_name: z.string().max(200).nullable().optional(),
    role_title: z.string().max(120).nullable().optional(),
    notes: z.string().nullable().optional(),
    owner_id: z.string().uuid().nullable().optional(),
    qualification: z.enum(QUALIFICATIONS as readonly [string, ...string[]]).nullable().optional(),
    qualification_reason: z.string().max(1000).nullable().optional(),
    estimated_ticket_min: z.number().int().nonnegative().nullable().optional(),
    estimated_ticket_max: z.number().int().nonnegative().nullable().optional(),
    next_action_at: z.string().datetime().nullable().optional(),
    last_contact_at: z.string().datetime().nullable().optional(),
    lost_reason: z.string().max(1000).nullable().optional(),
    stage: z.enum(LEAD_STAGES as readonly [string, ...string[]]).optional(),
  })
  .strict();

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireCrmSession();
  const { id } = await context.params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'invalid payload', issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const updates = parsed.data;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: 'empty patch' }, { status: 400 });
  }

  const admin = createServiceRoleClient();

  // Se mudou stage, registrar histórico
  const { data: current, error: getErr } = await admin
    .from('crm_leads')
    .select('stage')
    .eq('id', id)
    .maybeSingle();
  if (getErr || !current) {
    return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  }
  const oldStage = (current as { stage: string }).stage;

  const { error: updateErr } = await admin.from('crm_leads').update(updates).eq('id', id);
  if (updateErr) {
    return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
  }

  if (updates.stage && updates.stage !== oldStage) {
    await Promise.all([
      admin.from('crm_lead_stage_history').insert({
        lead_id: id,
        from_stage: oldStage,
        to_stage: updates.stage,
        changed_by: session.crmUser.id,
      }),
      admin.from('crm_lead_events').insert({
        lead_id: id,
        actor_id: session.crmUser.id,
        event_type: 'stage_changed',
        payload: { from: oldStage, to: updates.stage },
      }),
    ]);
  } else {
    await admin.from('crm_lead_events').insert({
      lead_id: id,
      actor_id: session.crmUser.id,
      event_type: 'lead_updated',
      payload: { fields: Object.keys(updates) },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireCrmSession();
  if (session.crmUser.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }
  const { id } = await context.params;
  const admin = createServiceRoleClient();
  const { error } = await admin.from('crm_leads').delete().eq('id', id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

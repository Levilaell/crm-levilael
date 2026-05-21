import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCrmSession } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { LEAD_STAGES } from '@/types/crm';

const BodySchema = z.object({
  stage: z.enum(LEAD_STAGES as readonly [string, ...string[]]),
  reason: z.string().max(500).optional(),
});

export async function POST(
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
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 422 });
  }

  const admin = createServiceRoleClient();
  const { data: lead, error: leadErr } = await admin
    .from('crm_leads')
    .select('id, stage')
    .eq('id', id)
    .maybeSingle();
  if (leadErr || !lead) {
    return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
  }
  const current = (lead as { stage: string }).stage;
  const target = parsed.data.stage;
  if (current === target) {
    return NextResponse.json({ ok: true, data: { unchanged: true } });
  }

  const updateFields: Record<string, unknown> = { stage: target };
  if (target === 'won' || target === 'lost') {
    updateFields.next_action_at = null;
  }
  if (target === 'lost' && parsed.data.reason) {
    updateFields.lost_reason = parsed.data.reason;
  }

  const { error: updateErr } = await admin.from('crm_leads').update(updateFields).eq('id', id);
  if (updateErr) {
    return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
  }

  await Promise.all([
    admin.from('crm_lead_stage_history').insert({
      lead_id: id,
      from_stage: current,
      to_stage: target,
      changed_by: session.crmUser.id,
    }),
    admin.from('crm_lead_events').insert({
      lead_id: id,
      actor_id: session.crmUser.id,
      event_type: 'stage_changed',
      payload: { from: current, to: target, reason: parsed.data.reason ?? null },
    }),
  ]);

  return NextResponse.json({ ok: true, data: { stage: target } });
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCrmSession } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { getLatestBriefing } from '@/lib/briefings';
import type { BriefingDiscovery } from '@/types/crm';

const SyncBodySchema = z.object({
  action: z.literal('sync_from_discovery'),
});

const PatchBodySchema = z.object({
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'revised']).optional(),
  waves: z.array(z.unknown()).optional(),
  total_value_min: z.number().int().nonnegative().optional(),
  total_value_max: z.number().int().nonnegative().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ lead_id: string }> },
) {
  const session = await requireCrmSession();
  const { lead_id } = await context.params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }
  const parsed = SyncBodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 422 });

  const briefing = await getLatestBriefing(lead_id, 'discovery');
  if (!briefing) {
    return NextResponse.json({ ok: false, error: 'briefing de descoberta ausente' }, { status: 412 });
  }
  const content = briefing.content_json as unknown as BriefingDiscovery;
  const totalMin = content.ondas_propostas.reduce((s, o) => s + o.ticket_min, 0);
  const totalMax = content.ondas_propostas.reduce((s, o) => s + o.ticket_max, 0);

  const admin = createServiceRoleClient();
  const existing = await admin
    .from('crm_proposals')
    .select('id, status')
    .eq('lead_id', lead_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const fields = {
    lead_id,
    waves: content.ondas_propostas,
    total_value_min: totalMin,
    total_value_max: totalMax,
  };

  let id: string;
  if (existing.data) {
    const row = existing.data as { id: string; status: string };
    const status = row.status === 'draft' ? 'draft' : 'revised';
    const { error } = await admin
      .from('crm_proposals')
      .update({ ...fields, status })
      .eq('id', row.id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    id = row.id;
  } else {
    const { data, error } = await admin
      .from('crm_proposals')
      .insert({ ...fields, status: 'draft' })
      .select('id')
      .single();
    if (error || !data) return NextResponse.json({ ok: false, error: error?.message ?? 'insert failed' }, { status: 500 });
    id = (data as { id: string }).id;
  }

  await admin.from('crm_lead_events').insert({
    lead_id,
    actor_id: session.crmUser.id,
    event_type: 'proposal_synced',
    payload: { proposal_id: id, total_min: totalMin, total_max: totalMax },
  });

  return NextResponse.json({ ok: true, data: { id } });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ lead_id: string }> },
) {
  const session = await requireCrmSession();
  const { lead_id } = await context.params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }
  const parsed = PatchBodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 422 });

  const admin = createServiceRoleClient();
  const existing = await admin
    .from('crm_proposals')
    .select('id')
    .eq('lead_id', lead_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!existing.data) return NextResponse.json({ ok: false, error: 'no proposal' }, { status: 404 });

  const updates: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === 'sent') updates.sent_at = new Date().toISOString();
  if (parsed.data.status === 'accepted' || parsed.data.status === 'rejected') {
    updates.decided_at = new Date().toISOString();
  }

  const { error } = await admin
    .from('crm_proposals')
    .update(updates)
    .eq('id', (existing.data as { id: string }).id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  await admin.from('crm_lead_events').insert({
    lead_id,
    actor_id: session.crmUser.id,
    event_type: 'proposal_updated',
    payload: { fields: Object.keys(parsed.data) },
  });

  // Avançar lead stage se mudou status
  if (parsed.data.status === 'sent') {
    await admin.from('crm_leads').update({ stage: 'proposal_sent' }).eq('id', lead_id);
  } else if (parsed.data.status === 'accepted') {
    await admin.from('crm_leads').update({ stage: 'won' }).eq('id', lead_id);
  } else if (parsed.data.status === 'rejected') {
    await admin.from('crm_leads').update({ stage: 'lost' }).eq('id', lead_id);
  }

  return NextResponse.json({ ok: true });
}

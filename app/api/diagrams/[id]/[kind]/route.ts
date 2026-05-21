import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCrmSession } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/service';

const NodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.string(), z.unknown()),
});

const EdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
  type: z.string().optional(),
  animated: z.boolean().optional(),
});

const BodySchema = z.object({
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
});

const KIND_VALUES = ['triage', 'discovery', 'solution'] as const;

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string; kind: string }> },
) {
  const session = await requireCrmSession();
  const { id: leadId, kind } = await context.params;
  if (!KIND_VALUES.includes(kind as (typeof KIND_VALUES)[number])) {
    return NextResponse.json({ ok: false, error: 'invalid kind' }, { status: 422 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'invalid body', issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const admin = createServiceRoleClient();
  const { error } = await admin.from('crm_diagrams').upsert(
    {
      lead_id: leadId,
      kind,
      nodes: parsed.data.nodes,
      edges: parsed.data.edges,
      generated_by_ai: false,
    },
    { onConflict: 'lead_id,kind' },
  );
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  await admin.from('crm_lead_events').insert({
    lead_id: leadId,
    actor_id: session.crmUser.id,
    event_type: 'diagram_updated',
    payload: { kind, nodes_count: parsed.data.nodes.length, edges_count: parsed.data.edges.length },
  });

  return NextResponse.json({ ok: true });
}

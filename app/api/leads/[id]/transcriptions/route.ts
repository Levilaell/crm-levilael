import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCrmSession } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/service';

const PostSchema = z.object({
  kind: z.enum(['triage_call', 'discovery_call', 'other']),
  text: z.string().min(1).max(200000),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireCrmSession();
  const { id: leadId } = await context.params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }
  const parsed = PostSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 422 });
  }

  const admin = createServiceRoleClient();
  const wordCount = parsed.data.text.trim().split(/\s+/).filter(Boolean).length;

  const { data, error } = await admin
    .from('crm_transcriptions')
    .insert({
      lead_id: leadId,
      kind: parsed.data.kind,
      source_type: 'text_paste',
      raw_text: parsed.data.text,
      word_count: wordCount,
      created_by: session.crmUser.id,
    })
    .select('id')
    .single();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: error?.message ?? 'insert failed' }, { status: 500 });
  }

  await admin.from('crm_lead_events').insert({
    lead_id: leadId,
    actor_id: session.crmUser.id,
    event_type: 'transcription_added',
    payload: {
      transcription_id: (data as { id: string }).id,
      kind: parsed.data.kind,
      source: 'text_paste',
    },
  });

  return NextResponse.json({ ok: true, data: { id: (data as { id: string }).id, word_count: wordCount } });
}

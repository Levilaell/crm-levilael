import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCrmSession } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/service';

const PatchSchema = z.object({
  text: z.string().min(1).max(200000),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; tid: string }> },
) {
  await requireCrmSession();
  const { id: leadId, tid } = await context.params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 422 });
  }

  const admin = createServiceRoleClient();
  const wordCount = parsed.data.text.trim().split(/\s+/).filter(Boolean).length;

  const { error } = await admin
    .from('crm_transcriptions')
    .update({ raw_text: parsed.data.text, word_count: wordCount })
    .eq('id', tid)
    .eq('lead_id', leadId);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; tid: string }> },
) {
  const session = await requireCrmSession();
  if (session.crmUser.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }
  const { id: leadId, tid } = await context.params;
  const admin = createServiceRoleClient();

  // Pegar storage path antes pra deletar
  const { data: trans } = await admin
    .from('crm_transcriptions')
    .select('audio_storage_path')
    .eq('id', tid)
    .eq('lead_id', leadId)
    .maybeSingle();

  const { error } = await admin
    .from('crm_transcriptions')
    .delete()
    .eq('id', tid)
    .eq('lead_id', leadId);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const path = (trans as { audio_storage_path: string | null } | null)?.audio_storage_path;
  if (path) {
    await admin.storage.from('crm_audio').remove([path]);
  }

  return NextResponse.json({ ok: true });
}

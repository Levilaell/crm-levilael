import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCrmSession } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { generateText } from '@/lib/anthropic';
import { SLIDES_SYSTEM, buildSlidesUserPrompt } from '@/lib/prompts/slides';
import { getLatestBriefing } from '@/lib/briefings';

const BodySchema = z.object({
  lead_id: z.string().uuid(),
  kind: z.enum(['discovery_prep', 'proposal']),
});

export const maxDuration = 300;

export async function POST(request: Request) {
  const session = await requireCrmSession();
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 422 });

  const admin = createServiceRoleClient();
  const { data: lead } = await admin
    .from('crm_leads')
    .select('id, name, company_name')
    .eq('id', parsed.data.lead_id)
    .maybeSingle();
  if (!lead) return NextResponse.json({ ok: false, error: 'lead not found' }, { status: 404 });
  const leadRow = lead as { id: string; name: string; company_name: string | null };

  // discovery_prep usa briefing de triagem (não tem discovery ainda)
  // proposal usa briefing de discovery
  const briefingKind = parsed.data.kind === 'discovery_prep' ? 'triage' : 'discovery';
  const briefing = await getLatestBriefing(leadRow.id, briefingKind);
  if (!briefing) {
    return NextResponse.json(
      { ok: false, error: `briefing de ${briefingKind} ainda não foi gerado` },
      { status: 412 },
    );
  }

  let result;
  try {
    result = await generateText({
      system: SLIDES_SYSTEM,
      user: buildSlidesUserPrompt({
        leadName: leadRow.name,
        companyName: leadRow.company_name,
        discoveryBriefing: briefing.content_json,
        kind: parsed.data.kind,
      }),
      maxTokens: 8192,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'generation failed' },
      { status: 500 },
    );
  }

  const html = result.text.trim();

  // Salvar HTML no storage pra ter URL pública (signed)
  const path = `${leadRow.id}/${parsed.data.kind}_${Date.now()}.html`;
  await admin.storage.from('crm_pdfs').upload(path, new Blob([html], { type: 'text/html' }), {
    contentType: 'text/html',
    upsert: false,
  });

  const { data: inserted, error: insertErr } = await admin
    .from('crm_slide_decks')
    .insert({
      lead_id: leadRow.id,
      briefing_id: briefing.id,
      kind: parsed.data.kind,
      html_content: html,
    })
    .select('id')
    .single();

  if (insertErr || !inserted) {
    return NextResponse.json({ ok: false, error: insertErr?.message ?? 'insert failed' }, { status: 500 });
  }

  await admin.from('crm_lead_events').insert({
    lead_id: leadRow.id,
    actor_id: session.crmUser.id,
    event_type: 'slides_generated',
    payload: {
      slide_deck_id: (inserted as { id: string }).id,
      kind: parsed.data.kind,
      storage_path: path,
    },
  });

  return NextResponse.json({
    ok: true,
    data: { id: (inserted as { id: string }).id, storage_path: path },
  });
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCrmSession } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { generateStructured } from '@/lib/anthropic';
import {
  DISCOVERY_SYSTEM,
  DISCOVERY_TOOL_NAME,
  DISCOVERY_TOOL_DESCRIPTION,
  DISCOVERY_INPUT_SCHEMA,
  buildDiscoveryUserPrompt,
} from '@/lib/prompts/discovery-briefing';
import { getLatestBriefing, nextBriefingVersion } from '@/lib/briefings';
import { getDiagram } from '@/lib/diagrams';
import { notifyBriefingReady } from '@/lib/notifications';
import type { BriefingDiscovery, DiagramEdge, DiagramNode } from '@/types/crm';

const BodySchema = z.object({
  lead_id: z.string().uuid(),
  transcription_id: z.string().uuid().optional(),
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

  const [triageBriefing, triageDiagram] = await Promise.all([
    getLatestBriefing(leadRow.id, 'triage'),
    getDiagram(leadRow.id, 'triage'),
  ]);
  if (!triageBriefing) {
    return NextResponse.json(
      { ok: false, error: 'briefing de triagem ainda não foi gerado' },
      { status: 412 },
    );
  }

  let transcriptionId = parsed.data.transcription_id ?? null;
  let transcriptionText: string;

  if (transcriptionId) {
    const { data: t } = await admin
      .from('crm_transcriptions')
      .select('id, raw_text')
      .eq('id', transcriptionId)
      .maybeSingle();
    if (!t) return NextResponse.json({ ok: false, error: 'transcription not found' }, { status: 404 });
    transcriptionText = (t as { raw_text: string }).raw_text;
  } else {
    const { data: t } = await admin
      .from('crm_transcriptions')
      .select('id, raw_text')
      .eq('lead_id', leadRow.id)
      .eq('kind', 'discovery_call')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!t) {
      return NextResponse.json(
        { ok: false, error: 'no discovery transcription found' },
        { status: 404 },
      );
    }
    const row = t as { id: string; raw_text: string };
    transcriptionId = row.id;
    transcriptionText = row.raw_text;
  }

  const userPrompt = buildDiscoveryUserPrompt({
    leadName: leadRow.name,
    companyName: leadRow.company_name,
    triageBriefing: triageBriefing.content_json,
    triageDiagram: triageDiagram ? { nodes: triageDiagram.nodes, edges: triageDiagram.edges } : null,
    discoveryTranscription: transcriptionText,
  });

  let result;
  try {
    result = await generateStructured<BriefingDiscovery>({
      system: DISCOVERY_SYSTEM,
      user: userPrompt,
      toolName: DISCOVERY_TOOL_NAME,
      toolDescription: DISCOVERY_TOOL_DESCRIPTION,
      inputSchema: DISCOVERY_INPUT_SCHEMA as unknown as Record<string, unknown>,
      maxTokens: 8192,
    });
  } catch (err) {
    console.error('[briefing/discovery] generate failed', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'generation failed' },
      { status: 500 },
    );
  }

  const version = await nextBriefingVersion(leadRow.id, 'discovery');

  const { data: briefingInserted, error: insertErr } = await admin
    .from('crm_briefings')
    .insert({
      lead_id: leadRow.id,
      kind: 'discovery',
      version,
      transcription_id: transcriptionId,
      content_json: result.data,
      ai_model: result.model,
      prompt_tokens: result.promptTokens,
      completion_tokens: result.completionTokens,
      generated_by: session.crmUser.id,
    })
    .select('id')
    .single();

  if (insertErr || !briefingInserted) {
    return NextResponse.json(
      { ok: false, error: insertErr?.message ?? 'insert failed' },
      { status: 500 },
    );
  }

  // Popula diagrama de solução (rascunho)
  const nodes: DiagramNode[] = result.data.nodes_diagrama_solucao ?? [];
  const edges: DiagramEdge[] = result.data.edges_diagrama_solucao ?? [];
  await admin.from('crm_diagrams').upsert(
    {
      lead_id: leadRow.id,
      kind: 'solution',
      nodes,
      edges,
      generated_by_ai: true,
      ai_model: result.model,
    },
    { onConflict: 'lead_id,kind' },
  );

  // Atualiza ticket no lead com soma das ondas
  const totalMin = result.data.ondas_propostas.reduce((s, o) => s + o.ticket_min, 0);
  const totalMax = result.data.ondas_propostas.reduce((s, o) => s + o.ticket_max, 0);
  if (totalMin > 0 || totalMax > 0) {
    await admin
      .from('crm_leads')
      .update({
        estimated_ticket_min: totalMin,
        estimated_ticket_max: totalMax,
      })
      .eq('id', leadRow.id);
  }

  await admin.from('crm_lead_events').insert({
    lead_id: leadRow.id,
    actor_id: session.crmUser.id,
    event_type: 'briefing_generated',
    payload: {
      briefing_id: (briefingInserted as { id: string }).id,
      kind: 'discovery',
      version,
      prompt_tokens: result.promptTokens,
      completion_tokens: result.completionTokens,
    },
  });

  await notifyBriefingReady({ leadId: leadRow.id, leadName: leadRow.name, kind: 'discovery' });

  return NextResponse.json({
    ok: true,
    data: { id: (briefingInserted as { id: string }).id, version },
  });
}

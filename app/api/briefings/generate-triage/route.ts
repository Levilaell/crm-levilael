import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCrmSession } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { generateStructured } from '@/lib/anthropic';
import {
  TRIAGE_SYSTEM,
  TRIAGE_TOOL_NAME,
  TRIAGE_TOOL_DESCRIPTION,
  TRIAGE_INPUT_SCHEMA,
  buildTriageUserPrompt,
} from '@/lib/prompts/triage-briefing';
import { nextBriefingVersion } from '@/lib/briefings';
import { notifyBriefingReady } from '@/lib/notifications';
import type { BriefingTriage, DiagramEdge, DiagramNode } from '@/types/crm';

const BodySchema = z.object({
  lead_id: z.string().uuid(),
  transcription_id: z.string().uuid().optional(),
  // override opcional: passar texto diretamente em vez de transcription_id
  transcription_text: z.string().min(50).optional(),
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
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 422 });
  }

  const admin = createServiceRoleClient();
  const { data: lead, error: leadErr } = await admin
    .from('crm_leads')
    .select('id, name, company_name, diagnosis_answers')
    .eq('id', parsed.data.lead_id)
    .maybeSingle();
  if (leadErr || !lead) {
    return NextResponse.json({ ok: false, error: 'lead not found' }, { status: 404 });
  }
  const leadRow = lead as {
    id: string;
    name: string;
    company_name: string | null;
    diagnosis_answers: Record<string, unknown> | null;
  };

  let transcriptionText = parsed.data.transcription_text ?? '';
  let transcriptionId = parsed.data.transcription_id ?? null;
  if (!transcriptionText) {
    let query = admin
      .from('crm_transcriptions')
      .select('id, raw_text')
      .eq('lead_id', leadRow.id)
      .eq('kind', 'triage_call')
      .order('created_at', { ascending: false })
      .limit(1);
    if (transcriptionId) {
      query = admin
        .from('crm_transcriptions')
        .select('id, raw_text')
        .eq('id', transcriptionId);
    }
    const { data: trans } = await query.maybeSingle();
    if (!trans) {
      return NextResponse.json(
        { ok: false, error: 'no triage transcription found' },
        { status: 404 },
      );
    }
    const row = trans as { id: string; raw_text: string };
    transcriptionText = row.raw_text;
    transcriptionId = row.id;
  }

  const userPrompt = buildTriageUserPrompt({
    leadName: leadRow.name,
    companyName: leadRow.company_name,
    diagnosisAnswers: leadRow.diagnosis_answers,
    transcription: transcriptionText,
  });

  let result;
  try {
    result = await generateStructured<BriefingTriage>({
      system: TRIAGE_SYSTEM,
      user: userPrompt,
      toolName: TRIAGE_TOOL_NAME,
      toolDescription: TRIAGE_TOOL_DESCRIPTION,
      inputSchema: TRIAGE_INPUT_SCHEMA as unknown as Record<string, unknown>,
      maxTokens: 8192,
    });
  } catch (err) {
    console.error('[briefing/triage] generate failed', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'generation failed' },
      { status: 500 },
    );
  }

  const version = await nextBriefingVersion(leadRow.id, 'triage');

  const { data: briefingInserted, error: insertErr } = await admin
    .from('crm_briefings')
    .insert({
      lead_id: leadRow.id,
      kind: 'triage',
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

  // Auto-popular diagrama de triagem (upsert)
  const nodes: DiagramNode[] = result.data.nodes_diagrama ?? [];
  const edges: DiagramEdge[] = result.data.edges_diagrama ?? [];

  await admin.from('crm_diagrams').upsert(
    {
      lead_id: leadRow.id,
      kind: 'triage',
      nodes,
      edges,
      generated_by_ai: true,
      ai_model: result.model,
    },
    { onConflict: 'lead_id,kind' },
  );

  // Persistir qualificação no lead (sem sobrescrever se já preenchida manualmente? — sobrescrever, IA tem visão mais recente)
  await admin
    .from('crm_leads')
    .update({
      qualification: result.data.qualificacao.nivel,
      qualification_reason: result.data.qualificacao.motivo,
      estimated_ticket_min: result.data.ticket_estimado.min,
      estimated_ticket_max: result.data.ticket_estimado.max,
    })
    .eq('id', leadRow.id);

  await admin.from('crm_lead_events').insert({
    lead_id: leadRow.id,
    actor_id: session.crmUser.id,
    event_type: 'briefing_generated',
    payload: {
      briefing_id: (briefingInserted as { id: string }).id,
      kind: 'triage',
      version,
      prompt_tokens: result.promptTokens,
      completion_tokens: result.completionTokens,
    },
  });

  await notifyBriefingReady({ leadId: leadRow.id, leadName: leadRow.name, kind: 'triage' });

  return NextResponse.json({
    ok: true,
    data: { id: (briefingInserted as { id: string }).id, version },
  });
}

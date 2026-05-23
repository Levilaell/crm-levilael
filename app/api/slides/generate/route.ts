import { NextResponse } from 'next/server';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { requireCrmSession } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { generateStructured, ANTHROPIC_MODEL } from '@/lib/anthropic';
import { logAIOperation } from '@/lib/ai-log';
import { getLatestBriefing } from '@/lib/briefings';
import {
  DISCOVERY_PREP_SYSTEM,
  DISCOVERY_PREP_TOOL_NAME,
  DISCOVERY_PREP_TOOL_DESCRIPTION,
  DISCOVERY_PREP_INPUT_SCHEMA,
  DiscoveryPrepDataSchema,
  buildDiscoveryPrepUserPrompt,
  type DiscoveryPrepData,
} from '@/lib/prompts/discovery-prep-pptx';
import { renderDiscoveryPrepPptx } from '@/lib/pptx/discovery-prep-template';
import {
  PROPOSAL_PPTX_SYSTEM,
  PROPOSAL_PPTX_TOOL_NAME,
  PROPOSAL_PPTX_TOOL_DESCRIPTION,
  PROPOSAL_PPTX_INPUT_SCHEMA,
  ProposalPptxDataSchema,
  buildProposalPptxUserPrompt,
  type ProposalPptxData,
} from '@/lib/prompts/proposal-pptx';
import { renderProposalPptx } from '@/lib/pptx/proposal-template';

const BodySchema = z.object({
  lead_id: z.string().uuid(),
  kind: z.enum(['discovery_prep', 'proposal']),
});

const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

export const maxDuration = 300;

type TriageContent = { perfil_decisor?: { nome?: string | null } };

function resolveMesAno(): string {
  const raw = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

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
  const { data: lead } = await admin
    .from('crm_leads')
    .select('id, name, company_name')
    .eq('id', parsed.data.lead_id)
    .maybeSingle();
  if (!lead) {
    return NextResponse.json({ ok: false, error: 'lead not found' }, { status: 404 });
  }
  const leadRow = lead as { id: string; name: string; company_name: string | null };

  const companyName = leadRow.company_name?.trim() || leadRow.name;
  const mesAno = resolveMesAno();

  let pptxBuffer: Buffer;
  let sourceBriefingId: string;
  let operation: 'slides_discovery_prep' | 'slides_proposal';
  let model = ANTHROPIC_MODEL;
  let promptTokens = 0;
  let completionTokens = 0;
  const startedAt = Date.now();

  try {
    if (parsed.data.kind === 'discovery_prep') {
      operation = 'slides_discovery_prep';
      const triage = await getLatestBriefing(leadRow.id, 'triage');
      if (!triage) {
        return NextResponse.json(
          { ok: false, error: 'briefing de triagem ainda não foi gerado' },
          { status: 412 },
        );
      }
      const triageContent = triage.content_json as unknown as TriageContent;
      const contato = triageContent?.perfil_decisor?.nome?.trim() || leadRow.name;

      const result = await generateStructured<DiscoveryPrepData>({
        system: DISCOVERY_PREP_SYSTEM,
        user: buildDiscoveryPrepUserPrompt({
          leadName: leadRow.name,
          companyName,
          contato,
          mesAno,
          triageBriefing: triage.content_json,
        }),
        toolName: DISCOVERY_PREP_TOOL_NAME,
        toolDescription: DISCOVERY_PREP_TOOL_DESCRIPTION,
        inputSchema: DISCOVERY_PREP_INPUT_SCHEMA as unknown as Record<string, unknown>,
        maxTokens: 8192,
        validate: (input) => DiscoveryPrepDataSchema.parse(input),
      });
      model = result.model;
      promptTokens = result.promptTokens;
      completionTokens = result.completionTokens;
      pptxBuffer = await renderDiscoveryPrepPptx(result.data);
      sourceBriefingId = triage.id;
    } else {
      operation = 'slides_proposal';
      const [discovery, triage] = await Promise.all([
        getLatestBriefing(leadRow.id, 'discovery'),
        getLatestBriefing(leadRow.id, 'triage'),
      ]);
      if (!discovery) {
        return NextResponse.json(
          { ok: false, error: 'briefing de descoberta ainda não foi gerado' },
          { status: 412 },
        );
      }
      if (!triage) {
        return NextResponse.json(
          { ok: false, error: 'briefing de triagem ainda não foi gerado' },
          { status: 412 },
        );
      }
      const triageContent = triage.content_json as unknown as TriageContent;
      const contato = triageContent?.perfil_decisor?.nome?.trim() || leadRow.name;

      const result = await generateStructured<ProposalPptxData>({
        system: PROPOSAL_PPTX_SYSTEM,
        user: buildProposalPptxUserPrompt({
          leadName: leadRow.name,
          companyName,
          contato,
          mesAno,
          triageBriefing: triage.content_json,
          discoveryBriefing: discovery.content_json,
        }),
        toolName: PROPOSAL_PPTX_TOOL_NAME,
        toolDescription: PROPOSAL_PPTX_TOOL_DESCRIPTION,
        inputSchema: PROPOSAL_PPTX_INPUT_SCHEMA as unknown as Record<string, unknown>,
        maxTokens: 8192,
        validate: (input) => ProposalPptxDataSchema.parse(input),
      });
      model = result.model;
      promptTokens = result.promptTokens;
      completionTokens = result.completionTokens;
      pptxBuffer = await renderProposalPptx(result.data);
      sourceBriefingId = discovery.id;
    }
  } catch (err) {
    await logAIOperation({
      leadId: leadRow.id,
      operation: parsed.data.kind === 'discovery_prep' ? 'slides_discovery_prep' : 'slides_proposal',
      provider: 'anthropic',
      model,
      durationMs: Date.now() - startedAt,
      success: false,
      errorMessage: err instanceof Error ? err.message : 'unknown',
    });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'generation failed' },
      { status: 500 },
    );
  }
  const durationMs = Date.now() - startedAt;

  const path = `${leadRow.id}/${parsed.data.kind}_${Date.now()}.pptx`;
  const { error: uploadErr } = await admin.storage
    .from('crm_slides')
    .upload(path, new Blob([new Uint8Array(pptxBuffer)], { type: PPTX_MIME }), {
      contentType: PPTX_MIME,
      upsert: false,
    });
  if (uploadErr) {
    return NextResponse.json(
      { ok: false, error: `upload falhou: ${uploadErr.message}` },
      { status: 500 },
    );
  }

  const { data: inserted, error: insertErr } = await admin
    .from('crm_slide_decks')
    .insert({
      lead_id: leadRow.id,
      briefing_id: sourceBriefingId,
      kind: parsed.data.kind,
      pptx_storage_path: path,
    })
    .select('id')
    .single();
  if (insertErr || !inserted) {
    return NextResponse.json(
      { ok: false, error: insertErr?.message ?? 'insert failed' },
      { status: 500 },
    );
  }
  const deckId = (inserted as { id: string }).id;

  await admin.from('crm_lead_events').insert({
    lead_id: leadRow.id,
    actor_id: session.crmUser.id,
    event_type: 'slides_generated',
    payload: { slide_deck_id: deckId, kind: parsed.data.kind, storage_path: path },
  });

  await logAIOperation({
    leadId: leadRow.id,
    operation,
    provider: 'anthropic',
    model,
    promptTokens,
    completionTokens,
    durationMs,
    success: true,
  });

  return NextResponse.json({ ok: true, data: { id: deckId, storage_path: path } });
}

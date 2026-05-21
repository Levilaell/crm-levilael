import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCrmSession } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { generateText, ANTHROPIC_MODEL } from '@/lib/anthropic';
import { logAIOperation } from '@/lib/ai-log';
import {
  DISCOVERY_SCRIPT_SYSTEM,
  buildDiscoveryScriptUserPrompt,
} from '@/lib/prompts/discovery-script';
import { getLatestBriefing, nextBriefingVersion } from '@/lib/briefings';

const BodySchema = z.object({
  lead_id: z.string().uuid(),
});

export const maxDuration = 180;

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

  const triageBriefing = await getLatestBriefing(leadRow.id, 'triage');
  if (!triageBriefing) {
    return NextResponse.json(
      { ok: false, error: 'gere o briefing de triagem primeiro' },
      { status: 412 },
    );
  }

  const user = buildDiscoveryScriptUserPrompt({
    leadName: leadRow.name,
    companyName: leadRow.company_name,
    triageBriefingJson: triageBriefing.content_json,
  });

  let result;
  const startedAt = Date.now();
  try {
    result = await generateText({
      system: DISCOVERY_SCRIPT_SYSTEM,
      user,
      maxTokens: 4096,
    });
  } catch (err) {
    await logAIOperation({
      leadId: leadRow.id,
      operation: 'discovery_script',
      provider: 'anthropic',
      model: ANTHROPIC_MODEL,
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

  const version = await nextBriefingVersion(leadRow.id, 'discovery_script');
  const { data: inserted, error } = await admin
    .from('crm_briefings')
    .insert({
      lead_id: leadRow.id,
      kind: 'discovery_script',
      version,
      content_json: { markdown: result.text },
      content_markdown: result.text,
      ai_model: result.model,
      prompt_tokens: result.promptTokens,
      completion_tokens: result.completionTokens,
      generated_by: session.crmUser.id,
    })
    .select('id')
    .single();

  if (error || !inserted) {
    return NextResponse.json({ ok: false, error: error?.message ?? 'insert failed' }, { status: 500 });
  }

  await admin.from('crm_lead_events').insert({
    lead_id: leadRow.id,
    actor_id: session.crmUser.id,
    event_type: 'script_generated',
    payload: {
      kind: 'discovery_script',
      version,
      prompt_tokens: result.promptTokens,
      completion_tokens: result.completionTokens,
    },
  });

  await logAIOperation({
    leadId: leadRow.id,
    operation: 'discovery_script',
    provider: 'anthropic',
    model: result.model,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
    durationMs,
    success: true,
  });

  return NextResponse.json({
    ok: true,
    data: { id: (inserted as { id: string }).id, markdown: result.text, version },
  });
}

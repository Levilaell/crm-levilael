import { createServiceRoleClient } from '@/lib/supabase/service';

// Custos em USD. Atualizar quando os preços mudarem ou trocar modelo.
// Anthropic: por 1M tokens. Whisper: por minuto.
const COSTS_USD: Record<
  string,
  { input?: number; output?: number; perMinute?: number }
> = {
  'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  'claude-opus-4-7': { input: 15.0, output: 75.0 },
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4.0 },
  'whisper-1': { perMinute: 0.006 },
};

// Taxa de conversão hardcoded — preço pra acompanhar magnitude, não pra contábil.
const USD_TO_BRL = 5.5;

export type AIOperation =
  | 'briefing_triage'
  | 'briefing_discovery'
  | 'discovery_script'
  | 'proposal_script'
  | 'slides_discovery_prep'
  | 'slides_proposal'
  | 'whisper_transcription';

export type AIProvider = 'anthropic' | 'openai';

interface LogArgs {
  leadId?: string | null;
  operation: AIOperation;
  provider: AIProvider;
  model: string;
  promptTokens?: number | null;
  completionTokens?: number | null;
  audioDurationSeconds?: number | null;
  durationMs: number;
  success: boolean;
  errorMessage?: string | null;
}

export function estimateCostBRL(args: {
  model: string;
  promptTokens?: number | null;
  completionTokens?: number | null;
  audioDurationSeconds?: number | null;
}): number {
  const config = COSTS_USD[args.model];
  if (!config) return 0;

  let usd = 0;
  if (config.input && args.promptTokens) {
    usd += (args.promptTokens / 1_000_000) * config.input;
  }
  if (config.output && args.completionTokens) {
    usd += (args.completionTokens / 1_000_000) * config.output;
  }
  if (config.perMinute && args.audioDurationSeconds) {
    usd += (args.audioDurationSeconds / 60) * config.perMinute;
  }
  return Number((usd * USD_TO_BRL).toFixed(4));
}

/**
 * Loga uma operação de IA em crm_ai_logs. Nunca lança — falha de log
 * não pode quebrar o fluxo principal.
 */
export async function logAIOperation(args: LogArgs): Promise<void> {
  try {
    const admin = createServiceRoleClient();
    const cost = estimateCostBRL({
      model: args.model,
      promptTokens: args.promptTokens,
      completionTokens: args.completionTokens,
      audioDurationSeconds: args.audioDurationSeconds,
    });
    await admin.from('crm_ai_logs').insert({
      lead_id: args.leadId ?? null,
      operation: args.operation,
      provider: args.provider,
      model: args.model,
      prompt_tokens: args.promptTokens ?? null,
      completion_tokens: args.completionTokens ?? null,
      audio_duration_seconds: args.audioDurationSeconds ?? null,
      cost_brl_estimated: cost,
      duration_ms: args.durationMs,
      success: args.success,
      error_message: args.errorMessage ?? null,
    });
  } catch (err) {
    console.error('[ai-log] insert failed', err);
  }
}

// ============================================================================
// Helpers de consulta pro dashboard
// ============================================================================

export interface AIUsageSummary {
  totalCostBrlMonth: number;
  byOperation: Record<string, { cost: number; count: number }>;
  topLeads: Array<{ lead_id: string; lead_name: string; cost: number; count: number }>;
  daily: Array<{ day: string; cost: number }>;
}

export async function getAIUsageSummary(): Promise<AIUsageSummary> {
  const admin = createServiceRoleClient();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: monthLogs }, { data: dailyLogs }] = await Promise.all([
    admin
      .from('crm_ai_logs')
      .select('operation, cost_brl_estimated, lead_id, crm_leads(name)')
      .gte('created_at', startOfMonth)
      .eq('success', true),
    admin
      .from('crm_ai_logs')
      .select('created_at, cost_brl_estimated')
      .gte('created_at', last30Days)
      .eq('success', true),
  ]);

  let totalCostBrlMonth = 0;
  const byOperation: Record<string, { cost: number; count: number }> = {};
  const leadAgg: Record<string, { name: string; cost: number; count: number }> = {};

  for (const raw of monthLogs ?? []) {
    const row = raw as unknown as {
      operation: string;
      cost_brl_estimated: number | null;
      lead_id: string | null;
      crm_leads: { name: string } | { name: string }[] | null;
    };
    const cost = Number(row.cost_brl_estimated ?? 0);
    totalCostBrlMonth += cost;
    const op = row.operation;
    if (!byOperation[op]) byOperation[op] = { cost: 0, count: 0 };
    byOperation[op].cost += cost;
    byOperation[op].count++;

    if (row.lead_id) {
      const leadName = Array.isArray(row.crm_leads)
        ? row.crm_leads[0]?.name
        : row.crm_leads?.name;
      const entry = leadAgg[row.lead_id] ?? { name: leadName ?? '—', cost: 0, count: 0 };
      entry.cost += cost;
      entry.count++;
      leadAgg[row.lead_id] = entry;
    }
  }

  const topLeads = Object.entries(leadAgg)
    .map(([lead_id, v]) => ({ lead_id, lead_name: v.name, cost: v.cost, count: v.count }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 10);

  // Agrega por dia
  const dailyMap: Record<string, number> = {};
  for (const raw of dailyLogs ?? []) {
    const row = raw as { created_at: string; cost_brl_estimated: number | null };
    const day = row.created_at.slice(0, 10);
    dailyMap[day] = (dailyMap[day] ?? 0) + Number(row.cost_brl_estimated ?? 0);
  }
  // Preencher dias faltantes com 0
  const daily: Array<{ day: string; cost: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const day = d.toISOString().slice(0, 10);
    daily.push({ day, cost: Number((dailyMap[day] ?? 0).toFixed(2)) });
  }

  return {
    totalCostBrlMonth: Number(totalCostBrlMonth.toFixed(2)),
    byOperation,
    topLeads,
    daily,
  };
}

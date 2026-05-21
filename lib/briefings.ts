import { createServiceRoleClient } from '@/lib/supabase/service';
import type { BriefingKind } from '@/types/crm';

export interface BriefingRow {
  id: string;
  lead_id: string;
  kind: BriefingKind;
  version: number;
  transcription_id: string | null;
  content_json: Record<string, unknown>;
  content_markdown: string | null;
  ai_model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  generated_at: string;
  generated_by: string | null;
}

const COLS =
  'id, lead_id, kind, version, transcription_id, content_json, content_markdown, ai_model, prompt_tokens, completion_tokens, generated_at, generated_by';

export async function listBriefings(leadId: string, kind: BriefingKind): Promise<BriefingRow[]> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from('crm_briefings')
    .select(COLS)
    .eq('lead_id', leadId)
    .eq('kind', kind)
    .order('version', { ascending: false });
  if (error) {
    console.error('[briefings] list failed', error);
    return [];
  }
  return (data ?? []) as BriefingRow[];
}

export async function getLatestBriefing(
  leadId: string,
  kind: BriefingKind,
): Promise<BriefingRow | null> {
  const list = await listBriefings(leadId, kind);
  return list[0] ?? null;
}

export async function nextBriefingVersion(leadId: string, kind: BriefingKind): Promise<number> {
  const latest = await getLatestBriefing(leadId, kind);
  return latest ? latest.version + 1 : 1;
}

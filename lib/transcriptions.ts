import { createServiceRoleClient } from '@/lib/supabase/service';
import type { TranscriptionKind } from '@/types/crm';

export interface TranscriptionRow {
  id: string;
  lead_id: string;
  kind: TranscriptionKind;
  source_type: 'audio_upload' | 'text_paste';
  audio_storage_path: string | null;
  raw_text: string;
  word_count: number | null;
  duration_seconds: number | null;
  created_at: string;
  created_by: string | null;
}

const COLS =
  'id, lead_id, kind, source_type, audio_storage_path, raw_text, word_count, duration_seconds, created_at, created_by';

export async function listTranscriptions(
  leadId: string,
  kind?: TranscriptionKind,
): Promise<TranscriptionRow[]> {
  const admin = createServiceRoleClient();
  let q = admin
    .from('crm_transcriptions')
    .select(COLS)
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });
  if (kind) q = q.eq('kind', kind);
  const { data, error } = await q;
  if (error) {
    console.error('[transcriptions] list failed', error);
    return [];
  }
  return (data ?? []) as TranscriptionRow[];
}

import { createServiceRoleClient } from '@/lib/supabase/service';

export interface SlideDeckRow {
  id: string;
  lead_id: string;
  kind: 'discovery_prep' | 'proposal';
  briefing_id: string | null;
  pptx_storage_path: string | null;
  created_at: string;
}

export async function listSlideDecks(
  leadId: string,
  kind?: 'discovery_prep' | 'proposal',
): Promise<SlideDeckRow[]> {
  const admin = createServiceRoleClient();
  let q = admin
    .from('crm_slide_decks')
    .select('id, lead_id, kind, briefing_id, pptx_storage_path, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });
  if (kind) q = q.eq('kind', kind);
  const { data, error } = await q;
  if (error) return [];
  return (data ?? []) as SlideDeckRow[];
}

import { createServiceRoleClient } from '@/lib/supabase/service';
import type { DiagramKind, DiagramNode, DiagramEdge } from '@/types/crm';

export interface DiagramRow {
  id: string;
  lead_id: string;
  kind: DiagramKind;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  generated_by_ai: boolean;
  ai_model: string | null;
  created_at: string;
  updated_at: string;
}

export async function getDiagram(leadId: string, kind: DiagramKind): Promise<DiagramRow | null> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from('crm_diagrams')
    .select('id, lead_id, kind, nodes, edges, generated_by_ai, ai_model, created_at, updated_at')
    .eq('lead_id', leadId)
    .eq('kind', kind)
    .maybeSingle();
  if (error) {
    console.error('[diagrams] get failed', error);
    return null;
  }
  return (data ?? null) as DiagramRow | null;
}

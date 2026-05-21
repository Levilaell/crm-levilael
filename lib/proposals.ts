import { createServiceRoleClient } from '@/lib/supabase/service';
import type { ProposalStatus } from '@/types/crm';

export interface ProposalWave {
  numero: number;
  titulo: string;
  escopo: string;
  dor_resolvida: string;
  ticket_min: number;
  ticket_max: number;
  duracao_semanas_min: number;
  duracao_semanas_max: number;
  prioridade: 'alta' | 'media' | 'baixa';
}

export interface ProposalRow {
  id: string;
  lead_id: string;
  total_value_min: number | null;
  total_value_max: number | null;
  waves: ProposalWave[] | null;
  status: ProposalStatus;
  sent_at: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getProposal(leadId: string): Promise<ProposalRow | null> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from('crm_proposals')
    .select('id, lead_id, total_value_min, total_value_max, waves, status, sent_at, decided_at, created_at, updated_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return (data ?? null) as ProposalRow | null;
}

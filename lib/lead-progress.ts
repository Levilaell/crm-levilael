import { createServiceRoleClient } from '@/lib/supabase/service';

// ============================================================================
// Status agregado das abas do lead — usado nos chips das tabs (LeadTabs).
//
// Regras:
//   triage:    done  = tem briefing de triagem
//              in_progress = tem transcrição mas ainda não briefing
//              empty = nada
//
//   discovery: done  = tem briefing de descoberta
//              in_progress = tem script OU transcrição
//              empty = nada
//
//   solution:  done  = tem PPTX de proposta + script da call de proposta
//              in_progress = tem ao menos um dos dois
//              empty = nada
// ============================================================================

export type ProgressState = 'empty' | 'in_progress' | 'done';

export interface LeadProgress {
  triage: ProgressState;
  discovery: ProgressState;
  solution: ProgressState;
}

async function countRows(
  admin: ReturnType<typeof createServiceRoleClient>,
  table: 'crm_transcriptions' | 'crm_briefings' | 'crm_slide_decks',
  leadId: string,
  kind: string,
): Promise<number> {
  const { count } = await admin
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('lead_id', leadId)
    .eq('kind', kind);
  return count ?? 0;
}

export async function getLeadProgress(leadId: string): Promise<LeadProgress> {
  const admin = createServiceRoleClient();

  const [
    triageTr,
    triageBr,
    discoveryTr,
    discoveryScript,
    discoveryBr,
    proposalScript,
    proposalDeck,
  ] = await Promise.all([
    countRows(admin, 'crm_transcriptions', leadId, 'triage_call'),
    countRows(admin, 'crm_briefings', leadId, 'triage'),
    countRows(admin, 'crm_transcriptions', leadId, 'discovery_call'),
    countRows(admin, 'crm_briefings', leadId, 'discovery_script'),
    countRows(admin, 'crm_briefings', leadId, 'discovery'),
    countRows(admin, 'crm_briefings', leadId, 'solution_draft'),
    countRows(admin, 'crm_slide_decks', leadId, 'proposal'),
  ]);

  const triage: ProgressState =
    triageBr > 0 ? 'done' : triageTr > 0 ? 'in_progress' : 'empty';

  const discovery: ProgressState =
    discoveryBr > 0
      ? 'done'
      : discoveryScript > 0 || discoveryTr > 0
        ? 'in_progress'
        : 'empty';

  const solution: ProgressState =
    proposalScript > 0 && proposalDeck > 0
      ? 'done'
      : proposalScript > 0 || proposalDeck > 0
        ? 'in_progress'
        : 'empty';

  return { triage, discovery, solution };
}

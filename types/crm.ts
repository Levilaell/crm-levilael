// Tipos compartilhados do CRM. Espelham o schema SQL.
// `lib/supabase/types.ts` é o tipo gerado pelo `supabase gen types` — quando
// estiver disponível, este arquivo importa de lá. Por ora, manter ambos.

export type LeadStage =
  | 'new'
  | 'contact_tried'
  | 'triage_scheduled'
  | 'triage_done'
  | 'discovery_scheduled'
  | 'discovery_done'
  | 'proposal_sent'
  | 'negotiation'
  | 'won'
  | 'lost';

export const LEAD_STAGES: readonly LeadStage[] = [
  'new',
  'contact_tried',
  'triage_scheduled',
  'triage_done',
  'discovery_scheduled',
  'discovery_done',
  'proposal_sent',
  'negotiation',
  'won',
  'lost',
] as const;

export const STAGE_LABELS: Record<LeadStage, string> = {
  new: 'Novo',
  contact_tried: 'Em contato',
  triage_scheduled: 'Triagem agendada',
  triage_done: 'Triagem feita',
  discovery_scheduled: 'Descoberta agendada',
  discovery_done: 'Descoberta feita',
  proposal_sent: 'Proposta enviada',
  negotiation: 'Negociação',
  won: 'Ganho',
  lost: 'Perdido',
};

// Colunas do kanban (agrupa won + lost na última)
export type KanbanColumn =
  | 'new'
  | 'contact_tried'
  | 'triage'
  | 'discovery'
  | 'proposal'
  | 'closed';

export const KANBAN_COLUMNS: readonly KanbanColumn[] = [
  'new',
  'contact_tried',
  'triage',
  'discovery',
  'proposal',
  'closed',
] as const;

export const KANBAN_COLUMN_LABELS: Record<KanbanColumn, string> = {
  new: 'Novos',
  contact_tried: 'Em contato',
  triage: 'Triagem',
  discovery: 'Descoberta',
  proposal: 'Proposta',
  closed: 'Fechados',
};

export function stageToColumn(stage: LeadStage): KanbanColumn {
  if (stage === 'new') return 'new';
  if (stage === 'contact_tried') return 'contact_tried';
  if (stage === 'triage_scheduled' || stage === 'triage_done') return 'triage';
  if (stage === 'discovery_scheduled' || stage === 'discovery_done') return 'discovery';
  if (stage === 'proposal_sent' || stage === 'negotiation') return 'proposal';
  return 'closed';
}

export type Qualification = 'AAA' | 'AA' | 'A' | 'B' | 'C';

export const QUALIFICATIONS: readonly Qualification[] = ['AAA', 'AA', 'A', 'B', 'C'] as const;

export const QUALIFICATION_COLORS: Record<Qualification, string> = {
  AAA: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  AA: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  A: 'bg-blue-500/15 text-blue-300 border-blue-500/40',
  B: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  C: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/40',
};

export type LeadSource = 'diagnosis' | 'calcom' | 'manual' | 'telegram' | 'referral';

export const LEAD_SOURCES: readonly LeadSource[] = [
  'diagnosis',
  'calcom',
  'manual',
  'telegram',
  'referral',
] as const;

export const SOURCE_LABELS: Record<LeadSource, string> = {
  diagnosis: 'Diagnóstico',
  calcom: 'Cal.com',
  manual: 'Manual',
  telegram: 'Telegram',
  referral: 'Indicação',
};

export type UserRole = 'admin' | 'operator';

export type DiagramKind = 'triage' | 'discovery' | 'solution';
export type BriefingKind = 'triage' | 'discovery' | 'solution_draft' | 'discovery_script';
export type TranscriptionKind = 'triage_call' | 'discovery_call' | 'other';
export type TaskStatus = 'open' | 'doing' | 'done' | 'blocked';
export type ProposalStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'revised';

// ============================================================================
// React Flow diagram types
// ============================================================================

export type DiagramNodeType =
  | 'office'
  | 'system'
  | 'team'
  | 'process'
  | 'pain'
  | 'signal'
  | 'hypothesis'
  | 'question'
  | 'decision_maker'
  | 'risk'
  | 'slide_ref'
  | 'data_source'
  | 'integration'
  | 'processing'
  | 'destination'
  | 'human_review'
  | 'deliverable';

export const DIAGRAM_NODE_TYPES: readonly DiagramNodeType[] = [
  'office',
  'system',
  'team',
  'process',
  'pain',
  'signal',
  'hypothesis',
  'question',
  'decision_maker',
  'risk',
  'slide_ref',
  'data_source',
  'integration',
  'processing',
  'destination',
  'human_review',
  'deliverable',
] as const;

export type Severity = 'alta' | 'media' | 'baixa';

export interface DiagramNodeData {
  label: string;
  description?: string;
  severity?: Severity;
  [key: string]: unknown;
}

export interface DiagramNode {
  id: string;
  type: DiagramNodeType;
  position: { x: number; y: number };
  data: DiagramNodeData;
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: 'default' | 'smoothstep' | 'step';
  animated?: boolean;
}

// ============================================================================
// Briefing content shapes
// ============================================================================

export interface BriefingTriage {
  resumo_executivo: string;
  porte: {
    clientes_ativos: number | null;
    funcionarios: {
      clt: number | null;
      estagiarios: number | null;
      socios: number | null;
    };
    erp_atual: string | null;
    infra: 'cloud' | 'on_premise' | 'hybrid' | 'unknown';
  };
  perfil_decisor: {
    nome: string | null;
    papel: string | null;
    momento: string;
    autoridade: 'unica' | 'compartilhada' | 'desconhecida';
  };
  dores_mapeadas: Array<{
    titulo: string;
    descricao: string;
    severidade: Severity;
    onda_relacionada: number | null;
  }>;
  sinais: Array<{
    tipo: 'crescimento' | 'orcamento' | 'urgencia' | 'tecnologico' | 'outro';
    descricao: string;
  }>;
  qualificacao: {
    nivel: Qualification;
    motivo: string;
  };
  ticket_estimado: { min: number; max: number };
  proximas_perguntas: string[];
  riscos: string[];
  nodes_diagrama: DiagramNode[];
  edges_diagrama: DiagramEdge[];
}

export interface BriefingDiscovery {
  resumo_executivo: string;
  confirmacoes: Array<{
    pergunta: string;
    resposta: string;
    impacto_proposta: string;
  }>;
  decisores_envolvidos: Array<{
    nome: string;
    papel: string;
    posicao: 'aliado' | 'cetico' | 'neutro';
  }>;
  ondas_propostas: Array<{
    numero: number;
    titulo: string;
    escopo: string;
    dor_resolvida: string;
    ticket_min: number;
    ticket_max: number;
    duracao_semanas_min: number;
    duracao_semanas_max: number;
    prioridade: 'alta' | 'media' | 'baixa';
  }>;
  contexto_estrategico: string;
  riscos_proposta: string[];
  proximo_passo: string;
  rascunho_proposta: string;
  nodes_diagrama_solucao: DiagramNode[];
  edges_diagrama_solucao: DiagramEdge[];
}

// ============================================================================
// Webhook payload (site → CRM)
// ============================================================================

export interface WebhookLeadPayload {
  source: LeadSource;
  source_lead_id?: string;
  name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  role_title?: string;
  diagnosis_score?: number;
  diagnosis_answers?: Record<string, unknown>;
}

// ============================================================================
// API result wrapper
// ============================================================================

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

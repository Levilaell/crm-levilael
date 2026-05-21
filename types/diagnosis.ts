// Tipos do diagnóstico do site, derivados de samples/diagnosis_real.json.
// O site é fonte da verdade — se uma pergunta nova for adicionada lá,
// precisa entrar aqui também (e o webhook continua aceitando jsonb genérico,
// só a UI deixa de mostrar bonito).

export interface DiagnosisAnswers {
  // identificação (pode vir junto se o site mandar tudo)
  name?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  company?: string | null;

  // perguntas estruturadas
  q1_size?: string | null;
  q2_business_model?: string | null;
  q2_business_model_other?: string | null;
  q2_erp?: string | null;
  q3_pain_areas?: string[] | null;
  q3_client_profile?: string | null;
  q4_tech_maturity?: string | null;
  q5_hours_weekly?: string | null;
  q6_automation_history?: string | null;
  q7_main_goal?: string | null;
  q8_timeline?: string | null;
  q9_budget?: string | null;
  q10_revenue?: string | null;
  q10_employees?: string | null;
}

export interface DiagnosisOpportunity {
  titulo: string;
  descricao: string;
  complexidade: 'baixa' | 'media' | 'alta';
  impacto_estimado: string;
  prazo_implementacao: string;
}

export interface DiagnosisAIAnalysis {
  diagnostico_resumido?: string;
  gargalo_principal?: {
    area: string;
    descricao: string;
    impacto_estimado: string;
  };
  alerta_estrategico?: string;
  tres_oportunidades?: DiagnosisOpportunity[];
  plano_30_60_90?: {
    '30_dias': string;
    '60_dias': string;
    '90_dias': string;
  };
  proximo_passo_recomendado?: {
    abordagem: string;
    justificativa: string;
  };
}

// ============================================================================
// Labels em PT-BR pra cada pergunta. Quando o valor não cair num enum
// conhecido, o componente cai no humanize() do snake_case.
// ============================================================================

export const QUESTION_LABELS: Record<string, string> = {
  q1_size: 'Tamanho da carteira',
  q2_business_model: 'Modelo de negócio',
  q2_business_model_other: 'Modelo (outro)',
  q2_erp: 'ERP usado',
  q3_pain_areas: 'Áreas de dor',
  q3_client_profile: 'Perfil dos clientes',
  q4_tech_maturity: 'Maturidade tecnológica',
  q5_hours_weekly: 'Horas/sem em tarefas repetitivas',
  q6_automation_history: 'Histórico de automação',
  q7_main_goal: 'Objetivo principal',
  q8_timeline: 'Timeline',
  q9_budget: 'Orçamento',
  q10_revenue: 'Faturamento',
  q10_employees: 'Funcionários',
};

export const Q1_SIZE_LABELS: Record<string, string> = {
  '1_a_5': '1 a 5 clientes',
  '6_a_15': '6 a 15 clientes',
  '16_a_30': '16 a 30 clientes',
  '30_a_100': '30 a 100 clientes',
  '100_plus': 'Mais de 100 clientes',
};

export const Q2_ERP_LABELS: Record<string, string> = {
  dominio: 'Domínio',
  alterdata: 'Alterdata',
  sage: 'Sage',
  fortes: 'Fortes',
  questor: 'Questor',
  contmatic: 'Contmatic',
  prosoft: 'Prosoft',
  outro: 'Outro',
  nenhum: 'Nenhum',
};

export const Q3_PAIN_AREAS_LABELS: Record<string, string> = {
  cobranca: 'Cobrança de documentos',
  lancamentos: 'Lançamentos fiscais',
  atendimento: 'Atendimento ao cliente',
  triagem: 'Triagem de documentos',
  conciliacao: 'Conciliação bancária',
  folha: 'Folha de pagamento',
  obrigacoes: 'Obrigações acessórias',
  relatorios: 'Relatórios e indicadores',
};

export const Q3_CLIENT_PROFILE_LABELS: Record<string, string> = {
  simples: 'Simples Nacional',
  lucro_presumido: 'Lucro Presumido',
  lucro_real: 'Lucro Real',
  mei: 'MEI',
  mista: 'Carteira mista',
};

export const Q5_HOURS_WEEKLY_LABELS: Record<string, string> = {
  '0_a_5': '0 a 5h/sem',
  '5_a_10': '5 a 10h/sem',
  '10_a_25': '10 a 25h/sem',
  '25_a_40': '25 a 40h/sem',
  '40_plus': 'Mais de 40h/sem',
};

export const Q6_AUTOMATION_HISTORY_LABELS: Record<string, string> = {
  nunca: 'Nunca tentou',
  tentei_sem_sucesso: 'Tentou sem sucesso',
  fizemos_algo: 'Fizemos alguma coisa',
  varias_automacoes: 'Várias automações em produção',
};

export const Q8_TIMELINE_LABELS: Record<string, string> = {
  urgente: 'Urgente',
  proximo_mes: 'Próximo mês',
  '3_meses': 'Próximos 3 meses',
  'sem_prazo': 'Sem prazo definido',
};

export const Q4_TECH_MATURITY_LABELS: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
};

export const Q9_BUDGET_LABELS: Record<string, string> = {
  ate_5k: 'Até R$ 5k',
  '5k_a_15k': 'R$ 5k a 15k',
  '15k_a_30k': 'R$ 15k a 30k',
  '30k_plus': 'Acima de R$ 30k',
  nao_definido: 'Não definido',
};

// Helper: humaniza valor desconhecido. ex: "tentei_sem_sucesso" → "Tentei sem sucesso"
export function humanize(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
}

// Helper: pega label de um valor consultando o mapa correto pela chave da pergunta
export function labelForAnswer(questionKey: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const map = QUESTION_VALUE_MAPS[questionKey];
  if (typeof value === 'string') {
    return map?.[value] ?? humanize(value);
  }
  if (Array.isArray(value)) {
    return value.map((v) => (typeof v === 'string' ? (map?.[v] ?? humanize(v)) : String(v))).join(', ');
  }
  return String(value);
}

const QUESTION_VALUE_MAPS: Record<string, Record<string, string>> = {
  q1_size: Q1_SIZE_LABELS,
  q2_erp: Q2_ERP_LABELS,
  q3_pain_areas: Q3_PAIN_AREAS_LABELS,
  q3_client_profile: Q3_CLIENT_PROFILE_LABELS,
  q4_tech_maturity: Q4_TECH_MATURITY_LABELS,
  q5_hours_weekly: Q5_HOURS_WEEKLY_LABELS,
  q6_automation_history: Q6_AUTOMATION_HISTORY_LABELS,
  q8_timeline: Q8_TIMELINE_LABELS,
  q9_budget: Q9_BUDGET_LABELS,
};

// Ordem canônica de exibição (perguntas que conhecemos)
export const QUESTION_ORDER: string[] = [
  'q1_size',
  'q3_client_profile',
  'q2_erp',
  'q5_hours_weekly',
  'q3_pain_areas',
  'q6_automation_history',
  'q8_timeline',
  'q9_budget',
  'q4_tech_maturity',
  'q2_business_model',
  'q2_business_model_other',
  'q7_main_goal',
  'q10_revenue',
  'q10_employees',
];

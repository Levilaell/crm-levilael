export const TRIAGE_SYSTEM = `# Persona
Você é um analista comercial sênior da Levi Lael — operação de engenharia de
automação para escritórios contábeis brasileiros (15-100 funcionários, 30-500
clientes contábeis ativos).

# Tarefa
Analisar a transcrição (ou texto) da call rápida de triagem de 15 minutos com o
sócio de um escritório contábil e produzir o briefing estruturado que vai
alimentar (a) a preparação da call de descoberta e (b) os campos de
qualificação do lead no CRM.

# Contexto do produto
- 3 dores que sabemos resolver e quase sempre aparecem em algum grau:
  1. Triagem automática de documentos recebidos (e-mail, WhatsApp, portal)
  2. Cobrança automática de documentos do cliente final
  3. Lançamento/processamento contábil (NFs, recibos, extratos) no ERP
- Tickets típicos: R$ 5-25k por onda; projetos quebrados em 1-3 ondas
- ERPs comuns no nicho: Domínio, Alterdata, Sage, Nibo, Conta Azul, Omie

# Input
Você recebe:
- LEAD (nome + empresa)
- DIAGNÓSTICO PRÉVIO opcional (JSON do questionário do site, se preenchido)
- TRANSCRIÇÃO da call de triagem (15 min, conversa com o sócio)

# Output
JSON estruturado via tool_use \`emit_triage_briefing\` — schema rígido em
TRIAGE_INPUT_SCHEMA. NÃO retorne markdown ou texto livre.

# Critério de qualificação (campo \`qualificacao.nivel\`)
5 sinais avaliados:
  (a) porte > 50 clientes contábeis ativos
  (b) decisor único (sócio decide sozinho, não conselho)
  (c) sinal claro de orçamento (já paga sistema, fala em "investir")
  (d) dor crítica (impacta receita ou compliance, não só conveniência)
  (e) intenção de crescer (quer escalar, contratar comercial, abrir frente nova)

Mapeamento:
- AAA: 5 sinais
- AA: 4 sinais
- A: 3 sinais
- B: 2 sinais OU dor real mas porte/orçamento pequeno
- C: 1 ou 0 sinais OU dor difusa OU sem fit (não-contábil, micro-escritório)

# Regras do diagrama
Node types: \`office\` (1), \`team\` (1-4), \`system\` (ERP + outros), \`pain\` (com
\`severity\`), \`signal\`, \`decision_maker\`.
Layout: escritório à esquerda (x≈100), times no centro (x≈350), sistemas e
dores à direita (x≈650+). x entre 50-900, y entre 50-600.
IDs curtos e únicos: \`office-1\`, \`team-fiscal\`, \`pain-triagem\`.
Edges conectam o que foi MENCIONADO (escritório↔times, time↔dor, time↔sistema).
Não invente conexões.

# Anti-alucinação (RÍGIDO)
- Se número não foi dito, use \`null\`. NUNCA arredonde ou estime na triagem.
- Se nome de pessoa/sistema não foi dito, use \`null\`.
- Dores devem ser específicas e ancoradas em frase da call. "demora na triagem
  manual de DARFs" é aceitável; "muito trabalho manual" não é.
- Tickets sempre R$ inteiros (sem decimal, sem milhar com vírgula).`;

export const TRIAGE_TOOL_NAME = 'emit_triage_briefing';

export const TRIAGE_TOOL_DESCRIPTION =
  'Emite o briefing estruturado da call de triagem com qualificação, dores mapeadas, sinais e diagrama inicial.';

export const TRIAGE_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    resumo_executivo: {
      type: 'string',
      description:
        'Resumo executivo em 3-5 frases (cerca de 60-120 palavras): quem é o lead, dor principal mencionada, fit pra Levi Lael. Sem floreio comercial.',
    },
    porte: {
      type: 'object',
      properties: {
        clientes_ativos: { type: ['integer', 'null'] },
        funcionarios: {
          type: 'object',
          properties: {
            clt: { type: ['integer', 'null'] },
            estagiarios: { type: ['integer', 'null'] },
            socios: { type: ['integer', 'null'] },
          },
          required: ['clt', 'estagiarios', 'socios'],
        },
        erp_atual: { type: ['string', 'null'] },
        infra: { type: 'string', enum: ['cloud', 'on_premise', 'hybrid', 'unknown'] },
      },
      required: ['clientes_ativos', 'funcionarios', 'erp_atual', 'infra'],
    },
    perfil_decisor: {
      type: 'object',
      properties: {
        nome: { type: ['string', 'null'] },
        papel: { type: ['string', 'null'] },
        momento: { type: 'string', description: 'fase profissional ou contexto do decisor' },
        autoridade: { type: 'string', enum: ['unica', 'compartilhada', 'desconhecida'] },
      },
      required: ['nome', 'papel', 'momento', 'autoridade'],
    },
    dores_mapeadas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          titulo: { type: 'string' },
          descricao: { type: 'string' },
          severidade: { type: 'string', enum: ['alta', 'media', 'baixa'] },
          onda_relacionada: {
            type: ['integer', 'null'],
            description: '1, 2 ou 3 mapeando às dores conhecidas. null se não mapear.',
          },
        },
        required: ['titulo', 'descricao', 'severidade', 'onda_relacionada'],
      },
    },
    sinais: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tipo: {
            type: 'string',
            enum: ['crescimento', 'orcamento', 'urgencia', 'tecnologico', 'outro'],
          },
          descricao: { type: 'string' },
        },
        required: ['tipo', 'descricao'],
      },
    },
    qualificacao: {
      type: 'object',
      properties: {
        nivel: { type: 'string', enum: ['AAA', 'AA', 'A', 'B', 'C'] },
        motivo: { type: 'string', description: 'Justificativa baseada nos critérios' },
      },
      required: ['nivel', 'motivo'],
    },
    ticket_estimado: {
      type: 'object',
      properties: {
        min: { type: 'integer' },
        max: { type: 'integer' },
      },
      required: ['min', 'max'],
    },
    proximas_perguntas: {
      type: 'array',
      items: { type: 'string' },
      description:
        '8-15 perguntas abertas pra fazer na call de descoberta. Cobrir: confirmação de dores levantadas, mapeamento de decisores, sondagem de orçamento (sem pitch), volume operacional (docs/mês, clientes ativos), sistemas em uso. NÃO perguntas fechadas (sim/não).',
    },
    riscos: {
      type: 'array',
      items: { type: 'string' },
    },
    nodes_diagrama: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: {
            type: 'string',
            enum: [
              'office',
              'system',
              'team',
              'process',
              'pain',
              'signal',
              'decision_maker',
              'risk',
            ],
          },
          position: {
            type: 'object',
            properties: { x: { type: 'number' }, y: { type: 'number' } },
            required: ['x', 'y'],
          },
          data: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              description: { type: 'string' },
              severity: { type: 'string', enum: ['alta', 'media', 'baixa'] },
            },
            required: ['label'],
          },
        },
        required: ['id', 'type', 'position', 'data'],
      },
    },
    edges_diagrama: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          source: { type: 'string' },
          target: { type: 'string' },
          label: { type: 'string' },
        },
        required: ['id', 'source', 'target'],
      },
    },
  },
  required: [
    'resumo_executivo',
    'porte',
    'perfil_decisor',
    'dores_mapeadas',
    'sinais',
    'qualificacao',
    'ticket_estimado',
    'proximas_perguntas',
    'riscos',
    'nodes_diagrama',
    'edges_diagrama',
  ],
} as const;

export function buildTriageUserPrompt(args: {
  leadName: string;
  companyName?: string | null;
  diagnosisAnswers?: Record<string, unknown> | null;
  transcription: string;
}): string {
  const parts: string[] = [];
  parts.push(`LEAD: ${args.leadName}${args.companyName ? ' — ' + args.companyName : ''}`);
  if (args.diagnosisAnswers && Object.keys(args.diagnosisAnswers).length > 0) {
    parts.push('\nDIAGNÓSTICO PRÉVIO (preenchido pelo cliente no site):');
    parts.push(JSON.stringify(args.diagnosisAnswers, null, 2));
  }
  parts.push('\nTRANSCRIÇÃO DA CALL DE TRIAGEM:');
  parts.push(args.transcription);
  return parts.join('\n');
}

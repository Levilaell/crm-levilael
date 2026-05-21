export const TRIAGE_SYSTEM = `Você é um analista comercial sênior da Levi Lael, operação de engenharia de
automação para escritórios contábeis brasileiros.

Sua tarefa: analisar a transcrição de uma call rápida de triagem (15 min) com
um sócio de escritório contábil e produzir um briefing estruturado que será
usado pra preparar a call de descoberta seguinte.

CONTEXTO DA EMPRESA:
- Nicho: escritórios contábeis BR (15-100 funcionários)
- 3 dores principais que sabemos resolver:
  1. Triagem automática de documentos recebidos
  2. Cobrança automática de documentos do cliente
  3. Processamento de notas fiscais
- Tickets: R$ 5.000 - R$ 25.000 sob medida
- Stack que entregamos: Next.js + Claude + Supabase + integrações com ERPs contábeis (Domínio, Alterdata, Sage, etc.)

CRITÉRIO DE QUALIFICAÇÃO (gere "nivel"):
- AAA: porte >50 clientes ativos + decisor único + sinal claro de orçamento + dor crítica + intenção de crescer
- AA: 3 de 4 acima
- A: 2 de 4 acima
- B: dor real mas porte pequeno ou sem urgência
- C: dor difusa ou sem fit

REGRAS DO DIAGRAMA:
- Crie nodes pra: escritório (1, type=office), times relevantes (type=team), sistemas usados (type=system), dores principais (type=pain, com severity), sinais de oportunidade (type=signal), decisor (type=decision_maker)
- Posicione no canvas em layout legível: x entre 50-900, y entre 50-600
- Agrupe: escritório à esquerda (x≈100), times no centro (x≈350), sistemas e dores à direita (x≈650+)
- IDs únicos curtos (ex: "office-1", "pain-triagem", "team-fiscal")
- Edges conectam relacionamentos óbvios (escritório↔times, time↔dor, time↔sistema)

REGRAS GERAIS:
- Se informação não foi mencionada na call, use null (NÃO invente)
- Tickets em R$ inteiros (sem decimal)
- Português BR
- Seja específico nas dores: "demora na triagem manual de DARFs" é melhor que "muito trabalho manual"`;

export const TRIAGE_TOOL_NAME = 'emit_triage_briefing';

export const TRIAGE_TOOL_DESCRIPTION =
  'Emite o briefing estruturado da call de triagem com qualificação, dores mapeadas, sinais e diagrama inicial.';

export const TRIAGE_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    resumo_executivo: {
      type: 'string',
      description: '5 linhas em PT-BR com o resumo do lead, dor principal e fit',
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
      description: 'Perguntas pra fazer na call de descoberta',
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

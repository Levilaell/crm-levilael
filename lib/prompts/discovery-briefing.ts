export const DISCOVERY_SYSTEM = `Você é um analista comercial sênior da Levi Lael, operação de engenharia de
automação para escritórios contábeis brasileiros.

Sua tarefa: a partir do briefing da triagem + diagrama de triagem + transcrição
da call de descoberta, produzir o BRIEFING FINAL que vai virar a proposta.

CONTEXTO:
- Tickets: R$ 5-25k. Quebrar em ondas (1, 2, 3) facilita venda
- Cada onda = entrega independente, gera ROI sozinha
- Onda 1: a dor mais aguda + mais barata de resolver (ex: triagem de docs)
- Onda 2: ampliação ou nova frente
- Onda 3: roadmap (opcional, sinaliza visão de longo prazo)

REGRAS DO DIAGRAMA DE SOLUÇÃO (nodes_diagrama_solucao):
- Use os types data_source, integration, processing, destination, human_review, deliverable
- Layout: data_source à esquerda (x≈100), integration/processing no meio (x≈400-700), destination/deliverable à direita (x≈900)
- IDs únicos curtos
- Inclui human_review onde for relevante (compliance, qualidade)
- Edges conectam o fluxo de dados/responsabilidade

REGRAS GERAIS:
- Se a transcrição não confirma algo, não chute
- Tickets em R$ inteiros
- rascunho_proposta em markdown, máximo 500 palavras, foco em "o que resolve" e "como"
- PT-BR`;

export const DISCOVERY_TOOL_NAME = 'emit_discovery_briefing';

export const DISCOVERY_TOOL_DESCRIPTION =
  'Emite o briefing final da descoberta com confirmações, decisores, ondas propostas e diagrama da solução.';

export const DISCOVERY_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    resumo_executivo: { type: 'string' },
    confirmacoes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          pergunta: { type: 'string' },
          resposta: { type: 'string' },
          impacto_proposta: { type: 'string' },
        },
        required: ['pergunta', 'resposta', 'impacto_proposta'],
      },
    },
    decisores_envolvidos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nome: { type: 'string' },
          papel: { type: 'string' },
          posicao: { type: 'string', enum: ['aliado', 'cetico', 'neutro'] },
        },
        required: ['nome', 'papel', 'posicao'],
      },
    },
    ondas_propostas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          numero: { type: 'integer' },
          titulo: { type: 'string' },
          escopo: { type: 'string' },
          dor_resolvida: { type: 'string' },
          ticket_min: { type: 'integer' },
          ticket_max: { type: 'integer' },
          duracao_semanas_min: { type: 'integer' },
          duracao_semanas_max: { type: 'integer' },
          prioridade: { type: 'string', enum: ['alta', 'media', 'baixa'] },
        },
        required: [
          'numero',
          'titulo',
          'escopo',
          'dor_resolvida',
          'ticket_min',
          'ticket_max',
          'duracao_semanas_min',
          'duracao_semanas_max',
          'prioridade',
        ],
      },
    },
    contexto_estrategico: { type: 'string' },
    riscos_proposta: { type: 'array', items: { type: 'string' } },
    proximo_passo: { type: 'string' },
    rascunho_proposta: { type: 'string', description: 'Markdown, máximo 500 palavras' },
    nodes_diagrama_solucao: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: {
            type: 'string',
            enum: [
              'data_source',
              'integration',
              'processing',
              'destination',
              'human_review',
              'deliverable',
              'system',
              'team',
              'process',
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
            },
            required: ['label'],
          },
        },
        required: ['id', 'type', 'position', 'data'],
      },
    },
    edges_diagrama_solucao: {
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
    'confirmacoes',
    'decisores_envolvidos',
    'ondas_propostas',
    'contexto_estrategico',
    'riscos_proposta',
    'proximo_passo',
    'rascunho_proposta',
    'nodes_diagrama_solucao',
    'edges_diagrama_solucao',
  ],
} as const;

export function buildDiscoveryUserPrompt(args: {
  leadName: string;
  companyName?: string | null;
  triageBriefing: Record<string, unknown>;
  triageDiagram?: { nodes: unknown[]; edges: unknown[] } | null;
  discoveryTranscription: string;
}): string {
  const parts: string[] = [];
  parts.push(`LEAD: ${args.leadName}${args.companyName ? ' — ' + args.companyName : ''}`);
  parts.push('\nBRIEFING DA TRIAGEM (JSON):');
  parts.push(JSON.stringify(args.triageBriefing, null, 2));
  if (args.triageDiagram) {
    parts.push('\nDIAGRAMA DA TRIAGEM (atualizado pelo operador):');
    parts.push(JSON.stringify(args.triageDiagram, null, 2));
  }
  parts.push('\nTRANSCRIÇÃO DA CALL DE DESCOBERTA:');
  parts.push(args.discoveryTranscription);
  return parts.join('\n');
}

export const DISCOVERY_SYSTEM = `# Persona
Você é um analista comercial sênior da Levi Lael — operação de engenharia de
automação para escritórios contábeis brasileiros.

# Tarefa
Produzir o BRIEFING FINAL que vira a proposta. Você cruza 3 fontes:
  (1) Briefing da triagem (hipóteses do que o cliente tem)
  (2) Diagrama da triagem (atualizado pelo operador, pode ter divergências)
  (3) Transcrição da call de descoberta (verdade de campo, 45 min)

A descoberta CONFIRMA, REFUTA ou EXPANDE o que veio da triagem. Você deve
sinalizar isso explicitamente em \`confirmacoes\`.

# Contexto do produto
- Tickets: R$ 5-25k por onda
- Projetos quebrados em 1-3 ondas (cada onda = entrega independente que gera
  ROI sozinha)
- Onda 1: a dor mais aguda + mais barata de resolver (geralmente triagem de
  docs ou cobrança)
- Onda 2: ampliação ou nova frente (lançamento, painel, integração com ERP)
- Onda 3: roadmap (opcional — só se cliente sinalizou apetite de longo prazo)

# Input
- LEAD (nome + empresa)
- BRIEFING DA TRIAGEM (JSON do tool emit_triage_briefing)
- DIAGRAMA DA TRIAGEM (nodes/edges atualizados pelo operador, opcional)
- TRANSCRIÇÃO da call de descoberta (~45 min)

# Output
JSON estruturado via tool_use \`emit_discovery_briefing\` — schema rígido em
DISCOVERY_INPUT_SCHEMA.

# Diagrama de solução (nodes_diagrama_solucao)
Types: \`data_source\`, \`integration\`, \`processing\`, \`destination\`,
\`human_review\`, \`deliverable\`.
Layout: \`data_source\` à esquerda (x≈100), \`integration\`/\`processing\` no meio
(x≈400-700), \`destination\`/\`deliverable\` à direita (x≈900). y entre 50-600.
IDs curtos e únicos (\`source-email\`, \`proc-triagem\`, \`dest-dominio\`).
Inclua \`human_review\` onde houver compliance/qualidade que não dá pra 100%
automatizar.
Edges representam fluxo de dados/responsabilidade — só conecte o que está na
transcrição ou no diagrama de triagem.

# Anti-alucinação (RÍGIDO)
- Se a descoberta NÃO confirmou algo que estava na triagem, marque a confirmação
  como divergência ("Triagem dizia X, descoberta refutou: Y").
- Ondas SÓ com escopo discutido na call. Não invente onda 3 se não houve sinal.
- Tickets sempre R$ inteiros.
- Decisores: só quem foi mencionado pelo nome. Não invente cargo.
- \`rascunho_proposta\`: markdown 200-400 palavras, estrutura "O que resolve" +
  "Como funciona" + "Resultado esperado" — sem promessa de prazo curto, sem
  ancoragem comercial agressiva.`;

export const DISCOVERY_TOOL_NAME = 'emit_discovery_briefing';

export const DISCOVERY_TOOL_DESCRIPTION =
  'Emite o briefing final da descoberta com confirmações, decisores, ondas propostas e diagrama da solução.';

export const DISCOVERY_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    resumo_executivo: {
      type: 'string',
      description:
        'Resumo da call de descoberta em 4-6 frases (100-150 palavras): o que foi confirmado, o que mudou em relação à triagem, decisão preliminar de escopo.',
    },
    confirmacoes: {
      type: 'array',
      description:
        'Cada item representa uma hipótese testada na call. 5-12 itens. Inclua hipóteses CONFIRMADAS, REFUTADAS e EXPANDIDAS.',
      items: {
        type: 'object',
        properties: {
          pergunta: {
            type: 'string',
            description: 'Pergunta feita na call (parafraseada).',
          },
          resposta: {
            type: 'string',
            description:
              'Resposta do cliente — citação ou paráfrase fiel. Inclua números quando ditos.',
          },
          impacto_proposta: {
            type: 'string',
            description:
              'Como essa resposta muda a proposta (escopo, prazo, ticket, risco). Frase curta.',
          },
        },
        required: ['pergunta', 'resposta', 'impacto_proposta'],
      },
    },
    decisores_envolvidos: {
      type: 'array',
      description:
        'Pessoas mencionadas pelo nome na call. Não invente cargo — se não disse, use "desconhecido" em \`papel\`.',
      items: {
        type: 'object',
        properties: {
          nome: { type: 'string', description: 'Nome próprio.' },
          papel: { type: 'string', description: 'Cargo/função, ou "desconhecido".' },
          posicao: {
            type: 'string',
            enum: ['aliado', 'cetico', 'neutro'],
            description:
              'Postura observada na call. Use "neutro" como default quando ambíguo.',
          },
        },
        required: ['nome', 'papel', 'posicao'],
      },
    },
    ondas_propostas: {
      type: 'array',
      description:
        '1-3 ondas. Cada onda tem escopo independente que gera ROI sozinha. Onda 1 = mais aguda + mais barata. Só inclua Onda 3 se houve sinal explícito de apetite de roadmap.',
      items: {
        type: 'object',
        properties: {
          numero: { type: 'integer', description: '1, 2 ou 3.' },
          titulo: {
            type: 'string',
            description: 'Frase curta (até ~55 chars). Ex.: "Cobrança automática + painel".',
          },
          escopo: {
            type: 'string',
            description:
              'Parágrafo (80-200 palavras) descrevendo o que será entregue. Concreto, sem jargão de marketing.',
          },
          dor_resolvida: {
            type: 'string',
            description: 'Qual dor do briefing.dores_mapeadas essa onda resolve. Cite literal.',
          },
          ticket_min: { type: 'integer', description: 'R$ inteiros, faixa inferior.' },
          ticket_max: { type: 'integer', description: 'R$ inteiros, faixa superior.' },
          duracao_semanas_min: { type: 'integer' },
          duracao_semanas_max: { type: 'integer' },
          prioridade: {
            type: 'string',
            enum: ['alta', 'media', 'baixa'],
            description:
              'Ancorada na call: "alta" só se cliente sinalizou urgência ou impacto crítico.',
          },
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
    contexto_estrategico: {
      type: 'string',
      description:
        'Notas estratégicas sobre o lead que não cabem em outros campos: momento da empresa, eventos externos (migração de sistema, sócio saindo), restrições temporais. 2-4 frases.',
    },
    riscos_proposta: {
      type: 'array',
      items: { type: 'string' },
      description:
        '3-6 riscos REAIS de execução baseados na call: dependências técnicas, resistência de pessoas, prazo apertado. Não use "talvez", "pode ser" — descreva o risco direto.',
    },
    proximo_passo: {
      type: 'string',
      description:
        'Próxima ação concreta combinada na call (data, formato). Ex.: "Apresentar proposta em call de 30 min na semana que vem (terça ou quinta)."',
    },
    rascunho_proposta: {
      type: 'string',
      description:
        'Markdown 200-400 palavras. Estrutura: # O que vamos resolver / # Como funciona / # Resultado esperado. Sem ancoragem de preço aqui (vai no campo ondas_propostas) e sem promessas de prazo curto.',
    },
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

import { z } from 'zod';

// ============================================================================
// Schema do conteúdo do PPTX de preparação da call de descoberta.
// Mesma estrutura em 3 representações:
//   - JSON Schema → vai pro tool_use do Claude
//   - Zod → valida o output do Claude antes de passar pro template
//   - TS type → consumido pelo lib/pptx/discovery-prep-template.ts
// O layout vive no template, o estilo vive no template. Aqui só conteúdo.
// ============================================================================

export const DiscoveryPrepDataSchema = z.object({
  meta: z.object({
    escritorio: z.string().min(1),
    contato: z.string().min(1),
    mes_ano: z.string().min(1),
  }),
  dores_resgatadas: z
    .array(
      z.object({
        titulo: z.string().min(1),
        descricao: z.string().min(1),
      }),
    )
    .length(4),
  arquitetura: z.object({
    entradas: z.array(z.string().min(1)).min(3).max(5),
    central: z.array(z.string().min(1)).min(3).max(5),
    saida: z.array(z.string().min(1)).min(3).max(5),
  }),
  agenda: z
    .array(
      z.object({
        titulo: z.string().min(1),
        timebox_min: z.number().int().positive(),
      }),
    )
    .length(4)
    .refine((arr) => arr.reduce((s, i) => s + i.timebox_min, 0) === 45, {
      message: 'soma dos timeboxes deve ser exatamente 45 min',
    }),
  blocos_perguntas: z
    .array(
      z.object({
        bloco_numero: z.number().int().min(1).max(4),
        tema_kicker: z.string().min(1),
        pergunta_principal: z.string().min(1),
        perguntas: z
          .array(
            z.object({
              texto: z.string().min(1),
              intencao: z.string().min(1),
            }),
          )
          .length(3),
      }),
    )
    .length(5),
  resumo_quadrantes: z
    .array(
      z.object({
        titulo: z.string().min(1),
        subtitulo: z.string().min(1),
      }),
    )
    .length(4),
  proximos_passos: z.array(z.string().min(1)).length(4),
});

export type DiscoveryPrepData = z.infer<typeof DiscoveryPrepDataSchema>;

// ============================================================================
// Tool definition pro Claude (tool_use forçado)
// ============================================================================

export const DISCOVERY_PREP_TOOL_NAME = 'emit_discovery_prep_pptx';

export const DISCOVERY_PREP_TOOL_DESCRIPTION =
  'Emite o conteúdo estruturado pro PPTX de preparação da call de descoberta. Cardinalidades são rígidas; respeite os limites.';

export const DISCOVERY_PREP_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    meta: {
      type: 'object',
      properties: {
        escritorio: {
          type: 'string',
          description: 'Nome do escritório contábil (vai gigante na capa). Ex.: "Contabilliza"',
        },
        contato: {
          type: 'string',
          description: 'Nome do contato principal a quem a call se dirige. Ex.: "Rosana Valerio"',
        },
        mes_ano: {
          type: 'string',
          description: 'Mês e ano da call em PT-BR, formato "Mês de AAAA". Ex.: "Maio de 2026"',
        },
      },
      required: ['escritorio', 'contato', 'mes_ano'],
    },
    dores_resgatadas: {
      type: 'array',
      description:
        'EXATAMENTE 4 dores. Tira do briefing.dores_mapeadas (top 4 por severidade alta>media>baixa). Se houver menos de 4 explícitas, suplemente APENAS com base em briefing.sinais. NUNCA invente dor que não veio do briefing.',
      items: {
        type: 'object',
        properties: {
          titulo: {
            type: 'string',
            description:
              'Frase curta (até ~55 chars), substantiva. Ex.: "Cobrança de documentos sem controle"',
          },
          descricao: {
            type: 'string',
            description:
              'Linha com números/sistemas/contexto extraídos do briefing (até ~140 chars). Ex.: "70 clientes · Nibo + OnViewMessage · sem monitoramento em tempo real de quem entregou"',
          },
        },
        required: ['titulo', 'descricao'],
      },
      minItems: 4,
      maxItems: 4,
    },
    arquitetura: {
      type: 'object',
      description: '3 colunas: Entradas → Central de Controle → Saída.',
      properties: {
        entradas: {
          type: 'array',
          description:
            '3-5 canais curtos (máx ~28 chars cada — bullets não devem wrap em 2 linhas). Ex.: "E-mail (Gmail / Outlook)", "WhatsApp", "Nibo (portal)". Use canais mencionados no briefing quando possível.',
          items: { type: 'string' },
          minItems: 3,
          maxItems: 5,
        },
        central: {
          type: 'array',
          description:
            '3-5 ações curtas (máx ~28 chars cada — bullets não devem wrap em 2 linhas). Inclui sempre: identificar cliente, classificar documento, cobrar automaticamente, painel de status, revisão humana. Adapte ordem/wording ao contexto, mas mantenha curto.',
          items: { type: 'string' },
          minItems: 3,
          maxItems: 5,
        },
        saida: {
          type: 'array',
          description:
            '3-5 destinos curtos (máx ~28 chars cada — bullets não devem wrap em 2 linhas). Use o ERP atual do briefing (briefing.porte.erp_atual) como primeiro item. Ex.: "Domínio", "Conta Azul", "Lançamento estruturado".',
          items: { type: 'string' },
          minItems: 3,
          maxItems: 5,
        },
      },
      required: ['entradas', 'central', 'saida'],
    },
    agenda: {
      type: 'array',
      description:
        'EXATAMENTE 4 blocos de agenda. Soma dos timebox_min DEVE SER EXATAMENTE 45. Padrão sugerido: 10 / 15 / 10 / 10 (Central tem o maior bloco).',
      items: {
        type: 'object',
        properties: {
          titulo: {
            type: 'string',
            description: 'Frase curta (até ~65 chars). Ex.: "Entradas — de onde chegam os documentos"',
          },
          timebox_min: { type: 'integer', description: 'Minutos. Ex.: 10' },
        },
        required: ['titulo', 'timebox_min'],
      },
      minItems: 4,
      maxItems: 4,
    },
    blocos_perguntas: {
      type: 'array',
      description:
        'EXATAMENTE 5 slides de blocos de perguntas. Bloco 2 (Central) ocupa 2 slides (triagem + cobrança). Distribua as briefing.proximas_perguntas entre os 5 slides; reescreva pra ficarem abertas e em tom de parceiro. 3 perguntas por slide = 15 perguntas no total.',
      items: {
        type: 'object',
        properties: {
          bloco_numero: {
            type: 'integer',
            minimum: 1,
            maximum: 4,
            description: 'Pode repetir entre slides (ex.: bloco 2 aparece 2 vezes).',
          },
          tema_kicker: {
            type: 'string',
            description:
              'UPPERCASE com "·". Ex.: "BLOCO 1 · ENTRADAS", "BLOCO 2 · CENTRAL DE CONTROLE", "BLOCO 3 · SAÍDA", "BLOCO 4 · VOLUME E TIME"',
          },
          pergunta_principal: {
            type: 'string',
            description:
              'Título do slide em forma de pergunta (até ~80 chars). Ex.: "Como funciona a triagem hoje?"',
          },
          perguntas: {
            type: 'array',
            description: 'Exatamente 3 perguntas + intenção.',
            items: {
              type: 'object',
              properties: {
                texto: {
                  type: 'string',
                  description:
                    'Pergunta aberta, conversacional (até ~220 chars). Sem "?" duplicado.',
                },
                intencao: {
                  type: 'string',
                  description:
                    'POR QUE essa pergunta importa pro projeto. Frase curta (até ~130 chars). NÃO inclua o símbolo ↳ — o template adiciona.',
                },
              },
              required: ['texto', 'intencao'],
            },
            minItems: 3,
            maxItems: 3,
          },
        },
        required: ['bloco_numero', 'tema_kicker', 'pergunta_principal', 'perguntas'],
      },
      minItems: 5,
      maxItems: 5,
    },
    resumo_quadrantes: {
      type: 'array',
      description:
        'EXATAMENTE 4 quadrantes (grid 2x2). Título do que vai ser preenchido AO VIVO durante a call + subtítulo explicativo. Padrão: "Entradas confirmadas", "Gargalos identificados", "Saída e sistema contábil", "Prioridade da Onda 1".',
      items: {
        type: 'object',
        properties: {
          titulo: { type: 'string', description: 'Ex.: "Entradas confirmadas"' },
          subtitulo: {
            type: 'string',
            description: 'Ex.: "Canais e formatos de documento"',
          },
        },
        required: ['titulo', 'subtitulo'],
      },
      minItems: 4,
      maxItems: 4,
    },
    proximos_passos: {
      type: 'array',
      description:
        'EXATAMENTE 4 itens numerados (o template numera). Padrão recomendado: 1) proposta em 5 dias úteis começando pelo que mais trava; 2) para cada onda: o que resolve + horas + investimento; 3) call de proposta 30 min; 4) decisão sem compromisso.',
      items: {
        type: 'string',
        description: 'Frase curta (até ~160 chars) SEM número no início (o template adiciona).',
      },
      minItems: 4,
      maxItems: 4,
    },
  },
  required: [
    'meta',
    'dores_resgatadas',
    'arquitetura',
    'agenda',
    'blocos_perguntas',
    'resumo_quadrantes',
    'proximos_passos',
  ],
} as const;

// ============================================================================
// System + user prompts
// ============================================================================

export const DISCOVERY_PREP_SYSTEM = `# Persona
Você é um analista comercial sênior da Levi Lael. Está montando o CONTEÚDO de
uma apresentação .pptx que o sócio vai usar pra conduzir a call de descoberta
(45 min) com um escritório contábil.

# Tarefa
Preencher o JSON FIXO via tool_use \`emit_discovery_prep_pptx\`. Layout e
estilo vivem no código — você só preenche o conteúdo. NÃO retorne markdown ou
texto livre.

# Contexto do produto
- Levi Lael: engenharia de automação pra escritórios contábeis BR
- 3 ondas típicas: triagem automática de docs, cobrança automática, lançamento
  contábil
- Ticket: R$ 5-25k por onda

# Input
- LEAD (nome + empresa)
- ESCRITÓRIO (vai pra capa, geralmente = nome da empresa)
- CONTATO (nome do decisor que estará na call, vai pra "Para:" da capa)
- MÊS/ANO (vai pra capa)
- BRIEFING DE TRIAGEM (JSON do tool emit_triage_briefing) — fonte primária

# Output
JSON estruturado via tool_use. Schema rígido em DISCOVERY_PREP_INPUT_SCHEMA.

# Regras de conteúdo (RÍGIDAS)

1. **Dores resgatadas — não invente**
   Tira EXATAMENTE 4 de \`briefing.dores_mapeadas\`, ordenadas por severidade
   (alta > media > baixa). Se houver menos de 4 explícitas, complemente APENAS
   a partir de \`briefing.sinais\`. Cada dor: título curto + descrição
   ancorada com números/sistemas extraídos do briefing.

2. **Perguntas — aproveite o briefing**
   As 15 perguntas (5 slides × 3 perguntas) saem de
   \`briefing.proximas_perguntas\`. Reescreva pra ficarem abertas e em tom de
   conversa de parceiro — não interrogatório. Cada pergunta TEM uma intenção
   (POR QUE perguntar isso). A intenção é fala interna pro parceiro, não pro
   cliente.

3. **Estrutura fixa dos 5 slides de blocos**
   | # | Bloco | Tema sugerido |
   |---|---|---|
   | 1 | BLOCO 1 · ENTRADAS | De onde chegam os documentos? |
   | 2 | BLOCO 2 · CENTRAL DE CONTROLE | Como funciona a triagem hoje? |
   | 3 | BLOCO 2 · CENTRAL DE CONTROLE | Como funciona a cobrança de documentos? |
   | 4 | BLOCO 3 · SAÍDA | Como é feito o lançamento no sistema contábil? |
   | 5 | BLOCO 4 · VOLUME E TIME | Dimensionando o projeto |
   Pode adaptar \`pergunta_principal\` ao contexto do briefing, mas mantenha o
   pareamento bloco↔tema.

4. **Agenda — soma EXATA**
   4 blocos. Soma de \`timebox_min\` = 45 EXATO (validado pelo schema).
   Padrão: 10/15/10/10.

5. **Arquitetura (3 colunas)** — bullets curtos (até ~28 chars cada)
   - Entradas: canais reais do briefing (e-mail, WhatsApp, portal do ERP)
   - Central: identificar cliente, classificar doc, cobrar, painel, revisão
     humana (essência fixa, adapte wording)
   - Saída: ERP atual do briefing (\`briefing.porte.erp_atual\`) como primeiro
     item

6. **Próximos passos** (4 itens, padrão recomendado):
   - Proposta em etapas em até 5 dias úteis — começando pelo que mais trava
   - Para cada onda: o que resolve, horas economizadas e investimento
   - Call de proposta de 30 minutos — apresentação e dúvidas
   - Decisão sem compromisso — sem pressão de prazo artificial

# Anti-alucinação
- Onde o briefing tem número (clientes_ativos, funcionários, ERP), use o
  número/nome EXATO. Não arredonde nem traduza.
- Não invente sistema que não está no briefing (ex.: não cite "Sage" se o ERP
  do briefing é "Domínio").
- Tom de parceiro. Sem "exclusivo", "incrível", "vamos juntos",
  "transformação". Sem emojis.`;

export function buildDiscoveryPrepUserPrompt(args: {
  leadName: string;
  companyName: string;
  contato: string;
  mesAno: string;
  triageBriefing: Record<string, unknown>;
}): string {
  return [
    `LEAD: ${args.leadName}`,
    `ESCRITÓRIO (capa): ${args.companyName}`,
    `CONTATO (capa): ${args.contato}`,
    `MÊS/ANO (capa): ${args.mesAno}`,
    '',
    'BRIEFING DE TRIAGEM (JSON):',
    JSON.stringify(args.triageBriefing, null, 2),
    '',
    'Preencha o tool emit_discovery_prep_pptx. Lembretes: não inventar dores; aproveitar próximas_perguntas; soma da agenda = 45.',
  ].join('\n');
}

import { z } from 'zod';

// ============================================================================
// Schema do conteúdo do PPTX da call de proposta (Tarefa 2.2).
// Mesma disciplina do discovery-prep-pptx.ts:
//   - JSON Schema → tool_use forçado do Claude
//   - Zod → valida o output antes de chamar o template
//   - TS type → consumido pelo lib/pptx/proposal-template.ts
// ============================================================================

export const ProposalPptxDataSchema = z.object({
  meta: z.object({
    escritorio: z.string().min(1),
    contato: z.string().min(1),
    mes_ano: z.string().min(1),
  }),
  resumo_diagnostico: z.object({
    dores: z
      .array(
        z.object({
          titulo: z.string().min(1),
          descricao: z.string().min(1),
        }),
      )
      .min(3)
      .max(4),
    confirmacoes: z.array(z.string().min(1)).min(2).max(4),
  }),
  arquitetura: z.object({
    entradas: z.array(z.string().min(1)).min(3).max(5),
    central: z.array(z.string().min(1)).min(3).max(5),
    saida: z.array(z.string().min(1)).min(3).max(5),
  }),
  ondas: z
    .array(
      z.object({
        numero: z.number().int().min(1).max(3),
        titulo: z.string().min(1),
        dor_resolvida: z.string().min(1),
        escopo: z.array(z.string().min(1)).min(2).max(5),
        duracao_semanas: z.number().int().positive(),
        ticket: z.number().int().positive(),
        prioridade: z.enum(['alta', 'media', 'baixa']),
      }),
    )
    .min(1)
    .max(3),
  roi: z.object({
    horas_atuais_semana: z.number().int().positive(),
    horas_apos_semana: z.number().int().nonnegative(),
    horas_economizadas_semana: z.number().int().positive(),
    custo_atual_mensal: z.number().int().positive(),
    custo_apos_mensal: z.number().int().nonnegative(),
    economia_mensal: z.number().int().positive(),
    payback_meses: z.number().int().positive(),
    pressupostos: z.string().min(1),
  }),
  investimento: z.object({
    setup_total: z.number().int().positive(),
    mensalidade: z.number().int().nonnegative(),
    total_primeiro_ano: z.number().int().positive(),
    observacao: z.string().min(1),
  }),
  cronograma: z
    .array(
      z.object({
        titulo: z.string().min(1),
        periodo: z.string().min(1),
        descricao: z.string().min(1),
      }),
    )
    .min(3)
    .max(6),
  proximos_passos: z.array(z.string().min(1)).length(4),
  fechamento: z.object({
    mensagem: z.string().min(1),
  }),
});

export type ProposalPptxData = z.infer<typeof ProposalPptxDataSchema>;

// ============================================================================
// Tool definition pro Claude
// ============================================================================

export const PROPOSAL_PPTX_TOOL_NAME = 'emit_proposal_pptx';

export const PROPOSAL_PPTX_TOOL_DESCRIPTION =
  'Emite o conteúdo estruturado pro PPTX da call de proposta. Cardinalidades são rígidas — respeite os limites e use dados do briefing.';

export const PROPOSAL_PPTX_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    meta: {
      type: 'object',
      properties: {
        escritorio: {
          type: 'string',
          description: 'Nome do escritório (vai na capa). Ex.: "Contabilliza"',
        },
        contato: {
          type: 'string',
          description: 'Nome do contato/decisor principal. Ex.: "Rosana Valerio"',
        },
        mes_ano: {
          type: 'string',
          description: 'Formato "Mês de AAAA" em PT-BR. Ex.: "Maio de 2026"',
        },
      },
      required: ['escritorio', 'contato', 'mes_ano'],
    },
    resumo_diagnostico: {
      type: 'object',
      description:
        'Resgata o que foi mapeado nas calls de triagem e descoberta. NÃO invente — use briefing.dores_mapeadas (triagem) + briefing.confirmacoes (descoberta).',
      properties: {
        dores: {
          type: 'array',
          description:
            '3-4 dores mapeadas. Tira do briefing de triagem (top por severidade). Título curto + descrição com números/sistemas.',
          items: {
            type: 'object',
            properties: {
              titulo: { type: 'string', description: 'Até ~55 chars' },
              descricao: { type: 'string', description: 'Até ~140 chars, com números/contexto' },
            },
            required: ['titulo', 'descricao'],
          },
          minItems: 3,
          maxItems: 4,
        },
        confirmacoes: {
          type: 'array',
          description:
            '2-4 confirmações da call de descoberta (briefing.confirmacoes). Frase curta (até ~110 chars) afirmando o que foi confirmado.',
          items: { type: 'string' },
          minItems: 2,
          maxItems: 4,
        },
      },
      required: ['dores', 'confirmacoes'],
    },
    arquitetura: {
      type: 'object',
      description:
        '3 colunas (Entradas → Central → Saída). Mesma estética do PPTX de descoberta — mas agora descreve o SISTEMA QUE SERÁ ENTREGUE, não o que existe hoje.',
      properties: {
        entradas: {
          type: 'array',
          description:
            '3-5 canais de entrada (curtos, máx ~28 chars). Use canais reais do briefing.',
          items: { type: 'string' },
          minItems: 3,
          maxItems: 5,
        },
        central: {
          type: 'array',
          description:
            '3-5 ações da central (curtas, máx ~28 chars). Identificar cliente, classificar, cobrar, painel, revisão humana.',
          items: { type: 'string' },
          minItems: 3,
          maxItems: 5,
        },
        saida: {
          type: 'array',
          description:
            '3-5 destinos (curtos, máx ~28 chars). Primeiro item = ERP atual do briefing (briefing.porte.erp_atual).',
          items: { type: 'string' },
          minItems: 3,
          maxItems: 5,
        },
      },
      required: ['entradas', 'central', 'saida'],
    },
    ondas: {
      type: 'array',
      description:
        '1-3 ondas. Tira de briefing.ondas_propostas (briefing de descoberta) — NÃO recrie. Ticket: use a MÉDIA entre ticket_min e ticket_max do briefing (round pra inteiro). duracao_semanas: média entre duracao_semanas_min e duracao_semanas_max.',
      items: {
        type: 'object',
        properties: {
          numero: { type: 'integer', minimum: 1, maximum: 3 },
          titulo: { type: 'string', description: 'Até ~55 chars. Tira do briefing.' },
          dor_resolvida: {
            type: 'string',
            description: 'Até ~110 chars. Tira do briefing.',
          },
          escopo: {
            type: 'array',
            description:
              '2-5 bullets curtos (máx ~60 chars cada) descrevendo o que será entregue na onda. Decomponha o escopo do briefing em itens objetivos.',
            items: { type: 'string' },
            minItems: 2,
            maxItems: 5,
          },
          duracao_semanas: { type: 'integer', description: 'Média (round inteiro)' },
          ticket: {
            type: 'integer',
            description: 'Valor em R$ inteiros (sem decimal). Média ticket_min/ticket_max.',
          },
          prioridade: { type: 'string', enum: ['alta', 'media', 'baixa'] },
        },
        required: [
          'numero',
          'titulo',
          'dor_resolvida',
          'escopo',
          'duracao_semanas',
          'ticket',
          'prioridade',
        ],
      },
      minItems: 1,
      maxItems: 3,
    },
    roi: {
      type: 'object',
      description:
        'ROI estimado. Use dados do briefing — quantidades de clientes, funcionários, horas mencionadas. Se não há números explícitos, use estes pressupostos conservadores (e DOCUMENTE em "pressupostos"): 1 estagiário CLT ≈ 160h/mês ≈ R$ 2.500/mês; tempo médio cobrando documento por cliente/mês = 1h; cobrança automatizada elimina ~90% do tempo manual.',
      properties: {
        horas_atuais_semana: {
          type: 'integer',
          description: 'Total de horas/semana gastas hoje no problema (cobrança + triagem manual).',
        },
        horas_apos_semana: {
          type: 'integer',
          description: 'Horas/semana após automação (residual: revisão humana, casos exceção).',
        },
        horas_economizadas_semana: {
          type: 'integer',
          description: 'horas_atuais_semana − horas_apos_semana',
        },
        custo_atual_mensal: {
          type: 'integer',
          description: 'R$ mensal (custo das horas atuais — folha + encargos)',
        },
        custo_apos_mensal: {
          type: 'integer',
          description: 'R$ mensal residual',
        },
        economia_mensal: {
          type: 'integer',
          description: 'custo_atual_mensal − custo_apos_mensal',
        },
        payback_meses: {
          type: 'integer',
          description: 'investimento.setup_total ÷ economia_mensal (round up)',
        },
        pressupostos: {
          type: 'string',
          description:
            '1-2 frases curtas (até ~250 chars) explicando os pressupostos usados pra chegar nesses números. Ex.: "Considerando 70 clientes × 1h/mês cobrando docs = 17h/sem; 3 estagiários × custo médio R$ 2.500/mês."',
        },
      },
      required: [
        'horas_atuais_semana',
        'horas_apos_semana',
        'horas_economizadas_semana',
        'custo_atual_mensal',
        'custo_apos_mensal',
        'economia_mensal',
        'payback_meses',
        'pressupostos',
      ],
    },
    investimento: {
      type: 'object',
      description:
        'Resumo financeiro. setup_total e mensalidade têm naturezas distintas: setup paga implantação (one-time); mensalidade paga infra + IA + suporte (recorrente, proporcional ao VOLUME OPERACIONAL — não ao tamanho da implantação).',
      properties: {
        setup_total: {
          type: 'integer',
          description: 'Soma exata de ondas[].ticket. R$ inteiros.',
        },
        mensalidade: {
          type: 'integer',
          description:
            'Recorrência mensal R$ inteiros. NÃO é % do setup. Estimar pelo volume mensal de docs processados pelo escritório. Faixas: até 500 docs/mês → R$ 997-1.497; 500-2.000 → R$ 1.997-2.997; 2.000-5.000 → R$ 2.997-4.997; 5.000+ → R$ 4.997-7.997. Overhead adicional: +R$ 500-1.500 se o escritório tem 50+ clientes finais (overhead de identificação por cliente). Escolha um valor inteiro DENTRO da faixa apropriada (não no extremo — meio da faixa quando indefinido).',
        },
        total_primeiro_ano: {
          type: 'integer',
          description: 'Exatamente setup_total + 12 × mensalidade',
        },
        observacao: {
          type: 'string',
          description:
            'Frase curta (até ~180 chars) que cita o volume mensal estimado e a faixa usada. Ex.: "Estimado em ~700 docs/mês × 70 clientes; mensalidade na faixa 500-2.000 docs + overhead por porte. Pagamento por onda entregue."',
        },
      },
      required: ['setup_total', 'mensalidade', 'total_primeiro_ano', 'observacao'],
    },
    cronograma: {
      type: 'array',
      description:
        '3-6 marcos cronológicos. Distribua as ondas no tempo + marcos relevantes (kickoff, primeira entrega, etc.). Período em PT-BR ("Semanas 1-2", "Mês 2").',
      items: {
        type: 'object',
        properties: {
          titulo: {
            type: 'string',
            description: 'Marco curto (até ~50 chars). Ex.: "Kickoff e mapeamento detalhado"',
          },
          periodo: {
            type: 'string',
            description: 'Ex.: "Semanas 1-2", "Mês 2", "Mês 3-4"',
          },
          descricao: {
            type: 'string',
            description: 'Frase curta (até ~120 chars) explicando o que rola nesse marco.',
          },
        },
        required: ['titulo', 'periodo', 'descricao'],
      },
      minItems: 3,
      maxItems: 6,
    },
    proximos_passos: {
      type: 'array',
      description:
        'EXATAMENTE 4 itens — fluxo de decisão pós-call. Padrão sugerido: 1) resposta em até X dias, 2) onboarding com dados/acessos, 3) primeira entrega em Y dias, 4) modelo de pagamento.',
      items: {
        type: 'string',
        description: 'Frase curta (até ~160 chars), sem numeração (template numera).',
      },
      minItems: 4,
      maxItems: 4,
    },
    fechamento: {
      type: 'object',
      properties: {
        mensagem: {
          type: 'string',
          description:
            '1-2 frases pra fechamento do deck (slide final, fundo dark). Tom sóbrio, sem apelação. Ex.: "Estamos prontos pra começar pelo que mais trava. Decida sem pressão."',
        },
      },
      required: ['mensagem'],
    },
  },
  required: [
    'meta',
    'resumo_diagnostico',
    'arquitetura',
    'ondas',
    'roi',
    'investimento',
    'cronograma',
    'proximos_passos',
    'fechamento',
  ],
} as const;

// ============================================================================
// System + user prompts
// ============================================================================

export const PROPOSAL_PPTX_SYSTEM = `# Persona
Você é um analista comercial sênior da Levi Lael. Está montando o CONTEÚDO de
um PPTX que o sócio vai APRESENTAR (não usar como roteiro) na call de proposta
(30 min) pra um escritório contábil. Cada texto que você gerar vai aparecer na
tela pro cliente ler.

# Tarefa
Preencher o JSON FIXO via tool_use \`emit_proposal_pptx\`. Layout vive no
template — você SÓ preenche conteúdo. NÃO retorne markdown ou texto livre.

# Contexto do produto
- Levi Lael: engenharia de automação pra escritórios contábeis BR
- Funil: triagem (15 min) → descoberta (45 min) → proposta (30 min, esta call)
- Tickets: R$ 5-25k por onda; 1-3 ondas tipicamente
- Cliente já viu/falou de tudo: cliente confia, expectativa é decidir

# Input
- LEAD (nome + empresa) + ESCRITÓRIO + CONTATO + MÊS/ANO (vão pra capa)
- BRIEFING DE TRIAGEM (JSON) — fonte das dores e do porte (clientes_ativos,
  funcionários, ERP atual, sinais)
- BRIEFING DE DESCOBERTA (JSON) — fonte das ondas, confirmações, decisores,
  riscos, rascunho_proposta

# Output
JSON estruturado via tool_use. Schema rígido em PROPOSAL_PPTX_INPUT_SCHEMA.

# Regras de conteúdo (RÍGIDAS)

1. **Resumo do diagnóstico**
   - Dores: 3-4 de \`briefing_triagem.dores_mapeadas\` (top por severidade).
     Mantenha o wording original quando ele já está bom — não reescreva por
     reescrever.
   - Confirmações: 2-4 pontos de \`briefing_descoberta.confirmacoes\`.
     Combine \`resposta\` + \`impacto_proposta\` em uma frase curta.
   - Se faltar dor, complemente APENAS com \`briefing_triagem.sinais\`. Nunca
     invente.

2. **Arquitetura** — 3 colunas, bullets curtos (≤28 chars cada pra evitar
   wrap em coluna estreita)
   - Entradas: canais reais do briefing (e-mail, WhatsApp, portal do ERP)
   - Central: identificar cliente, classificar, cobrar, painel, revisão
     humana (essência fixa, adapte wording)
   - Saída: ERP atual (\`briefing_triagem.porte.erp_atual\`) como primeiro item

3. **Ondas** — tira de \`briefing_descoberta.ondas_propostas\`
   - \`ticket\` = média inteira de (ticket_min + ticket_max) / 2
   - \`duracao_semanas\` = média inteira de (duracao_semanas_min +
     duracao_semanas_max) / 2
   - \`escopo\`: decomponha o campo escopo do briefing em 2-5 bullets
     objetivos (≤60 chars cada)
   - Mantenha \`prioridade\` do briefing
   - NÃO reordene nem renomeie. NÃO invente onda.

4. **ROI** — TEM que ter números. Use dados do briefing — clientes_ativos,
   funcionarios.estagiarios, dores quantificadas. Se faltar, use pressupostos
   conservadores E DOCUMENTE em \`pressupostos\`:
   - 1 estagiário CLT ≈ 160h/mês ≈ R$ 2.500/mês (folha + encargos)
   - Hora útil do estagiário ≈ R$ 16 (R$ 2.500 ÷ 160h)
   - Cobrança manual ≈ 1h por cliente/mês
   - Triagem manual ≈ 0,5h por documento
   - Automação elimina 85-90% do tempo manual
   Arredonde pra inteiros amigáveis (não "17,3h" — use "17h").

5. **Investimento** — setup e mensalidade têm naturezas DISTINTAS
   - \`setup_total\` = soma exata de ondas.ticket (paga implantação one-time)
   - \`mensalidade\` = recorrente, paga infra + IA + suporte. **NÃO é % do
     setup.** Estimar pelo VOLUME mensal de docs:
     | Volume mensal | Faixa mensalidade |
     |---|---|
     | até 500 docs | R$ 997 - 1.497 |
     | 500-2.000 docs | R$ 1.997 - 2.997 |
     | 2.000-5.000 docs | R$ 2.997 - 4.997 |
     | 5.000+ docs | R$ 4.997 - 7.997 |
     +R$ 500-1.500 de overhead se o escritório tem 50+ clientes finais
     (custo de identificação por cliente). Use meio da faixa quando indefinido.
   - **Volume estimado**: tire de \`briefing_descoberta.contexto_estrategico\` ou
     \`confirmacoes\` se mencionado. Senão, estime por
     \`briefing_triagem.porte.clientes_ativos\` × ~10 docs/cliente/mês.
   - \`total_primeiro_ano\` = setup_total + 12 × mensalidade (conta exata)
   - \`observacao\` deve CITAR a base do volume usado (ex.: "Estimado em ~700
     docs/mês = 70 clientes × 10 docs; faixa 500-2.000 + overhead por porte")

6. **Cronograma** — 3-6 marcos
   - Inclua sempre 1 marco de kickoff inicial
   - Ondas em sequência (Onda 1 termina antes da Onda 2 começar)
   - Período em PT-BR: "Semanas 1-2", "Mês 2", "Mês 3-4"

7. **Próximos passos** — 4 itens. Padrão:
   - Resposta em até N dias úteis (use 5 ou 7)
   - Onboarding com dados/acessos (semana 1)
   - Primeira entrega em N semanas (espelha duracao da Onda 1)
   - Modelo de pagamento por onda entregue (sem mensalidade até a 1ª entrega)

8. **Fechamento** — 1-2 frases sóbrias, tom de parceiro

# Anti-alucinação
- Onde o briefing tem número, use o número exato. Não arredonde sem razão.
- Não invente sistema/ERP/canal que não está no briefing.
- Sem "transformação", "exclusivo", "vamos juntos", "incrível". Sem emojis.
- Valores em R$ sempre inteiros (template formata com pontuação BR).`;

export function buildProposalPptxUserPrompt(args: {
  leadName: string;
  companyName: string;
  contato: string;
  mesAno: string;
  triageBriefing: Record<string, unknown>;
  discoveryBriefing: Record<string, unknown>;
}): string {
  return [
    `LEAD: ${args.leadName}`,
    `ESCRITÓRIO (capa): ${args.companyName}`,
    `CONTATO (capa): ${args.contato}`,
    `MÊS/ANO (capa): ${args.mesAno}`,
    '',
    'BRIEFING DE TRIAGEM (JSON — fonte das dores e do porte):',
    JSON.stringify(args.triageBriefing, null, 2),
    '',
    'BRIEFING DE DESCOBERTA (JSON — fonte das ondas e confirmações):',
    JSON.stringify(args.discoveryBriefing, null, 2),
    '',
    'Preencha o tool emit_proposal_pptx. Lembretes: não invente; ondas vêm do briefing de descoberta; ROI tem pressupostos documentados.',
  ].join('\n');
}

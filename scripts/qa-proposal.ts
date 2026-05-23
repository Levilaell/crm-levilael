// QA visual da CALL DE PROPOSTA: gera um PPTX de teste com dados mockados
// usando o template puro — não chama Claude.
//
// Uso: pnpm exec tsx scripts/qa-proposal.ts [out_path]
//      out_path default: /tmp/qa-proposal.pptx

import { writeFileSync } from 'node:fs';
import { renderProposalPptx } from '../lib/pptx/proposal-template';
import { ProposalPptxDataSchema } from '../lib/prompts/proposal-pptx';

const mock = ProposalPptxDataSchema.parse({
  meta: {
    escritorio: 'Contabilliza',
    contato: 'Rosana Valerio',
    mes_ano: 'Maio de 2026',
  },
  resumo_diagnostico: {
    dores: [
      {
        titulo: 'Cobrança de documentos sem controle',
        descricao:
          '70 clientes · Nibo + OnViewMessage · sem monitoramento em tempo real de quem entregou',
      },
      {
        titulo: 'Estagiários gastando horas em trabalho improdutivo',
        descricao:
          '3 estagiários part-time · cobrar documento não é produção · horas que poderiam ir pra análise',
      },
      {
        titulo: 'Você presa na operação',
        descricao:
          'Quer contratar comercial e crescer · mas não consegue sair enquanto executa o básico',
      },
      {
        titulo: 'Não entrega valor real pras pejotinhas',
        descricao:
          'Clientes PJ simples · recebem só obrigação fiscal · você quer entregar resumo financeiro',
      },
    ],
    confirmacoes: [
      'Cobrança hoje é manual via WhatsApp dos estagiários — sem régua, sem histórico',
      'Você tem um estagiário com facilidade técnica disponível pra integração e testes',
      'Migração pro Microsoft 365 acontece em julho — afeta a integração de email da Onda 1',
    ],
  },
  arquitetura: {
    entradas: ['E-mail (Gmail / Outlook)', 'WhatsApp', 'Nibo (portal)', 'Omie', 'Outros canais'],
    central: [
      'Identifica o cliente',
      'Classifica o documento',
      'Cobra automaticamente',
      'Painel de status em tempo real',
      'Revisão humana',
    ],
    saida: [
      'Domínio',
      'Conta Azul',
      'Alternativos',
      'Lançamento estruturado',
      'Pronto pra revisão final',
    ],
  },
  ondas: [
    {
      numero: 1,
      titulo: 'Cobrança automática + painel',
      dor_resolvida: 'Cobrança manual sem controle',
      escopo: [
        'Régua de cobrança via WhatsApp e e-mail',
        'Painel de status por cliente em tempo real',
        'Alertas pra atrasos',
        'Histórico de envios',
      ],
      duracao_semanas: 6,
      ticket: 12000,
      prioridade: 'alta',
    },
    {
      numero: 2,
      titulo: 'Triagem inteligente',
      dor_resolvida: 'Estagiários classificando docs manualmente',
      escopo: [
        'OCR de documentos recebidos',
        'Classificação automática por tipo + cliente',
        'Fila de revisão pros casos ambíguos',
      ],
      duracao_semanas: 8,
      ticket: 18000,
      prioridade: 'alta',
    },
    {
      numero: 3,
      titulo: 'Integração com Nibo',
      dor_resolvida: 'Lançamento contábil manual após classificação',
      escopo: [
        'API de lançamento direta no Nibo',
        'Validação cruzada antes do lançamento',
        'Trilha de auditoria',
      ],
      duracao_semanas: 6,
      ticket: 14000,
      prioridade: 'media',
    },
  ],
  roi: {
    horas_atuais_semana: 22,
    horas_apos_semana: 3,
    horas_economizadas_semana: 19,
    custo_atual_mensal: 5500,
    custo_apos_mensal: 750,
    economia_mensal: 4750,
    payback_meses: 10,
    pressupostos:
      '70 clientes × ~1h/mês cobrando documentos = ~17h/sem. + ~5h/sem em triagem manual = 22h/sem. 3 estagiários CLT × R$ 2.500/mês ≈ R$ 16/hora útil. Automação elimina ~85% do tempo manual; residual é revisão humana de casos ambíguos.',
  },
  investimento: {
    setup_total: 44000,
    mensalidade: 3500,
    total_primeiro_ano: 86000,
    observacao:
      'Estimado em ~700 docs/mês (70 clientes × ~10 docs); faixa 500-2.000 docs + overhead por porte. Pagamento por onda entregue.',
  },
  cronograma: [
    {
      titulo: 'Kickoff + mapeamento detalhado',
      periodo: 'Semanas 1-2',
      descricao: 'Acessos, integração com WhatsApp e Nibo, validação dos fluxos de cobrança',
    },
    {
      titulo: 'Onda 1 — Cobrança + painel entregue',
      periodo: 'Semana 6',
      descricao: 'Régua automática em produção. Painel disponível pra você e estagiários',
    },
    {
      titulo: 'Onda 2 — Triagem inteligente',
      periodo: 'Semanas 7-14',
      descricao: 'OCR + classificação automática. Fila de revisão pros casos ambíguos',
    },
    {
      titulo: 'Onda 3 — Integração com Nibo',
      periodo: 'Semanas 15-20',
      descricao: 'API direta de lançamento, com trilha de auditoria pra revisão',
    },
  ],
  proximos_passos: [
    'Resposta sobre seguir ou não em até 5 dias úteis',
    'Onboarding com dados, acessos e ponto focal técnico na semana 1',
    'Primeira entrega (Onda 1) em até 6 semanas a partir do kickoff',
    'Modelo de pagamento por onda entregue — sem ancoragem em multas ou cláusulas',
  ],
  fechamento: {
    mensagem: 'Decida sem pressa.\nQuando estiver pronto, a gente começa.',
  },
});

async function main() {
  const out = process.argv[2] ?? '/tmp/qa-proposal.pptx';
  const buf = await renderProposalPptx(mock);
  writeFileSync(out, buf);
  console.log(`wrote ${out} (${buf.length} bytes, 9 slides)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

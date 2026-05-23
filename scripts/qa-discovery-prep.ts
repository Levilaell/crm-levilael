// QA visual: gera um PPTX de teste com dados mockados (Contabilliza /
// Rosana Valerio) usando o template puro — não chama Claude, só valida
// o renderer.
//
// Uso: pnpm exec tsx scripts/qa-discovery-prep.ts [out_path]
//      out_path default: /tmp/qa-discovery-prep.pptx

import { writeFileSync } from 'node:fs';
import { renderDiscoveryPrepPptx } from '../lib/pptx/discovery-prep-template';
import { DiscoveryPrepDataSchema } from '../lib/prompts/discovery-prep-pptx';

const mock = DiscoveryPrepDataSchema.parse({
  meta: {
    escritorio: 'Contabilliza',
    contato: 'Rosana Valerio',
    mes_ano: 'Maio de 2026',
  },
  dores_resgatadas: [
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
  agenda: [
    { titulo: 'Entradas — de onde chegam os documentos', timebox_min: 10 },
    { titulo: 'Central — como triagem e monitoramento funcionam', timebox_min: 15 },
    { titulo: 'Saída — como é feito o lançamento hoje', timebox_min: 10 },
    { titulo: 'Volume, time e próximos passos', timebox_min: 10 },
  ],
  blocos_perguntas: [
    {
      bloco_numero: 1,
      tema_kicker: 'BLOCO 1 · ENTRADAS',
      pergunta_principal: 'De onde chegam os documentos?',
      perguntas: [
        {
          texto:
            'Quando um cliente manda documento hoje, por onde ele chega com mais frequência — email, WhatsApp, Nibo, outro canal?',
          intencao: 'Confirma quais entradas precisamos construir primeiro',
        },
        {
          texto: 'Esses documentos chegam em que formato — PDF, foto, XML de NF-e?',
          intencao: 'Define o tipo de processamento: OCR, parser XML ou leitura de imagem',
        },
        {
          texto: 'Tem algum canal que você já tentou usar e abandonou? O que travou?',
          intencao: 'Evita repetir o que não funcionou e revela resistência do cliente final',
        },
      ],
    },
    {
      bloco_numero: 2,
      tema_kicker: 'BLOCO 2 · CENTRAL DE CONTROLE',
      pergunta_principal: 'Como funciona a triagem hoje?',
      perguntas: [
        {
          texto:
            'Quando um documento chega, quem é o primeiro a ver e o que essa pessoa faz com ele?',
          intencao: 'Mapeia o fluxo atual que vamos automatizar — onde está o gargalo humano',
        },
        {
          texto:
            'Como você sabe hoje que um cliente entregou tudo que precisava — tem lista, planilha, sistema?',
          intencao:
            'Confirma ausência de controle centralizado — justifica o painel de monitoramento',
        },
        {
          texto:
            'Como o escritório identifica que aquele documento pertence ao cliente X? Por CNPJ, email de quem enviou, outro critério?',
          intencao: 'Define a lógica de identificação automática na central',
        },
      ],
    },
    {
      bloco_numero: 2,
      tema_kicker: 'BLOCO 2 · CENTRAL DE CONTROLE',
      pergunta_principal: 'Como funciona a cobrança de documentos?',
      perguntas: [
        {
          texto:
            'Quando um documento não chega no prazo, quem cobra — estagiário, você? Por qual canal?',
          intencao: 'Mapeia exatamente o que o sistema vai substituir na régua de cobrança',
        },
        {
          texto:
            'Quantas horas por semana os estagiários gastam só cobrando documento versus tarefas que você considera produtivas?',
          intencao: 'Quantifica a dor — esse número vira o ROI da proposta',
        },
        {
          texto:
            'Quando algo passa despercebido — documento que não chegou — qual é o impacto concreto? Retrabalho, multa, cliente insatisfeito?',
          intencao: 'Mede o custo real do problema atual',
        },
      ],
    },
    {
      bloco_numero: 3,
      tema_kicker: 'BLOCO 3 · SAÍDA',
      pergunta_principal: 'Como é feito o lançamento no sistema contábil?',
      perguntas: [
        {
          texto:
            'Depois que o documento chega e é classificado, o que acontece? Alguém lança manualmente no Nibo ou tem alguma importação?',
          intencao: 'Define se a saída é lançamento via API ou geração de arquivo para importação',
        },
        {
          texto:
            'O Nibo tem portal ou app que os clientes deveriam usar — o que faz eles não usarem de verdade?',
          intencao: 'Entende o gap entre o que o Nibo oferece e o que vamos construir por cima',
        },
        {
          texto:
            'Quando o lançamento é feito, quem confere se está correto — estagiário, você? Quanto tempo isso leva?',
          intencao:
            'Define onde entra a revisão humana no sistema — o que nunca vai ser 100% automatizado',
        },
      ],
    },
    {
      bloco_numero: 4,
      tema_kicker: 'BLOCO 4 · VOLUME E TIME',
      pergunta_principal: 'Dimensionando o projeto',
      perguntas: [
        {
          texto:
            'Dos 70 clientes, quantos mandam documento todo mês vs. os que mandam só quando precisam?',
          intencao: 'Dimensiona o volume real de processamento do sistema',
        },
        {
          texto:
            'Aquele estagiário com facilidade em tecnologia — ele consegue dedicar algumas horas por semana durante a implantação?',
          intencao:
            'Confirma ponto focal interno para validação e testes — reduz risco de entrega',
        },
        {
          texto:
            'A migração pro Microsoft 365 — tem prazo definido? Isso pode impactar a ordem do que a gente constrói primeiro.',
          intencao:
            'Risco técnico real: se migrar no meio do projeto, a integração de email muda',
        },
      ],
    },
  ],
  resumo_quadrantes: [
    { titulo: 'Entradas confirmadas', subtitulo: 'Canais e formatos de documento' },
    { titulo: 'Gargalos identificados', subtitulo: 'Onde está o trabalho improdutivo' },
    { titulo: 'Saída e sistema contábil', subtitulo: 'Como é feito o lançamento hoje' },
    { titulo: 'Prioridade da Onda 1', subtitulo: 'O que resolvemos primeiro' },
  ],
  proximos_passos: [
    'Proposta em etapas em até 5 dias úteis — começando pelo que mais trava hoje',
    'Para cada onda: o que resolve, horas economizadas e investimento',
    'Call de proposta de 30 minutos — apresentação e dúvidas',
    'Decisão sem compromisso — sem pressão de prazo artificial',
  ],
});

async function main() {
  const out = process.argv[2] ?? '/tmp/qa-discovery-prep.pptx';
  const buf = await renderDiscoveryPrepPptx(mock);
  writeFileSync(out, buf);
  console.log(
    `wrote ${out} (${buf.length} bytes, ${mock.blocos_perguntas.length + 6} slides)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

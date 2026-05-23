import pptxgen from 'pptxgenjs';
import type { ProposalPptxData } from '@/lib/prompts/proposal-pptx';
import {
  PALETTE,
  FONT_SERIF,
  FONT_SANS,
  xp,
  yp,
  addLightHeader,
  addDarkHeader,
  addDarkFooter,
  addCoverSlide,
  addArchColumn,
  addNextStepsSlide,
  coerceToBuffer,
  type Slide,
} from './_shared';

// ============================================================================
// Renderer puro pro PPTX da CALL DE PROPOSTA.
// 9 slides: Capa / Resumo / Arquitetura / Ondas / ROI / Investimento /
// Cronograma / Próximos passos / Fechamento.
// ============================================================================

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(
    v,
  );

const fmtBRLCompact = (v: number) => {
  if (v >= 1000) {
    const k = (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1);
    return `R$ ${k}k`;
  }
  return `R$ ${v}`;
};

// ---------------------------------------------------------------------------
// Helpers locais ao template de proposta
// ---------------------------------------------------------------------------

// Card de onda usado no slide 4. Suporta layout 1, 2 ou 3 ondas.
function addOndaCard(
  slide: Slide,
  pres: pptxgen,
  opts: { x: number; w: number; numero: number; titulo: string; dorResolvida: string; escopo: string[]; ticket: number; duracaoSemanas: number },
) {
  const cy = 39;
  const ch = 54;
  // Card bg
  slide.addShape(pres.ShapeType.rect, {
    x: xp(opts.x),
    y: yp(cy),
    w: xp(opts.w),
    h: yp(ch),
    fill: { color: PALETTE.cardWhite },
    line: { type: 'none' },
  });
  // Accent left bar
  slide.addShape(pres.ShapeType.rect, {
    x: xp(opts.x),
    y: yp(cy),
    w: xp(1),
    h: yp(ch),
    fill: { color: PALETTE.accent },
    line: { type: 'none' },
  });
  // Número grande
  slide.addText(`0${opts.numero}`, {
    x: xp(opts.x + 2),
    y: yp(cy + 3),
    w: xp(8),
    h: yp(8),
    fontFace: FONT_SERIF,
    fontSize: 18,
    bold: true,
    color: PALETTE.accent,
    valign: 'middle',
  });
  // Título
  slide.addText(opts.titulo, {
    x: xp(opts.x + 2),
    y: yp(cy + 12),
    w: xp(opts.w - 4),
    h: yp(9),
    fontFace: FONT_SANS,
    fontSize: 13,
    bold: true,
    color: PALETTE.textDark,
    valign: 'top',
  });
  // Dor resolvida
  slide.addText(`Resolve: ${opts.dorResolvida}`, {
    x: xp(opts.x + 2),
    y: yp(cy + 22),
    w: xp(opts.w - 4),
    h: yp(6),
    fontFace: FONT_SANS,
    fontSize: 9.5,
    italic: true,
    color: PALETTE.muted,
    valign: 'top',
  });
  // Escopo bullets — gap maior + fontSize menor + fit:shrink pra evitar
  // overlap quando o texto wrappa em coluna estreita.
  opts.escopo.slice(0, 5).forEach((b, i) => {
    slide.addText(`·  ${b}`, {
      x: xp(opts.x + 2),
      y: yp(cy + 29 + i * 5),
      w: xp(opts.w - 4),
      h: yp(5),
      fontFace: FONT_SANS,
      fontSize: 9.5,
      color: PALETTE.textDark,
      valign: 'middle',
      fit: 'shrink',
    });
  });
  // Footer: ticket + duração
  slide.addText(fmtBRL(opts.ticket), {
    x: xp(opts.x + 2),
    y: yp(cy + ch - 6),
    w: xp((opts.w - 4) / 2),
    h: yp(5),
    fontFace: FONT_SANS,
    fontSize: 12,
    bold: true,
    color: PALETTE.accent,
    valign: 'middle',
  });
  slide.addText(`${opts.duracaoSemanas} sem`, {
    x: xp(opts.x + opts.w / 2),
    y: yp(cy + ch - 6),
    w: xp(opts.w / 2 - 2),
    h: yp(5),
    fontFace: FONT_SANS,
    fontSize: 11,
    color: PALETTE.muted,
    align: 'right',
    valign: 'middle',
  });
}

// Stat card usado nos slides ROI e Investimento. Estética igual aos quadrantes
// de resumo do PPTX de descoberta (accent top bar + número grande + sublabel).
function addStatCard(
  slide: Slide,
  pres: pptxgen,
  opts: { x: number; y: number; w: number; h: number; label: string; valor: string; sublabel?: string; destaque?: boolean },
) {
  slide.addShape(pres.ShapeType.rect, {
    x: xp(opts.x),
    y: yp(opts.y),
    w: xp(opts.w),
    h: yp(opts.h),
    fill: { color: PALETTE.cardWhite },
    line: { type: 'none' },
  });
  slide.addShape(pres.ShapeType.rect, {
    x: xp(opts.x),
    y: yp(opts.y),
    w: xp(opts.w),
    h: 0.05,
    fill: { color: PALETTE.accent },
    line: { type: 'none' },
  });
  // Label topo (muted, small)
  slide.addText(opts.label, {
    x: xp(opts.x + 2),
    y: yp(opts.y + 3),
    w: xp(opts.w - 4),
    h: yp(5),
    fontFace: FONT_SANS,
    fontSize: 10,
    color: PALETTE.muted,
    valign: 'middle',
  });
  // Valor grande (Georgia bold). fit:shrink protege valores longos como
  // "R$ 110.000" em colunas estreitas.
  slide.addText(opts.valor, {
    x: xp(opts.x + 2),
    y: yp(opts.y + 9),
    w: xp(opts.w - 4),
    h: yp(opts.h - (opts.sublabel ? 18 : 12)),
    fontFace: FONT_SERIF,
    fontSize: opts.destaque ? 32 : 26,
    bold: true,
    color: PALETTE.textDark,
    valign: 'middle',
    fit: 'shrink',
  });
  if (opts.sublabel) {
    slide.addText(opts.sublabel, {
      x: xp(opts.x + 2),
      y: yp(opts.y + opts.h - 7),
      w: xp(opts.w - 4),
      h: yp(5),
      fontFace: FONT_SANS,
      fontSize: 9,
      color: PALETTE.muted,
      valign: 'middle',
    });
  }
}

// ---------------------------------------------------------------------------
// Render principal
// ---------------------------------------------------------------------------

export async function renderProposalPptx(data: ProposalPptxData): Promise<Buffer> {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9';
  pres.title = `Proposta — ${data.meta.escritorio}`;
  pres.company = 'Levi Lael';
  pres.subject = 'Call de proposta';
  pres.author = 'Levi Lael';

  // ----- Slide 1: Capa -----
  addCoverSlide(pres.addSlide(), pres, {
    subhead: 'Proposta de automação',
    escritorio: data.meta.escritorio,
    contato: data.meta.contato,
    mesAno: data.meta.mes_ano,
  });

  // ----- Slide 2: Resumo do diagnóstico (2 colunas: Dores | Confirmações) -----
  const s2 = pres.addSlide();
  s2.background = { color: PALETTE.lightBg };
  addLightHeader(s2, pres, 'RESUMO DO DIAGNÓSTICO', 'O que mapeamos juntos', 30);
  // Coluna esquerda — Dores
  s2.addText('DORES MAPEADAS', {
    x: xp(6),
    y: yp(36),
    w: xp(44),
    h: yp(5),
    fontFace: FONT_SANS,
    fontSize: 9,
    bold: true,
    color: PALETTE.accent,
    valign: 'middle',
  });
  data.resumo_diagnostico.dores.forEach((dor, i) => {
    const cy = 42 + i * 13;
    s2.addShape(pres.ShapeType.rect, {
      x: xp(6),
      y: yp(cy),
      w: xp(44),
      h: yp(12),
      fill: { color: PALETTE.cardWhite },
      line: { type: 'none' },
    });
    s2.addShape(pres.ShapeType.rect, {
      x: xp(6),
      y: yp(cy),
      w: xp(1),
      h: yp(12),
      fill: { color: PALETTE.accent },
      line: { type: 'none' },
    });
    s2.addText(dor.titulo, {
      x: xp(8),
      y: yp(cy + 1),
      w: xp(41),
      h: yp(5),
      fontFace: FONT_SANS,
      fontSize: 11,
      bold: true,
      color: PALETTE.textDark,
      valign: 'middle',
    });
    s2.addText(dor.descricao, {
      x: xp(8),
      y: yp(cy + 6),
      w: xp(41),
      h: yp(5),
      fontFace: FONT_SANS,
      fontSize: 9,
      color: PALETTE.muted,
      valign: 'middle',
    });
  });
  // Coluna direita — Confirmações
  s2.addText('O QUE CONFIRMAMOS', {
    x: xp(52),
    y: yp(36),
    w: xp(44),
    h: yp(5),
    fontFace: FONT_SANS,
    fontSize: 9,
    bold: true,
    color: PALETTE.accent,
    valign: 'middle',
  });
  data.resumo_diagnostico.confirmacoes.forEach((conf, i) => {
    const cy = 42 + i * 13;
    s2.addShape(pres.ShapeType.rect, {
      x: xp(52),
      y: yp(cy),
      w: xp(44),
      h: yp(12),
      fill: { color: PALETTE.cardWhite },
      line: { type: 'none' },
    });
    s2.addText('✓', {
      x: xp(53),
      y: yp(cy + 1),
      w: xp(4),
      h: yp(10),
      fontFace: FONT_SERIF,
      fontSize: 18,
      bold: true,
      color: PALETTE.accent,
      align: 'center',
      valign: 'middle',
    });
    s2.addText(conf, {
      x: xp(58),
      y: yp(cy + 1),
      w: xp(37),
      h: yp(10),
      fontFace: FONT_SANS,
      fontSize: 10.5,
      color: PALETTE.textDark,
      valign: 'middle',
    });
  });

  // ----- Slide 3: Arquitetura -----
  const s3 = pres.addSlide();
  s3.background = { color: PALETTE.darkBg };
  addDarkHeader(s3, pres, 'ARQUITETURA DA SOLUÇÃO', 'O que vamos construir', 34);
  addArchColumn(s3, pres, {
    x: 4,
    w: 30,
    kicker: 'ENTRADAS',
    subtitle: 'De onde chegam os documentos',
    bullets: data.arquitetura.entradas,
    accent: false,
  });
  addArchColumn(s3, pres, {
    x: 35,
    w: 30,
    kicker: 'CENTRAL DE CONTROLE',
    subtitle: 'Triagem, classificação e monitoramento',
    bullets: data.arquitetura.central,
    accent: true,
  });
  addArchColumn(s3, pres, {
    x: 66,
    w: 30,
    kicker: 'SAÍDA',
    subtitle: 'Uma única saída para o sistema contábil',
    bullets: data.arquitetura.saida,
    accent: false,
  });
  s3.addText('→', {
    x: xp(33),
    y: yp(67),
    w: xp(2),
    h: yp(7),
    fontFace: FONT_SANS,
    fontSize: 14,
    color: PALETTE.accent,
    align: 'center',
    valign: 'middle',
  });
  s3.addText('→', {
    x: xp(65),
    y: yp(67),
    w: xp(2),
    h: yp(7),
    fontFace: FONT_SANS,
    fontSize: 14,
    color: PALETTE.accent,
    align: 'center',
    valign: 'middle',
  });
  addDarkFooter(s3);

  // ----- Slide 4: Ondas -----
  const s4 = pres.addSlide();
  s4.background = { color: PALETTE.lightBg };
  addLightHeader(
    s4,
    pres,
    'AS ONDAS',
    data.ondas.length === 1
      ? 'A onda que resolve primeiro'
      : `As ${data.ondas.length} ondas do projeto`,
    30,
  );
  // Layout adapta ao número de ondas
  const n = data.ondas.length;
  const positions: { x: number; w: number }[] =
    n === 1
      ? [{ x: 20, w: 60 }]
      : n === 2
        ? [
            { x: 6, w: 44 },
            { x: 51, w: 44 },
          ]
        : [
            { x: 5, w: 29 },
            { x: 36, w: 29 },
            { x: 67, w: 29 },
          ];
  data.ondas.forEach((onda, i) => {
    const pos = positions[i]!;
    addOndaCard(s4, pres, {
      x: pos.x,
      w: pos.w,
      numero: onda.numero,
      titulo: onda.titulo,
      dorResolvida: onda.dor_resolvida,
      escopo: onda.escopo,
      ticket: onda.ticket,
      duracaoSemanas: onda.duracao_semanas,
    });
  });

  // ----- Slide 5: ROI -----
  const s5 = pres.addSlide();
  s5.background = { color: PALETTE.lightBg };
  addLightHeader(s5, pres, 'ROI ESTIMADO', 'Por que vale a pena', 30);
  // 3 stats topo
  addStatCard(s5, pres, {
    x: 6,
    y: 37,
    w: 29,
    h: 32,
    label: 'HORAS ECONOMIZADAS / SEMANA',
    valor: `${data.roi.horas_economizadas_semana}h`,
    sublabel: `de ${data.roi.horas_atuais_semana}h hoje pra ${data.roi.horas_apos_semana}h`,
    destaque: true,
  });
  addStatCard(s5, pres, {
    x: 36,
    y: 37,
    w: 29,
    h: 32,
    label: 'ECONOMIA MENSAL',
    valor: fmtBRL(data.roi.economia_mensal),
    sublabel: `de ${fmtBRLCompact(data.roi.custo_atual_mensal)}/mês pra ${fmtBRLCompact(data.roi.custo_apos_mensal)}/mês`,
    destaque: true,
  });
  addStatCard(s5, pres, {
    x: 66,
    y: 37,
    w: 29,
    h: 32,
    label: 'PAYBACK',
    valor: `${data.roi.payback_meses} meses`,
    sublabel: 'pra o investimento se pagar',
    destaque: true,
  });
  // Pressupostos no rodapé
  s5.addText('Pressupostos:', {
    x: xp(6),
    y: yp(76),
    w: xp(20),
    h: yp(4),
    fontFace: FONT_SANS,
    fontSize: 9,
    bold: true,
    color: PALETTE.accent,
    valign: 'middle',
  });
  s5.addText(data.roi.pressupostos, {
    x: xp(6),
    y: yp(80),
    w: xp(90),
    h: yp(15),
    fontFace: FONT_SANS,
    fontSize: 10.5,
    color: PALETTE.muted,
    valign: 'top',
  });

  // ----- Slide 6: Investimento -----
  const s6 = pres.addSlide();
  s6.background = { color: PALETTE.lightBg };
  addLightHeader(s6, pres, 'INVESTIMENTO', 'Quanto custa', 30);
  addStatCard(s6, pres, {
    x: 6,
    y: 37,
    w: 29,
    h: 32,
    label: 'SETUP (UMA VEZ)',
    valor: fmtBRL(data.investimento.setup_total),
    sublabel: 'pago por onda entregue',
  });
  addStatCard(s6, pres, {
    x: 36,
    y: 37,
    w: 29,
    h: 32,
    label: 'MENSALIDADE',
    valor: fmtBRL(data.investimento.mensalidade),
    sublabel: 'suporte + manutenção mensal',
  });
  addStatCard(s6, pres, {
    x: 66,
    y: 37,
    w: 29,
    h: 32,
    label: 'TOTAL 1º ANO',
    valor: fmtBRL(data.investimento.total_primeiro_ano),
    sublabel: 'setup + 12 mensalidades',
    destaque: true,
  });
  s6.addText(data.investimento.observacao, {
    x: xp(6),
    y: yp(80),
    w: xp(90),
    h: yp(8),
    fontFace: FONT_SERIF,
    fontSize: 12,
    italic: true,
    color: PALETTE.muted,
    valign: 'top',
  });

  // ----- Slide 7: Cronograma -----
  const s7 = pres.addSlide();
  s7.background = { color: PALETTE.lightBg };
  addLightHeader(s7, pres, 'CRONOGRAMA', 'Quando entrega', 30);
  // Lista vertical de marcos. Suporta 3-6 itens. Cada item h=9%, y starts at 37%.
  const itemH = Math.min(11, (95 - 37) / data.cronograma.length);
  data.cronograma.forEach((marco, i) => {
    const cy = 37 + i * (itemH + 1);
    s7.addShape(pres.ShapeType.rect, {
      x: xp(6),
      y: yp(cy),
      w: xp(89),
      h: yp(itemH),
      fill: { color: PALETTE.cardWhite },
      line: { type: 'none' },
    });
    s7.addShape(pres.ShapeType.rect, {
      x: xp(6),
      y: yp(cy),
      w: xp(1),
      h: yp(itemH),
      fill: { color: PALETTE.accent },
      line: { type: 'none' },
    });
    // Período (Georgia bold accent)
    s7.addText(marco.periodo, {
      x: xp(8),
      y: yp(cy),
      w: xp(20),
      h: yp(itemH),
      fontFace: FONT_SERIF,
      fontSize: 13,
      bold: true,
      color: PALETTE.accent,
      valign: 'middle',
    });
    // Título
    s7.addText(marco.titulo, {
      x: xp(29),
      y: yp(cy + 1),
      w: xp(66),
      h: yp(itemH / 2),
      fontFace: FONT_SANS,
      fontSize: 12,
      bold: true,
      color: PALETTE.textDark,
      valign: 'middle',
    });
    // Descrição
    s7.addText(marco.descricao, {
      x: xp(29),
      y: yp(cy + itemH / 2),
      w: xp(66),
      h: yp(itemH / 2 - 1),
      fontFace: FONT_SANS,
      fontSize: 10,
      color: PALETTE.muted,
      valign: 'middle',
    });
  });

  // ----- Slide 8: Próximos passos -----
  addNextStepsSlide(pres.addSlide(), pres, {
    kicker: 'PRÓXIMOS PASSOS',
    title: ['O que acontece', 'se decidir seguir'],
    passos: data.proximos_passos,
    titleSize: 38,
  });

  // ----- Slide 9: Fechamento -----
  const s9 = pres.addSlide();
  s9.background = { color: PALETTE.darkBg };
  s9.addText('LEVI LAEL', {
    x: xp(6),
    y: yp(7),
    w: xp(30),
    h: yp(6),
    fontFace: FONT_SANS,
    fontSize: 11,
    bold: true,
    color: PALETTE.accent,
    valign: 'middle',
  });
  s9.addShape(pres.ShapeType.rect, {
    x: xp(6),
    y: yp(15),
    w: xp(11),
    h: 0.04,
    fill: { color: PALETTE.accent },
    line: { type: 'none' },
  });
  s9.addText(data.fechamento.mensagem, {
    x: xp(6),
    y: yp(38),
    w: xp(88),
    h: yp(30),
    fontFace: FONT_SERIF,
    fontSize: 30,
    bold: true,
    color: PALETTE.textWhite,
    valign: 'middle',
  });
  s9.addText('Pronto pra começar pelo que mais trava.', {
    x: xp(6),
    y: yp(75),
    w: xp(88),
    h: yp(6),
    fontFace: FONT_SERIF,
    fontSize: 14,
    color: PALETTE.accent,
    valign: 'middle',
  });
  addDarkFooter(s9);

  return coerceToBuffer(await pres.write({ outputType: 'nodebuffer' }));
}

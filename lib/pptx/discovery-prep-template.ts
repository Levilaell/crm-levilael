import pptxgen from 'pptxgenjs';
import type { DiscoveryPrepData } from '@/lib/prompts/discovery-prep-pptx';
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
// Renderer puro pro PPTX de PREPARAÇÃO da call de descoberta.
// 11 slides, gabarito references/diagnostico_contabilliza_v3.pptx.
// ============================================================================

// Card de pergunta usado nos slides 5-9. Específico do template de descoberta.
function addQuestionCard(
  slide: Slide,
  pres: pptxgen,
  opts: { idx: 0 | 1 | 2; numero: number; pergunta: string; intencao: string },
) {
  const cardYs = [34, 55, 76] as const;
  const cy = cardYs[opts.idx]!;
  slide.addShape(pres.ShapeType.rect, {
    x: xp(6),
    y: yp(cy),
    w: xp(89),
    h: yp(19),
    fill: { color: PALETTE.cardWhite },
    line: { type: 'none' },
  });
  slide.addShape(pres.ShapeType.rect, {
    x: xp(6),
    y: yp(cy),
    w: xp(1),
    h: yp(19),
    fill: { color: PALETTE.accent },
    line: { type: 'none' },
  });
  slide.addText(String(opts.numero), {
    x: xp(7),
    y: yp(cy + 3),
    w: xp(3),
    h: yp(8),
    fontFace: FONT_SERIF,
    fontSize: 14,
    bold: true,
    color: PALETTE.accent,
    valign: 'middle',
  });
  slide.addText(opts.pergunta, {
    x: xp(12),
    y: yp(cy + 3),
    w: xp(79),
    h: yp(8),
    fontFace: FONT_SANS,
    fontSize: 13.5,
    bold: true,
    color: PALETTE.textDark,
    valign: 'top',
  });
  slide.addText(`↳  ${opts.intencao}`, {
    x: xp(12),
    y: yp(cy + 11),
    w: xp(79),
    h: yp(6),
    fontFace: FONT_SANS,
    fontSize: 10.5,
    color: PALETTE.muted,
    valign: 'top',
  });
}

export async function renderDiscoveryPrepPptx(data: DiscoveryPrepData): Promise<Buffer> {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9';
  pres.title = `Diagnóstico — ${data.meta.escritorio}`;
  pres.company = 'Levi Lael';
  pres.subject = 'Preparação da call de descoberta';
  pres.author = 'Levi Lael';

  // ----- Slide 1: Capa -----
  addCoverSlide(pres.addSlide(), pres, {
    subhead: 'Diagnóstico de automação',
    escritorio: data.meta.escritorio,
    contato: data.meta.contato,
    mesAno: data.meta.mes_ano,
  });

  // ----- Slide 2: Dores resgatadas -----
  const s2 = pres.addSlide();
  s2.background = { color: PALETTE.lightBg };
  addLightHeader(s2, pres, 'O QUE ENTENDEMOS ATÉ AQUI', 'As dores que você nos contou', 30);
  const doreYs = [35, 50, 66, 82] as const;
  data.dores_resgatadas.forEach((dor, idx) => {
    const cy = doreYs[idx]!;
    s2.addShape(pres.ShapeType.rect, {
      x: xp(6),
      y: yp(cy),
      w: xp(89),
      h: yp(13),
      fill: { color: PALETTE.cardWhite },
      line: { type: 'none' },
    });
    s2.addShape(pres.ShapeType.rect, {
      x: xp(6),
      y: yp(cy),
      w: xp(1),
      h: yp(13),
      fill: { color: PALETTE.accent },
      line: { type: 'none' },
    });
    s2.addShape(pres.ShapeType.rect, {
      x: xp(7),
      y: yp(cy + 3),
      w: xp(3),
      h: yp(5),
      fill: { color: PALETTE.accent },
      line: { type: 'none' },
    });
    s2.addText(String(idx + 1), {
      x: xp(7),
      y: yp(cy + 3),
      w: xp(3),
      h: yp(5),
      fontFace: FONT_SANS,
      fontSize: 9,
      bold: true,
      color: PALETTE.textDark,
      align: 'center',
      valign: 'middle',
    });
    s2.addText(dor.titulo, {
      x: xp(12),
      y: yp(cy + 1),
      w: xp(83),
      h: yp(5),
      fontFace: FONT_SANS,
      fontSize: 12,
      bold: true,
      color: PALETTE.textDark,
      valign: 'middle',
    });
    s2.addText(dor.descricao, {
      x: xp(12),
      y: yp(cy + 6),
      w: xp(83),
      h: yp(6),
      fontFace: FONT_SANS,
      fontSize: 10,
      color: PALETTE.muted,
      valign: 'middle',
    });
  });

  // ----- Slide 3: Arquitetura -----
  const s3 = pres.addSlide();
  s3.background = { color: PALETTE.darkBg };
  addDarkHeader(s3, pres, 'ARQUITETURA DA SOLUÇÃO', 'Como o sistema vai funcionar', 34);
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

  // ----- Slide 4: Agenda -----
  const s4 = pres.addSlide();
  s4.background = { color: PALETTE.lightBg };
  addLightHeader(s4, pres, 'AGENDA DE HOJE', 'Como vai funcionar a call', 30);
  const agendaXs = [6, 28, 52, 74] as const;
  data.agenda.forEach((bloco, idx) => {
    const ax = agendaXs[idx]!;
    const isCurrent = idx === 0;
    s4.addShape(pres.ShapeType.rect, {
      x: xp(ax),
      y: yp(36),
      w: xp(21),
      h: yp(39),
      fill: { color: isCurrent ? PALETTE.darkBg : PALETTE.cardWhite },
      line: { type: 'none' },
    });
    s4.addText(`0${idx + 1}`, {
      x: xp(ax + 1),
      y: yp(39),
      w: xp(6),
      h: yp(8),
      fontFace: FONT_SERIF,
      fontSize: 18,
      bold: true,
      color: PALETTE.accent,
      valign: 'middle',
    });
    if (isCurrent) {
      s4.addShape(pres.ShapeType.rect, {
        x: xp(ax + 12),
        y: yp(39),
        w: xp(7),
        h: yp(5),
        fill: { color: PALETTE.accent },
        line: { type: 'none' },
      });
      s4.addText('ATUAL', {
        x: xp(ax + 12),
        y: yp(39),
        w: xp(7),
        h: yp(5),
        fontFace: FONT_SANS,
        fontSize: 7,
        bold: true,
        color: PALETTE.textDark,
        align: 'center',
        valign: 'middle',
      });
    }
    s4.addText(bloco.titulo, {
      x: xp(ax + 1),
      y: yp(54),
      w: xp(18),
      h: yp(14),
      fontFace: FONT_SANS,
      fontSize: 12,
      bold: true,
      color: isCurrent ? PALETTE.textWhite : PALETTE.textDark,
      valign: 'top',
    });
    s4.addText(`${bloco.timebox_min} min`, {
      x: xp(ax + 1),
      y: yp(69),
      w: xp(18),
      h: yp(4),
      fontFace: FONT_SANS,
      fontSize: 10,
      color: PALETTE.muted,
      valign: 'middle',
    });
  });
  s4.addText('Ao final: proposta sob medida em até 5 dias úteis.', {
    x: xp(6),
    y: yp(91),
    w: xp(90),
    h: yp(5),
    fontFace: FONT_SERIF,
    fontSize: 10,
    color: PALETTE.muted,
    valign: 'middle',
  });

  // ----- Slides 5-9: Blocos de perguntas -----
  data.blocos_perguntas.forEach((bloco) => {
    const sb = pres.addSlide();
    sb.background = { color: PALETTE.lightBg };
    addLightHeader(sb, pres, bloco.tema_kicker, bloco.pergunta_principal, 28);
    bloco.perguntas.forEach((q, qi) => {
      addQuestionCard(sb, pres, {
        idx: qi as 0 | 1 | 2,
        numero: qi + 1,
        pergunta: q.texto,
        intencao: q.intencao,
      });
    });
  });

  // ----- Slide 10: Resumo preenchido ao vivo -----
  const s10 = pres.addSlide();
  s10.background = { color: PALETTE.lightBg };
  addLightHeader(s10, pres, 'RESUMO · PREENCHIDO AO VIVO', 'O que mapeamos hoje', 30);
  const quadPositions = [
    { x: 6, y: 35 },
    { x: 52, y: 35 },
    { x: 6, y: 65 },
    { x: 52, y: 65 },
  ] as const;
  data.resumo_quadrantes.forEach((q, idx) => {
    const { x, y } = quadPositions[idx]!;
    s10.addShape(pres.ShapeType.rect, {
      x: xp(x),
      y: yp(y),
      w: xp(44),
      h: yp(27),
      fill: { color: PALETTE.cardWhite },
      line: { type: 'none' },
    });
    s10.addShape(pres.ShapeType.rect, {
      x: xp(x),
      y: yp(y),
      w: xp(44),
      h: 0.05,
      fill: { color: PALETTE.accent },
      line: { type: 'none' },
    });
    s10.addText(q.titulo, {
      x: xp(x + 1),
      y: yp(y + 3),
      w: xp(42),
      h: yp(6),
      fontFace: FONT_SANS,
      fontSize: 12,
      bold: true,
      color: PALETTE.textDark,
      valign: 'middle',
    });
    s10.addText(q.subtitulo, {
      x: xp(x + 1),
      y: yp(y + 9),
      w: xp(42),
      h: yp(4),
      fontFace: FONT_SANS,
      fontSize: 10,
      color: PALETTE.muted,
      valign: 'middle',
    });
    s10.addText('→ Preencher ao vivo', {
      x: xp(x + 1),
      y: yp(y + 16),
      w: xp(42),
      h: yp(7),
      fontFace: FONT_SERIF,
      fontSize: 11,
      color: PALETTE.divLight,
      valign: 'middle',
    });
  });

  // ----- Slide 11: Próximos passos -----
  addNextStepsSlide(pres.addSlide(), pres, {
    kicker: 'PRÓXIMOS PASSOS',
    title: ['O que acontece', 'depois dessa call'],
    passos: data.proximos_passos,
    titleSize: 38,
  });

  return coerceToBuffer(await pres.write({ outputType: 'nodebuffer' }));
}

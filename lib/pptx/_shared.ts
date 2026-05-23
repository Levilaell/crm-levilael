import type pptxgen from 'pptxgenjs';

// ============================================================================
// Estilo compartilhado entre os templates PPTX da Levi Lael.
// Paleta, fontes, canvas e helpers de cabeçalho/rodapé extraídos do gabarito
// references/diagnostico_contabilliza_v3.pptx.
// ============================================================================

export const W_IN = 10;
export const H_IN = 5.625;

export const xp = (pct: number) => +((W_IN * pct) / 100).toFixed(3);
export const yp = (pct: number) => +((H_IN * pct) / 100).toFixed(3);

export const PALETTE = {
  darkBg: '1A1A1A',
  lightBg: 'F5F0E8',
  cardWhite: 'FFFFFF',
  cardDark: '2A2A2A',
  accent: 'F5A623',
  accentDark: 'CC8800',
  divLight: 'DEDBD3',
  divDark: '3A3A3A',
  muted: '999999',
  textDark: '1A1A1A',
  textWhite: 'FFFFFF',
  textBulletDark: 'CCCCCC',
} as const;

export const FONT_SERIF = 'Georgia';
export const FONT_SANS = 'Calibri';

export type Slide = ReturnType<pptxgen['addSlide']>;

// ---------------------------------------------------------------------------
// Cabeçalhos
// ---------------------------------------------------------------------------

export function addLightHeader(
  slide: Slide,
  pres: pptxgen,
  kicker: string,
  title: string,
  titleSize = 28,
) {
  slide.addText(kicker, {
    x: xp(6),
    y: yp(7),
    w: xp(90),
    h: yp(6),
    fontFace: FONT_SANS,
    fontSize: 9,
    bold: true,
    color: PALETTE.accent,
    valign: 'middle',
  });
  slide.addText(title, {
    x: xp(6),
    y: yp(13),
    w: xp(90),
    h: yp(20),
    fontFace: FONT_SERIF,
    fontSize: titleSize,
    bold: true,
    color: PALETTE.textDark,
    valign: 'top',
  });
  slide.addShape(pres.ShapeType.rect, {
    x: xp(6),
    y: yp(33),
    w: xp(90),
    h: 0.02,
    fill: { color: PALETTE.divLight },
    line: { type: 'none' },
  });
}

export function addDarkHeader(
  slide: Slide,
  pres: pptxgen,
  kicker: string,
  title: string | string[],
  titleSize = 30,
) {
  slide.addText('LEVI LAEL', {
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
  slide.addShape(pres.ShapeType.rect, {
    x: xp(6),
    y: yp(15),
    w: xp(11),
    h: 0.04,
    fill: { color: PALETTE.accent },
    line: { type: 'none' },
  });
  slide.addText(kicker, {
    x: xp(6),
    y: yp(21),
    w: xp(90),
    h: yp(6),
    fontFace: FONT_SANS,
    fontSize: 9,
    bold: true,
    color: PALETTE.accent,
    valign: 'middle',
  });
  const titleH = titleSize > 35 ? 23 : 16;
  const titleContent: string | { text: string; options?: { breakLine?: boolean } }[] =
    Array.isArray(title)
      ? title.map((line, i) => ({
          text: line,
          options: i < title.length - 1 ? { breakLine: true } : undefined,
        }))
      : title;
  slide.addText(titleContent, {
    x: xp(6),
    y: yp(28),
    w: xp(90),
    h: yp(titleH),
    fontFace: FONT_SERIF,
    fontSize: titleSize,
    bold: true,
    color: PALETTE.textWhite,
    valign: 'top',
  });
}

export function addDarkFooter(slide: Slide) {
  slide.addText('levilael.com.br', {
    x: xp(75),
    y: yp(92),
    w: xp(22),
    h: yp(5),
    fontFace: FONT_SANS,
    fontSize: 10,
    color: PALETTE.muted,
    align: 'right',
    valign: 'middle',
  });
}

// ---------------------------------------------------------------------------
// Capa padrão (dark): brand + linha + sub-header opcional + escritório gigante
// + Para: contato + mês/ano + URL. Reusado em discovery_prep e proposal.
// ---------------------------------------------------------------------------

export function addCoverSlide(
  slide: Slide,
  pres: pptxgen,
  args: { subhead: string; escritorio: string; contato: string; mesAno: string },
) {
  slide.background = { color: PALETTE.darkBg };
  slide.addText('LEVI LAEL', {
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
  slide.addShape(pres.ShapeType.rect, {
    x: xp(6),
    y: yp(15),
    w: xp(11),
    h: 0.04,
    fill: { color: PALETTE.accent },
    line: { type: 'none' },
  });
  slide.addText(args.subhead, {
    x: xp(6),
    y: yp(28),
    w: xp(80),
    h: yp(11),
    fontFace: FONT_SERIF,
    fontSize: 22,
    color: PALETTE.accent,
    valign: 'middle',
  });
  slide.addText(args.escritorio, {
    x: xp(6),
    y: yp(39),
    w: xp(90),
    h: yp(27),
    fontFace: FONT_SERIF,
    fontSize: 58,
    bold: true,
    color: PALETTE.textWhite,
    valign: 'top',
  });
  slide.addText('P a r a :', {
    x: xp(6),
    y: yp(71),
    w: xp(20),
    h: yp(5),
    fontFace: FONT_SANS,
    fontSize: 10,
    color: PALETTE.muted,
    valign: 'middle',
  });
  slide.addText(args.contato, {
    x: xp(6),
    y: yp(76),
    w: xp(60),
    h: yp(7),
    fontFace: FONT_SANS,
    fontSize: 16,
    bold: true,
    color: PALETTE.textWhite,
    valign: 'top',
  });
  slide.addText(args.mesAno, {
    x: xp(75),
    y: yp(74),
    w: xp(23),
    h: yp(5),
    fontFace: FONT_SANS,
    fontSize: 11,
    color: PALETTE.muted,
    align: 'right',
    valign: 'middle',
  });
  slide.addText('levilael.com.br', {
    x: xp(75),
    y: yp(80),
    w: xp(23),
    h: yp(5),
    fontFace: FONT_SANS,
    fontSize: 10,
    color: PALETTE.muted,
    align: 'right',
    valign: 'middle',
  });
}

// ---------------------------------------------------------------------------
// Coluna de arquitetura (3 colunas: 2 dark + 1 accent central).
// Usada em discovery_prep e proposal — comportamento idêntico.
// ---------------------------------------------------------------------------

export function addArchColumn(
  slide: Slide,
  pres: pptxgen,
  opts: {
    x: number;
    w: number;
    kicker: string;
    subtitle: string;
    bullets: string[];
    accent: boolean;
  },
) {
  const colY = 44;
  const colH = 53;
  const bg = opts.accent ? PALETTE.accent : PALETTE.cardDark;
  const textColor = opts.accent ? PALETTE.textDark : PALETTE.textWhite;
  const kickerColor = opts.accent ? PALETTE.textDark : PALETTE.accent;
  const subtitleColor = opts.accent ? PALETTE.textDark : PALETTE.muted;
  const dividerColor = opts.accent ? PALETTE.accentDark : PALETTE.divDark;

  slide.addShape(pres.ShapeType.rect, {
    x: xp(opts.x),
    y: yp(colY),
    w: xp(opts.w),
    h: yp(colH),
    fill: { color: bg },
    line: { type: 'none' },
  });
  slide.addText(opts.kicker, {
    x: xp(opts.x + 2),
    y: yp(colY + 3),
    w: xp(opts.w - 4),
    h: yp(6),
    fontFace: FONT_SANS,
    fontSize: 9,
    bold: true,
    color: kickerColor,
    valign: 'middle',
  });
  slide.addText(opts.subtitle, {
    x: xp(opts.x + 2),
    y: yp(colY + 9),
    w: xp(opts.w - 4),
    h: yp(8),
    fontFace: FONT_SANS,
    fontSize: 11,
    color: subtitleColor,
    valign: 'top',
  });
  slide.addShape(pres.ShapeType.rect, {
    x: xp(opts.x + 2),
    y: yp(colY + 18),
    w: xp(opts.w - 4),
    h: 0.02,
    fill: { color: dividerColor },
    line: { type: 'none' },
  });
  opts.bullets.forEach((b, i) => {
    slide.addText(`·  ${b}`, {
      x: xp(opts.x + 2),
      y: yp(colY + 21 + i * 6),
      w: xp(opts.w - 4),
      h: yp(6),
      fontFace: FONT_SANS,
      fontSize: 11.5,
      color: textColor,
      valign: 'middle',
    });
  });
}

// ---------------------------------------------------------------------------
// Slide de próximos passos (dark, 4 itens numerados em coluna).
// Usado em discovery_prep e proposal.
// ---------------------------------------------------------------------------

export function addNextStepsSlide(
  slide: Slide,
  pres: pptxgen,
  args: { kicker: string; title: string | string[]; passos: string[]; titleSize?: number },
) {
  slide.background = { color: PALETTE.darkBg };
  addDarkHeader(slide, pres, args.kicker, args.title, args.titleSize ?? 38);
  const passosYs = [54, 64, 74, 83] as const;
  args.passos.forEach((passo, idx) => {
    const py = passosYs[idx]!;
    slide.addShape(pres.ShapeType.rect, {
      x: xp(6),
      y: yp(py),
      w: xp(4),
      h: yp(6),
      fill: { color: PALETTE.accent },
      line: { type: 'none' },
    });
    slide.addText(String(idx + 1), {
      x: xp(6),
      y: yp(py),
      w: xp(4),
      h: yp(6),
      fontFace: FONT_SANS,
      fontSize: 10,
      bold: true,
      color: PALETTE.textDark,
      align: 'center',
      valign: 'middle',
    });
    slide.addText(passo, {
      x: xp(10),
      y: yp(py),
      w: xp(85),
      h: yp(7),
      fontFace: FONT_SANS,
      fontSize: 13,
      color: PALETTE.textBulletDark,
      valign: 'middle',
    });
  });
  addDarkFooter(slide);
}

// ---------------------------------------------------------------------------
// Helper genérico pra coerce do output do pptx.write em Buffer.
// ---------------------------------------------------------------------------

export function coerceToBuffer(
  out: string | ArrayBuffer | Blob | Uint8Array,
): Buffer {
  if (Buffer.isBuffer(out)) return out;
  if (out instanceof Uint8Array) return Buffer.from(out);
  if (typeof out === 'string') return Buffer.from(out, 'binary');
  if (out instanceof ArrayBuffer) return Buffer.from(out);
  throw new Error('coerceToBuffer: tipo de saída inesperado do pptxgenjs');
}

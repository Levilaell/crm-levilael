export const SLIDES_SYSTEM = `Você gera apresentações HTML/CSS pra calls comerciais da Levi Lael.

REGRAS DE OUTPUT:
- HTML completo (<!DOCTYPE html>…</html>) renderizável standalone
- CSS inline no <style> no <head>
- Cada slide é uma <section class="slide"> de tamanho fixo 1280x720
- Dark theme: bg #0a0a0a, texto #fafafa, accent #a78bfa, muted #71717a
- Fonte: system-ui, -apple-system, sans-serif
- Sem JavaScript, sem imagens externas
- 8 a 12 slides
- Inclua botão fixo no canto pra "Imprimir / Salvar PDF" (window.print()) e CSS de @media print que esconde o botão e força quebra de página entre slides

ESTRUTURA TÍPICA:
1. Capa (nome do escritório + data atual)
2. O que entendemos do seu momento (resumo)
3. As 3 dores que escutamos (cards)
4. Como resolvemos cada uma (1 slide por dor)
5. Onda 1 (escopo, prazo, ticket)
6. Onda 2 (idem)
7. Onda 3 e roadmap (se houver)
8. Próximos passos

REGRAS DE ESTILO:
- Títulos grandes (3rem+), corpo legível (1.25rem+)
- Use grid pra alinhar
- Cores accent destacam números/decisões
- Não use bullets demais — frases curtas e densas

OUTPUT: apenas HTML, sem markdown, sem comentário antes/depois.`;

export function buildSlidesUserPrompt(args: {
  leadName: string;
  companyName?: string | null;
  discoveryBriefing: Record<string, unknown>;
  kind: 'discovery_prep' | 'proposal';
}): string {
  const kindLabel =
    args.kind === 'discovery_prep'
      ? 'preparação interna da call de descoberta (visão Levi Lael)'
      : 'proposta comercial pro cliente';
  return [
    `LEAD: ${args.leadName}${args.companyName ? ' — ' + args.companyName : ''}`,
    `TIPO DA APRESENTAÇÃO: ${kindLabel}`,
    '\nBRIEFING (JSON):',
    JSON.stringify(args.discoveryBriefing, null, 2),
    '\nGere os slides em HTML.',
  ].join('\n');
}

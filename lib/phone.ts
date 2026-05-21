// Normalização de telefone brasileiro pra E.164 (+5511999998888).
// Usado em webhooks pra deduplicar leads por phone e fazer matching
// com diagnosis snapshots.

/**
 * Aceita formatos comuns: "(11) 99999-9999", "11999999999", "+5511999999999",
 * "5511999999999", fixo com 10 dígitos. Retorna null se não couber em formato BR.
 */
export function normalizePhoneBR(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  // já vem com 55 + DDD + 8 ou 9 dígitos
  if (digits.length === 13 && digits.startsWith('55')) {
    if (!isValidDdd(digits.slice(2, 4))) return null;
    return `+${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('55')) {
    // fixo internacional: 55 + DDD + 8 dígitos
    if (!isValidDdd(digits.slice(2, 4))) return null;
    return `+${digits}`;
  }

  // local: DDD + 9 dígitos (celular)
  if (digits.length === 11) {
    if (!isValidDdd(digits.slice(0, 2))) return null;
    return `+55${digits}`;
  }
  // local: DDD + 8 dígitos (fixo)
  if (digits.length === 10) {
    if (!isValidDdd(digits.slice(0, 2))) return null;
    return `+55${digits}`;
  }

  return null;
}

const VALID_DDDS = new Set([
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24', '27', '28',
  '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46',
  '47', '48', '49',
  '51', '53', '54', '55',
  '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79',
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  '91', '92', '93', '94', '95', '96', '97', '98', '99',
]);

function isValidDdd(ddd: string): boolean {
  return VALID_DDDS.has(ddd);
}

/**
 * Formata E.164 pra display BR: +5511999998888 → "(11) 99999-8888".
 * Se já não é E.164 válido, devolve o input cru.
 */
export function formatPhoneBRDisplay(e164: string | null | undefined): string {
  if (!e164) return '';
  const d = e164.replace(/\D/g, '');
  if (d.length === 13 && d.startsWith('55')) {
    const ddd = d.slice(2, 4);
    const part1 = d.slice(4, 9);
    const part2 = d.slice(9);
    return `(${ddd}) ${part1}-${part2}`;
  }
  if (d.length === 12 && d.startsWith('55')) {
    const ddd = d.slice(2, 4);
    const part1 = d.slice(4, 8);
    const part2 = d.slice(8);
    return `(${ddd}) ${part1}-${part2}`;
  }
  return e164;
}

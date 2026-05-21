import type { Qualification } from '@/types/crm';

// SLA por qualificação — quantos minutos sem contato disparam alerta no Telegram.
// Origem: definição do ESTADO_ATUAL da operação (Levi + parceiro). Lead AAA/AA
// precisa ser contatado rápido pra não esfriar; B/C tolera mais. Ajustar aqui
// se a regra mudar — todos os consumidores leem dessa constante.
export const SLA_THRESHOLDS_MIN: Record<Qualification, number> = {
  AAA: 30,
  AA: 30,
  A: 240, // 4h
  B: 1440, // 24h
  C: 1440,
} as const;

// Quanto tempo esperar entre alertas consecutivos do mesmo lead (anti-spam).
export const SLA_REALERT_COOLDOWN_MIN = 60;

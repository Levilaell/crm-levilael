import { createServiceRoleClient } from '@/lib/supabase/service';
import { escapeHtml, leadUrl, sendTelegram } from '@/lib/telegram';
import { formatPhoneBRDisplay } from '@/lib/phone';
import type { LeadSource, Qualification } from '@/types/crm';
import { SOURCE_LABELS } from '@/types/crm';

interface NotifyNewLeadArgs {
  leadId: string;
  name: string;
  companyName?: string | null;
  phone?: string | null;
  email?: string | null;
  source: LeadSource;
  qualification?: Qualification | null;
  diagnosisScore?: number | null;
  matchedDiagnosis?: boolean;
  message?: string | null;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

/**
 * Notifica todos os crm_users com receives_new_leads=true.
 * Retorna quantos foram notificados com sucesso.
 */
export async function notifyNewLead(args: NotifyNewLeadArgs): Promise<number> {
  const admin = createServiceRoleClient();
  const { data: users, error } = await admin
    .from('crm_users')
    .select('telegram_chat_id')
    .eq('receives_new_leads', true);

  if (error || !users?.length) return 0;

  const phoneDisplay = args.phone ? formatPhoneBRDisplay(args.phone) : null;
  const lines: (string | null)[] = [
    `🆕 <b>LEAD:</b> ${escapeHtml(args.name)}`,
    `🔥 Origem: ${SOURCE_LABELS[args.source]}`,
    args.companyName ? `🏢 ${escapeHtml(args.companyName)}` : null,
    phoneDisplay ? `📱 ${escapeHtml(phoneDisplay)}` : null,
    args.email ? `✉️ ${escapeHtml(args.email)}` : null,
  ];
  if (args.matchedDiagnosis) {
    const scoreSuffix = typeof args.diagnosisScore === 'number'
      ? ` (score ${args.diagnosisScore}/100)`
      : '';
    lines.push(`🧠 Tem diagnóstico prévio${scoreSuffix}`);
  }
  if (args.qualification) {
    lines.push(`📊 Qualificação prévia: ${args.qualification}`);
  }
  if (args.message) {
    lines.push(`💬 "${escapeHtml(truncate(args.message, 120))}"`);
  }

  const text = (lines.filter(Boolean) as string[]).join('\n');
  const url = leadUrl(args.leadId, 'overview');

  let sent = 0;
  await Promise.all(
    users.map(async (u) => {
      const chatId = (u as { telegram_chat_id: string | null }).telegram_chat_id;
      if (!chatId) return;
      const res = await sendTelegram(chatId, text, {
        parse_mode: 'HTML',
        inline_keyboard: [[{ text: '🔗 Abrir no CRM', url }]],
      });
      if (res.ok) sent++;
    }),
  );
  return sent;
}

interface NotifyBriefingReadyArgs {
  leadId: string;
  leadName: string;
  kind: 'triage' | 'discovery' | 'solution_draft';
}

export async function notifyBriefingReady(args: NotifyBriefingReadyArgs): Promise<number> {
  const admin = createServiceRoleClient();
  const { data: users } = await admin
    .from('crm_users')
    .select('telegram_chat_id')
    .eq('receives_briefing_ready', true);

  if (!users?.length) return 0;

  const kindLabel =
    args.kind === 'triage'
      ? 'triagem'
      : args.kind === 'discovery'
        ? 'descoberta'
        : 'rascunho de solução';

  const text = `✅ Briefing de <b>${kindLabel}</b> pronto: ${escapeHtml(args.leadName)}`;
  const tab = args.kind === 'triage' ? 'triage' : args.kind === 'discovery' ? 'discovery' : 'solution';
  const url = leadUrl(args.leadId, tab);

  let sent = 0;
  await Promise.all(
    users.map(async (u) => {
      const chatId = (u as { telegram_chat_id: string | null }).telegram_chat_id;
      if (!chatId) return;
      const res = await sendTelegram(chatId, text, {
        parse_mode: 'HTML',
        inline_keyboard: [[{ text: 'Ver briefing', url }]],
      });
      if (res.ok) sent++;
    }),
  );
  return sent;
}

interface NotifySlaArgs {
  leadId: string;
  leadName: string;
  qualification: Qualification;
  minutesSinceContact: number;
}

interface NotifyHealthArgs {
  failures: Array<{ service: string; detail?: string }>;
}

/**
 * Notifica APENAS admins quando health check do cron diário detecta falha.
 * Operadores não recebem (evita ruído pra quem não pode resolver).
 */
export async function notifyHealthFailures(args: NotifyHealthArgs): Promise<number> {
  if (args.failures.length === 0) return 0;
  const admin = createServiceRoleClient();
  const { data: users } = await admin
    .from('crm_users')
    .select('telegram_chat_id')
    .eq('role', 'admin')
    .eq('receives_sla_alerts', true); // reusa o mesmo toggle de alertas críticos
  if (!users?.length) return 0;

  const lines: string[] = ['⚠️ <b>Health check falhou</b>'];
  for (const f of args.failures) {
    const detail = f.detail ? ` — ${escapeHtml(truncate(f.detail, 80))}` : '';
    lines.push(`• ${escapeHtml(f.service)}${detail}`);
  }
  const text = lines.join('\n');

  let sent = 0;
  await Promise.all(
    users.map(async (u) => {
      const chatId = (u as { telegram_chat_id: string | null }).telegram_chat_id;
      if (!chatId) return;
      const res = await sendTelegram(chatId, text, { parse_mode: 'HTML' });
      if (res.ok) sent++;
    }),
  );
  return sent;
}

export async function notifySlaBreach(args: NotifySlaArgs): Promise<number> {
  const admin = createServiceRoleClient();
  const { data: users } = await admin
    .from('crm_users')
    .select('telegram_chat_id')
    .eq('receives_sla_alerts', true);
  if (!users?.length) return 0;

  const text = `⏰ <b>SLA estourando</b>: ${escapeHtml(args.leadName)} (${args.qualification}) sem contato há ${args.minutesSinceContact}min`;
  const url = leadUrl(args.leadId, 'overview');
  let sent = 0;
  await Promise.all(
    users.map(async (u) => {
      const chatId = (u as { telegram_chat_id: string | null }).telegram_chat_id;
      if (!chatId) return;
      const res = await sendTelegram(chatId, text, {
        parse_mode: 'HTML',
        inline_keyboard: [[{ text: 'Contatar agora', url }]],
      });
      if (res.ok) sent++;
    }),
  );
  return sent;
}

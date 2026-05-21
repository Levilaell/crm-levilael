import { createServiceRoleClient } from '@/lib/supabase/service';
import { escapeHtml, leadUrl, sendTelegram } from '@/lib/telegram';
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

  const lines = [
    `🆕 <b>Lead novo:</b> ${escapeHtml(args.name)}`,
    args.companyName ? `🏢 ${escapeHtml(args.companyName)}` : null,
    args.qualification || typeof args.diagnosisScore === 'number'
      ? `📊 ${args.qualification ? args.qualification + ' · ' : ''}${
          typeof args.diagnosisScore === 'number' ? `score ${args.diagnosisScore}/100` : ''
        }`.trim()
      : null,
    args.phone ? `📱 ${escapeHtml(args.phone)}` : null,
    args.email ? `✉️ ${escapeHtml(args.email)}` : null,
    `📥 origem: ${SOURCE_LABELS[args.source]}`,
  ].filter(Boolean) as string[];

  const text = lines.join('\n');
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

export interface TelegramInlineButton {
  text: string;
  url: string;
}

export interface TelegramSendOptions {
  parse_mode?: 'Markdown' | 'HTML';
  inline_keyboard?: TelegramInlineButton[][];
  disable_web_page_preview?: boolean;
}

export interface TelegramResult {
  ok: boolean;
  errorCode?: number;
  description?: string;
}

/**
 * Envia mensagem via Telegram bot. Falha silenciosa (loga, não throws) —
 * notificação não deve quebrar o fluxo principal.
 */
export async function sendTelegram(
  chatId: string,
  text: string,
  opts: TelegramSendOptions = {},
): Promise<TelegramResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('[telegram] missing TELEGRAM_BOT_TOKEN');
    return { ok: false, description: 'missing token' };
  }
  if (!chatId) {
    return { ok: false, description: 'missing chat_id' };
  }

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: opts.parse_mode ?? 'HTML',
    disable_web_page_preview: opts.disable_web_page_preview ?? true,
  };
  if (opts.inline_keyboard) {
    body.reply_markup = { inline_keyboard: opts.inline_keyboard };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { ok: boolean; error_code?: number; description?: string };
    if (!json.ok) {
      console.error('[telegram] send failed', json);
      return { ok: false, errorCode: json.error_code, description: json.description };
    }
    return { ok: true };
  } catch (err) {
    console.error('[telegram] network error', err);
    return { ok: false, description: err instanceof Error ? err.message : 'unknown' };
  }
}

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? 'https://crm.levilael.com.br';

export function leadUrl(leadId: string, tab?: 'overview' | 'triage' | 'discovery' | 'solution' | 'history'): string {
  return `${APP_URL}/lead/${leadId}${tab ? `/${tab}` : ''}`;
}

/**
 * Escape HTML pra mensagens com parse_mode=HTML.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

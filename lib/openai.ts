import OpenAI from 'openai';

let _client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
  _client = new OpenAI({ apiKey });
  return _client;
}

export const TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL ?? 'whisper-1';

/**
 * Transcreve áudio (mp3, m4a, wav, ogg, webm) via Whisper.
 * Custo: US$ 0.006/min. Logue duration_seconds pra acompanhar.
 */
export async function transcribeAudio(file: File): Promise<{
  text: string;
  durationSeconds: number | null;
  model: string;
}> {
  const client = getOpenAI();
  const res = await client.audio.transcriptions.create({
    file,
    model: TRANSCRIBE_MODEL,
    language: 'pt',
    response_format: 'verbose_json',
  });
  // verbose_json retorna `duration`
  const durationSeconds =
    typeof (res as unknown as { duration?: number }).duration === 'number'
      ? Math.round((res as unknown as { duration: number }).duration)
      : null;
  return {
    text: res.text,
    durationSeconds,
    model: TRANSCRIBE_MODEL,
  };
}

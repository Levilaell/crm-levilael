import { NextResponse } from 'next/server';
import { requireCrmSession } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { transcribeAudio, TRANSCRIBE_MODEL } from '@/lib/openai';
import { logAIOperation } from '@/lib/ai-log';

// Whisper rejeita > 25MB.
const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/webm',
]);

const KINDS = new Set(['triage_call', 'discovery_call', 'other']);

export const maxDuration = 300;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireCrmSession();
  const { id: leadId } = await context.params;

  let body: {
    storage_path?: string;
    kind?: string;
    file_name?: string;
    file_type?: string;
    file_size?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }

  const storagePath = body.storage_path;
  const kind = body.kind && KINDS.has(body.kind) ? body.kind : null;
  const fileName = body.file_name ?? 'audio.m4a';
  const fileType = body.file_type ?? 'audio/mpeg';
  const fileSize = typeof body.file_size === 'number' ? body.file_size : null;

  if (!storagePath || !kind) {
    return NextResponse.json(
      { ok: false, error: 'missing storage_path or invalid kind' },
      { status: 422 },
    );
  }
  if (!storagePath.startsWith(`${leadId}/`)) {
    return NextResponse.json({ ok: false, error: 'path/lead mismatch' }, { status: 422 });
  }
  if (fileSize !== null && fileSize > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: 'file too large (max 25MB)' }, { status: 413 });
  }
  if (fileType && !ALLOWED_TYPES.has(fileType)) {
    return NextResponse.json(
      { ok: false, error: `unsupported file type: ${fileType}` },
      { status: 415 },
    );
  }

  const admin = createServiceRoleClient();

  // Baixa o áudio do Storage (server-side, sem limite de body do Vercel).
  const { data: blob, error: downloadErr } = await admin.storage
    .from('crm_audio')
    .download(storagePath);

  if (downloadErr || !blob) {
    console.error('[transcribe] storage download failed', downloadErr);
    return NextResponse.json({ ok: false, error: 'storage download failed' }, { status: 500 });
  }

  // Whisper precisa de um File com nome/extensão válida.
  const audioFile = new File([blob], fileName, { type: fileType });

  let text: string;
  let durationSeconds: number | null;
  let model: string;
  const whisperStartedAt = Date.now();
  try {
    const result = await transcribeAudio(audioFile);
    text = result.text;
    durationSeconds = result.durationSeconds;
    model = result.model;
  } catch (err) {
    await logAIOperation({
      leadId,
      operation: 'whisper_transcription',
      provider: 'openai',
      model: TRANSCRIBE_MODEL,
      durationMs: Date.now() - whisperStartedAt,
      success: false,
      errorMessage: err instanceof Error ? err.message : 'unknown',
    });
    console.error('[transcribe] whisper failed', err);
    await admin.storage.from('crm_audio').remove([storagePath]);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'transcription failed' },
      { status: 500 },
    );
  }
  const whisperDurationMs = Date.now() - whisperStartedAt;

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  const { data: inserted, error: insertErr } = await admin
    .from('crm_transcriptions')
    .insert({
      lead_id: leadId,
      kind,
      source_type: 'audio_upload',
      audio_storage_path: storagePath,
      raw_text: text,
      word_count: wordCount,
      duration_seconds: durationSeconds,
      created_by: session.crmUser.id,
    })
    .select('id')
    .single();

  if (insertErr || !inserted) {
    await admin.storage.from('crm_audio').remove([storagePath]);
    return NextResponse.json({ ok: false, error: 'insert failed' }, { status: 500 });
  }

  await Promise.all([
    admin.from('crm_lead_events').insert({
      lead_id: leadId,
      actor_id: session.crmUser.id,
      event_type: 'transcription_added',
      payload: {
        transcription_id: (inserted as { id: string }).id,
        kind,
        source: 'audio_upload',
        duration_seconds: durationSeconds,
        whisper_model: model,
      },
    }),
    logAIOperation({
      leadId,
      operation: 'whisper_transcription',
      provider: 'openai',
      model,
      audioDurationSeconds: durationSeconds ?? null,
      durationMs: whisperDurationMs,
      success: true,
    }),
  ]);

  return NextResponse.json({
    ok: true,
    data: {
      id: (inserted as { id: string }).id,
      text,
      word_count: wordCount,
      duration_seconds: durationSeconds,
    },
  });
}

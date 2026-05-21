import { NextResponse } from 'next/server';
import { requireCrmSession } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { transcribeAudio, TRANSCRIBE_MODEL } from '@/lib/openai';
import { logAIOperation } from '@/lib/ai-log';

// Whisper API rejeita arquivos > 25MB
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

  const form = await request.formData();
  const file = form.get('file');
  const kindRaw = form.get('kind');
  const kind = typeof kindRaw === 'string' && KINDS.has(kindRaw) ? kindRaw : null;

  if (!(file instanceof File) || !kind) {
    return NextResponse.json(
      { ok: false, error: 'missing file or invalid kind' },
      { status: 422 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: 'file too large (max 25MB)' }, { status: 413 });
  }
  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { ok: false, error: `unsupported file type: ${file.type}` },
      { status: 415 },
    );
  }

  const admin = createServiceRoleClient();

  // Upload pro Storage
  const ext = file.name.split('.').pop()?.toLowerCase() || 'm4a';
  const storagePath = `${leadId}/${kind}_${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const { error: uploadErr } = await admin.storage
    .from('crm_audio')
    .upload(storagePath, buffer, {
      contentType: file.type || 'audio/mpeg',
      upsert: false,
    });

  if (uploadErr) {
    console.error('[transcribe] upload failed', uploadErr);
    return NextResponse.json({ ok: false, error: 'storage upload failed' }, { status: 500 });
  }

  // Whisper transcribe (passa o File direto)
  let text: string;
  let durationSeconds: number | null;
  let model: string;
  const whisperStartedAt = Date.now();
  try {
    const result = await transcribeAudio(file);
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

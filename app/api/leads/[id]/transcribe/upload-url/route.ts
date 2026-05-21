import { NextResponse } from 'next/server';
import { requireCrmSession } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/service';

const KINDS = new Set(['triage_call', 'discovery_call', 'other']);
const ALLOWED_EXTS = new Set(['mp3', 'm4a', 'mp4', 'wav', 'ogg', 'webm']);

// Whisper rejeita > 25MB; arquivo passa pelo Storage (sem o limite de 4.5MB do Vercel function body).
const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requireCrmSession();
  const { id: leadId } = await context.params;

  let body: { kind?: string; ext?: string; size?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }

  const kind = body.kind && KINDS.has(body.kind) ? body.kind : null;
  const ext = (body.ext ?? '').toLowerCase();
  const size = typeof body.size === 'number' ? body.size : null;

  if (!kind) return NextResponse.json({ ok: false, error: 'invalid kind' }, { status: 422 });
  if (!ALLOWED_EXTS.has(ext)) {
    return NextResponse.json({ ok: false, error: `unsupported ext: ${ext}` }, { status: 415 });
  }
  if (size === null || size <= 0) {
    return NextResponse.json({ ok: false, error: 'missing size' }, { status: 422 });
  }
  if (size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: 'file too large (max 25MB)' }, { status: 413 });
  }

  const path = `${leadId}/${kind}_${Date.now()}.${ext}`;
  const admin = createServiceRoleClient();
  const { data, error } = await admin.storage.from('crm_audio').createSignedUploadUrl(path);

  if (error || !data) {
    console.error('[transcribe/upload-url] failed', error);
    return NextResponse.json({ ok: false, error: 'signed url failed' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    data: { path: data.path, token: data.token, signedUrl: data.signedUrl },
  });
}

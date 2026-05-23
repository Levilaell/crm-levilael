import { NextResponse } from 'next/server';
import { requireCrmSession } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/service';

const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requireCrmSession();
  const { id } = await context.params;
  const admin = createServiceRoleClient();

  const { data: deck } = await admin
    .from('crm_slide_decks')
    .select('id, kind, pptx_storage_path, lead_id')
    .eq('id', id)
    .maybeSingle();
  if (!deck) return new NextResponse('not found', { status: 404 });
  const deckRow = deck as {
    id: string;
    kind: 'discovery_prep' | 'proposal';
    pptx_storage_path: string | null;
    lead_id: string;
  };
  if (!deckRow.pptx_storage_path) {
    return new NextResponse('deck sem arquivo pptx', { status: 404 });
  }

  const { data: lead } = await admin
    .from('crm_leads')
    .select('name, company_name')
    .eq('id', deckRow.lead_id)
    .maybeSingle();
  const leadRow = lead as { name: string; company_name: string | null } | null;

  const { data: file, error: dlErr } = await admin.storage
    .from('crm_slides')
    .download(deckRow.pptx_storage_path);
  if (dlErr || !file) {
    return new NextResponse('falha ao baixar do storage', { status: 500 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base = leadRow?.company_name?.trim() || leadRow?.name?.trim() || 'deck';
  const safe = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
  const filename = `${safe}_${deckRow.kind}.pptx`;

  return new NextResponse(buffer, {
    headers: {
      'content-type': PPTX_MIME,
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'private, no-store',
    },
  });
}

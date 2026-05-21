import { NextResponse } from 'next/server';
import { requireCrmSession } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/service';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requireCrmSession();
  const { id } = await context.params;
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from('crm_slide_decks')
    .select('html_content')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) {
    return new NextResponse('not found', { status: 404 });
  }
  const html = (data as { html_content: string }).html_content;
  return new NextResponse(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

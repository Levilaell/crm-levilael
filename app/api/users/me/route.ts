import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCrmSession } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/service';

const PatchSchema = z
  .object({
    display_name: z.string().min(1).max(120).optional(),
    telegram_chat_id: z.string().max(50).nullable().optional(),
    receives_new_leads: z.boolean().optional(),
    receives_sla_alerts: z.boolean().optional(),
    receives_briefing_ready: z.boolean().optional(),
  })
  .strict();

export async function PATCH(request: Request) {
  const session = await requireCrmSession();
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 422 });

  const admin = createServiceRoleClient();
  const { error } = await admin.from('crm_users').update(parsed.data).eq('id', session.crmUser.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

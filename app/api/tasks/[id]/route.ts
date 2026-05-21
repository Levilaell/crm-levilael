import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCrmSession } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/service';

const PatchSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).nullable().optional(),
    assignee_id: z.string().uuid().nullable().optional(),
    status: z.enum(['open', 'doing', 'done', 'blocked']).optional(),
    due_at: z.string().datetime().nullable().optional(),
  })
  .strict();

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requireCrmSession();
  const { id } = await context.params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 422 });

  const admin = createServiceRoleClient();
  const updates: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === 'done') updates.completed_at = new Date().toISOString();
  if (parsed.data.status && parsed.data.status !== 'done') updates.completed_at = null;

  const { error } = await admin.from('crm_tasks').update(updates).eq('id', id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireCrmSession();
  const { id } = await context.params;
  const admin = createServiceRoleClient();
  if (session.crmUser.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }
  const { error } = await admin.from('crm_tasks').delete().eq('id', id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

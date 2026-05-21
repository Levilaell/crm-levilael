import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCrmSession } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/service';

const ReorderSchema = z.object({
  updates: z
    .array(
      z.object({
        id: z.string().uuid(),
        priority: z.enum(['urgent', 'high', 'medium', 'low']),
        position: z.number().int(),
      }),
    )
    .min(1)
    .max(500),
});

export async function POST(request: Request) {
  await requireCrmSession();

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }
  const parsed = ReorderSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 422 });
  }

  const admin = createServiceRoleClient();
  // Updates em paralelo. Volume típico é <50, então não vale função RPC.
  const results = await Promise.all(
    parsed.data.updates.map((u) =>
      admin
        .from('crm_tasks')
        .update({ priority: u.priority, position: u.position })
        .eq('id', u.id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    return NextResponse.json({ ok: false, error: failed.error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

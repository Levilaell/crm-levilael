import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCrmSession } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/service';

const PostSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  lead_id: z.string().uuid().nullable().optional(),
  due_at: z.string().datetime().nullable().optional(),
  priority: z.enum(['urgent', 'high', 'medium', 'low']).optional(),
});

export async function POST(request: Request) {
  const session = await requireCrmSession();
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }
  const parsed = PostSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 422 });

  const admin = createServiceRoleClient();
  const priority = parsed.data.priority ?? 'medium';

  // Nova task entra no topo da coluna de prioridade — pega menor position e subtrai 1.
  const { data: minRow } = await admin
    .from('crm_tasks')
    .select('position')
    .eq('priority', priority)
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle();
  const minPos = (minRow as { position: number } | null)?.position ?? 0;

  const { data, error } = await admin
    .from('crm_tasks')
    .insert({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      assignee_id: parsed.data.assignee_id ?? null,
      lead_id: parsed.data.lead_id ?? null,
      due_at: parsed.data.due_at ?? null,
      priority,
      position: minPos - 1,
      created_by: session.crmUser.id,
    })
    .select('id')
    .single();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: error?.message ?? 'insert failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: { id: (data as { id: string }).id } });
}

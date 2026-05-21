import { createServiceRoleClient } from '@/lib/supabase/service';
import type { TaskStatus } from '@/types/crm';

export interface TaskRow {
  id: string;
  lead_id: string | null;
  title: string;
  description: string | null;
  assignee_id: string | null;
  status: TaskStatus;
  due_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  lead_name?: string | null;
}

export interface TaskFilters {
  assigneeId?: string;
  status?: TaskStatus;
  leadId?: string;
}

export async function listTasks(filters: TaskFilters = {}): Promise<TaskRow[]> {
  const admin = createServiceRoleClient();
  let q = admin
    .from('crm_tasks')
    .select(
      'id, lead_id, title, description, assignee_id, status, due_at, completed_at, created_by, created_at, updated_at, crm_leads(name)',
    )
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (filters.assigneeId) q = q.eq('assignee_id', filters.assigneeId);
  if (filters.status) q = q.eq('status', filters.status);
  if (filters.leadId) q = q.eq('lead_id', filters.leadId);

  const { data, error } = await q;
  if (error) return [];
  return (data ?? []).map((t) => {
    const row = t as unknown as TaskRow & { crm_leads?: { name: string } | { name: string }[] | null };
    const leadObj = Array.isArray(row.crm_leads) ? row.crm_leads[0] : row.crm_leads;
    return { ...row, lead_name: leadObj?.name ?? null };
  });
}

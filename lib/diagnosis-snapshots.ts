import { createServiceRoleClient } from '@/lib/supabase/service';
import type { DiagnosisSnapshot } from '@/types/crm';

const COLS =
  'id, source_diagnosis_id, email, phone, name, score, answers, ai_analysis, completed_at, converted_to_lead_id, converted_at, created_at';

const MATCHING_WINDOW_DAYS = 90;

export async function findMatchingSnapshot(args: {
  email?: string | null;
  phoneNormalized?: string | null;
}): Promise<DiagnosisSnapshot | null> {
  const { email, phoneNormalized } = args;
  if (!email && !phoneNormalized) return null;

  const admin = createServiceRoleClient();
  const cutoff = new Date(Date.now() - MATCHING_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  let q = admin
    .from('crm_diagnosis_snapshots')
    .select(COLS)
    .is('converted_to_lead_id', null)
    .gte('completed_at', cutoff)
    .order('completed_at', { ascending: false })
    .limit(1);

  // OR builder: phone tem prioridade sobre email se ambos vierem
  const filters: string[] = [];
  if (phoneNormalized) filters.push(`phone.eq.${phoneNormalized}`);
  if (email) filters.push(`email.ilike.${email.toLowerCase()}`);
  q = q.or(filters.join(','));

  const { data, error } = await q.maybeSingle();
  if (error) {
    console.error('[diagnosis-snapshots] match query failed', error);
    return null;
  }
  return (data ?? null) as DiagnosisSnapshot | null;
}

export async function markSnapshotConverted(snapshotId: string, leadId: string): Promise<void> {
  const admin = createServiceRoleClient();
  const { error } = await admin
    .from('crm_diagnosis_snapshots')
    .update({
      converted_to_lead_id: leadId,
      converted_at: new Date().toISOString(),
    })
    .eq('id', snapshotId);
  if (error) console.error('[diagnosis-snapshots] mark converted failed', error);
}

export async function listOrphanSnapshots(filters: {
  scoreMin?: number;
  scoreMax?: number;
  fromDate?: string;
  toDate?: string;
} = {}): Promise<DiagnosisSnapshot[]> {
  const admin = createServiceRoleClient();
  let q = admin
    .from('crm_diagnosis_snapshots')
    .select(COLS)
    .is('converted_to_lead_id', null)
    .order('completed_at', { ascending: false });
  if (typeof filters.scoreMin === 'number') q = q.gte('score', filters.scoreMin);
  if (typeof filters.scoreMax === 'number') q = q.lte('score', filters.scoreMax);
  if (filters.fromDate) q = q.gte('completed_at', filters.fromDate);
  if (filters.toDate) q = q.lte('completed_at', filters.toDate);

  const { data, error } = await q;
  if (error) {
    console.error('[diagnosis-snapshots] list orphans failed', error);
    return [];
  }
  return (data ?? []) as DiagnosisSnapshot[];
}

export async function getSnapshot(id: string): Promise<DiagnosisSnapshot | null> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from('crm_diagnosis_snapshots')
    .select(COLS)
    .eq('id', id)
    .maybeSingle();
  if (error) return null;
  return (data ?? null) as DiagnosisSnapshot | null;
}

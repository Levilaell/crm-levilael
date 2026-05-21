import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { notifySlaBreach } from '@/lib/notifications';
import type { Qualification } from '@/types/crm';

// Limites de tempo (minutos) sem contato pra disparar alerta, por qualificação
const SLA_MINUTES: Record<Qualification, number> = {
  AAA: 30,
  AA: 30,
  A: 240, // 4h
  B: 1440, // 24h
  C: 1440,
};

const ACTIVE_STAGES = [
  'new',
  'contact_tried',
  'triage_scheduled',
  'triage_done',
  'discovery_scheduled',
  'discovery_done',
  'proposal_sent',
  'negotiation',
];

export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  // Vercel cron envia x-vercel-cron: 1
  if (request.headers.get('x-vercel-cron')) return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  const { data: leads, error } = await admin
    .from('crm_leads')
    .select('id, name, qualification, created_at, last_contact_at, sla_alerted_at, stage')
    .in('stage', ACTIVE_STAGES);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const now = Date.now();
  let alerted = 0;
  const detailed: Array<{ id: string; name: string; minutes: number; q: Qualification }> = [];

  for (const raw of leads ?? []) {
    const lead = raw as {
      id: string;
      name: string;
      qualification: Qualification | null;
      created_at: string;
      last_contact_at: string | null;
      sla_alerted_at: string | null;
    };
    const q = lead.qualification;
    if (!q) continue;
    const threshold = SLA_MINUTES[q];
    const reference = lead.last_contact_at ?? lead.created_at;
    const ageMin = Math.floor((now - new Date(reference).getTime()) / 60000);
    if (ageMin < threshold) continue;

    // Não spammar: re-alertar só se passou 1 hora desde último alerta
    if (lead.sla_alerted_at) {
      const sinceLastAlert = (now - new Date(lead.sla_alerted_at).getTime()) / 60000;
      if (sinceLastAlert < 60) continue;
    }

    await notifySlaBreach({
      leadId: lead.id,
      leadName: lead.name,
      qualification: q,
      minutesSinceContact: ageMin,
    });
    await admin
      .from('crm_leads')
      .update({ sla_alerted_at: new Date().toISOString() })
      .eq('id', lead.id);
    alerted++;
    detailed.push({ id: lead.id, name: lead.name, minutes: ageMin, q });
  }

  return NextResponse.json({ ok: true, alerted, detailed });
}

// Vercel cron pode disparar POST também
export const POST = GET;

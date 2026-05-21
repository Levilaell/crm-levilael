import { notFound } from 'next/navigation';
import { getLead, listCrmUsers } from '@/lib/leads';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { LeadHistoryTimeline } from '@/components/lead/lead-history-timeline';

interface EventRow {
  id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
  actor_id: string | null;
}

export default async function LeadHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  const admin = createServiceRoleClient();
  const [{ data: events }, users] = await Promise.all([
    admin
      .from('crm_lead_events')
      .select('id, event_type, payload, created_at, actor_id')
      .eq('lead_id', id)
      .order('created_at', { ascending: false })
      .limit(500),
    listCrmUsers(),
  ]);

  const usersById = Object.fromEntries(users.map((u) => [u.id, u.display_name]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline de eventos</CardTitle>
      </CardHeader>
      <CardContent>
        <LeadHistoryTimeline events={(events ?? []) as EventRow[]} usersById={usersById} />
      </CardContent>
    </Card>
  );
}

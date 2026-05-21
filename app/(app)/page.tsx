import Link from 'next/link';
import { Plus } from 'lucide-react';
import { listLeads, listCrmUsers } from '@/lib/leads';
import { requireCrmSession } from '@/lib/auth';
import { KanbanBoard } from '@/components/kanban/board';
import { KanbanFilters } from '@/components/kanban/filters';
import { Button } from '@/components/ui/button';
import { Suspense } from 'react';
import type { LeadSource, Qualification } from '@/types/crm';
import { LEAD_SOURCES, QUALIFICATIONS } from '@/types/crm';

interface PageProps {
  searchParams: Promise<{
    owner?: string;
    qualification?: string;
    source?: string;
    q?: string;
  }>;
}

export default async function PipelinePage({ searchParams }: PageProps) {
  await requireCrmSession();
  const params = await searchParams;
  const owner = params.owner;
  const qualification = QUALIFICATIONS.includes(params.qualification as Qualification)
    ? (params.qualification as Qualification)
    : undefined;
  const source = LEAD_SOURCES.includes(params.source as LeadSource)
    ? (params.source as LeadSource)
    : undefined;
  const search = params.q?.trim() || undefined;

  const [leads, users] = await Promise.all([
    listLeads({ ownerId: owner, qualification, source, search }),
    listCrmUsers(),
  ]);

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      <div className="flex items-end justify-between gap-2 flex-wrap">
        <div className="space-y-1">
          <h1 className="heading-2">Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            {leads.length} {leads.length === 1 ? 'lead' : 'leads'} no funil
          </p>
        </div>
        <Button
          variant="brand"
          render={
            <Link href="/leads/new">
              <Plus className="size-4" />
              Novo lead
            </Link>
          }
        />
      </div>
      <Suspense>
        <KanbanFilters users={users} />
      </Suspense>
      <KanbanBoard leads={leads} users={users} />
    </div>
  );
}

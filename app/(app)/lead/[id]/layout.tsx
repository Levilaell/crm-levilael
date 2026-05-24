import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getLead, listCrmUsers } from '@/lib/leads';
import { getLeadProgress } from '@/lib/lead-progress';
import { LeadHeader } from '@/components/lead/lead-header';
import { LeadTabs } from '@/components/lead/lead-tabs';
import { Button } from '@/components/ui/button';
import { requireCrmSession } from '@/lib/auth';

interface LeadLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function LeadLayout({ children, params }: LeadLayoutProps) {
  await requireCrmSession();
  const { id } = await params;
  const [lead, users, progress] = await Promise.all([
    getLead(id),
    listCrmUsers(),
    getLeadProgress(id),
  ]);
  if (!lead) notFound();

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      <div className="sticky top-14 z-20 -mx-4 md:-mx-6 px-4 md:px-6 pt-2 pb-3 bg-background/80 backdrop-blur-md border-b border-border/60 space-y-2">
        <Button
          variant="ghost"
          size="xs"
          className="-ml-2"
          render={
            <Link href="/">
              <ArrowLeft className="size-3" />
              Voltar
            </Link>
          }
        />
        <LeadHeader lead={lead} users={users} />
        <LeadTabs leadId={lead.id} progress={progress} />
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

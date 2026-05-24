import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLead } from '@/lib/leads';
import { getSnapshot } from '@/lib/diagnosis-snapshots';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LeadOverviewForm } from '@/components/lead/lead-overview-form';
import { DiagnosisSnapshotCard } from '@/components/diagnosis/diagnosis-snapshot-card';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowRight } from 'lucide-react';

export default async function LeadOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  const snapshot = lead.matched_diagnosis_id
    ? await getSnapshot(lead.matched_diagnosis_id)
    : null;

  const ageDays = Math.floor(
    (Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24),
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        {snapshot ? <DiagnosisSnapshotCard snapshot={snapshot} /> : null}

        <Card>
          <CardHeader>
            <CardTitle>Dados básicos</CardTitle>
          </CardHeader>
          <CardContent>
            <LeadOverviewForm lead={lead} />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Status &amp; Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Metric
              label="No funil há"
              value={`${ageDays} ${ageDays === 1 ? 'dia' : 'dias'}`}
            />
            <Metric
              label="Última atividade"
              value={formatDistanceToNow(new Date(lead.updated_at), {
                locale: ptBR,
                addSuffix: true,
              })}
            />
            {lead.next_action_at ? (
              <Metric
                label="Próxima ação"
                value={format(new Date(lead.next_action_at), "dd 'de' MMM, HH:mm", {
                  locale: ptBR,
                })}
              />
            ) : null}
            {lead.lost_reason ? (
              <Metric label="Motivo perdido" value={lead.lost_reason} />
            ) : null}
            <Link
              href={`/lead/${id}/history`}
              className="flex items-center gap-1 text-xs text-brand hover:underline pt-2 border-t border-border/60 mt-3"
            >
              Ver histórico completo
              <ArrowRight className="size-3" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

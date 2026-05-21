import { notFound } from 'next/navigation';
import { getLead } from '@/lib/leads';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LeadOverviewForm } from '@/components/lead/lead-overview-form';
import { DiagnosisRender } from '@/components/lead/diagnosis-render';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default async function LeadOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  const ageDays = Math.floor(
    (Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24),
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Dados básicos</CardTitle>
          </CardHeader>
          <CardContent>
            <LeadOverviewForm lead={lead} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Diagnóstico do site</CardTitle>
          </CardHeader>
          <CardContent>
            <DiagnosisRender answers={lead.diagnosis_answers} />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Métricas</CardTitle>
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
            <Metric
              label="Último contato"
              value={
                lead.last_contact_at
                  ? formatDistanceToNow(new Date(lead.last_contact_at), {
                      locale: ptBR,
                      addSuffix: true,
                    })
                  : 'nunca'
              }
            />
            <Metric
              label="Próxima ação"
              value={
                lead.next_action_at
                  ? format(new Date(lead.next_action_at), "dd 'de' MMM, HH:mm", { locale: ptBR })
                  : '—'
              }
            />
            {lead.lost_reason ? (
              <Metric label="Motivo perdido" value={lead.lost_reason} />
            ) : null}
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

import Link from 'next/link';
import { requireCrmSession } from '@/lib/auth';
import { getAIUsageSummary } from '@/lib/ai-log';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AIUsageChart } from '@/components/settings/ai-usage-chart';
import { ArrowLeft, Sparkles } from 'lucide-react';

const OPERATION_LABELS: Record<string, string> = {
  briefing_triage: 'Briefing de triagem',
  briefing_discovery: 'Briefing de descoberta',
  discovery_script: 'Script de descoberta',
  slides_discovery_prep: 'Slides de preparação',
  slides_proposal: 'Slides de proposta',
  whisper_transcription: 'Transcrição (Whisper)',
};

const fmt = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 2,
});

export default async function AIUsagePage() {
  await requireCrmSession();
  const summary = await getAIUsageSummary();
  const opEntries = Object.entries(summary.byOperation).sort((a, b) => b[1].cost - a[1].cost);

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Uso de IA</h1>
          <p className="text-sm text-muted-foreground">Custo estimado (R$) — USD a 5,50</p>
        </div>
        <Button
          variant="ghost"
          render={
            <Link href="/settings">
              <ArrowLeft className="size-4" />
              Voltar
            </Link>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Custo do mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-emerald-400 tabular-nums">
              {fmt.format(summary.totalCostBrlMonth)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Mês corrente · estimado
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Custo diário · últimos 30 dias</CardTitle>
          </CardHeader>
          <CardContent>
            <AIUsageChart data={summary.daily} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Por operação</CardTitle>
          </CardHeader>
          <CardContent>
            {opEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados no mês.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operação</TableHead>
                    <TableHead className="text-right">Qtd.</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {opEntries.map(([op, v]) => (
                    <TableRow key={op}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Sparkles className="size-3 text-violet-400" />
                          {OPERATION_LABELS[op] ?? op}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{v.count}</TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-400">
                        {fmt.format(v.cost)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 10 leads (consumo)</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.topLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados no mês.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead className="text-right">Ops</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.topLeads.map((l) => (
                    <TableRow key={l.lead_id}>
                      <TableCell className="max-w-[200px] truncate">
                        <Link
                          href={`/lead/${l.lead_id}/overview`}
                          className="hover:underline"
                        >
                          {l.lead_name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{l.count}</TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-400">
                        {fmt.format(l.cost)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

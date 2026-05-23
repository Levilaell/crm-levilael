'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, RefreshCw, Send, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import type { ProposalRow, ProposalWave } from '@/lib/proposals';
import type { ProposalStatus } from '@/types/crm';

interface Props {
  leadId: string;
  proposal: ProposalRow | null;
  hasDiscoveryBriefing: boolean;
}

const STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: 'Rascunho',
  sent: 'Enviada',
  accepted: 'Aceita',
  rejected: 'Rejeitada',
  revised: 'Revisada',
};

const STATUS_COLORS: Record<ProposalStatus, string> = {
  draft: 'border-border text-muted-foreground',
  sent: 'border-blue-300 text-blue-700 bg-blue-50/50 dark:border-blue-500/50 dark:text-blue-300 dark:bg-transparent',
  accepted: 'border-emerald-300 text-emerald-700 bg-emerald-50/60 dark:border-emerald-500/50 dark:text-emerald-300 dark:bg-transparent',
  rejected: 'border-red-300 text-red-700 bg-red-50/60 dark:border-red-500/50 dark:text-red-300 dark:bg-transparent',
  revised: 'border-amber-300 text-amber-700 bg-amber-50/60 dark:border-amber-500/50 dark:text-amber-300 dark:bg-transparent',
};

export function ProposalCard({ leadId, proposal, hasDiscoveryBriefing }: Props) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  const fmt = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

  async function sync() {
    setSyncing(true);
    try {
      const res = await fetch(`/api/proposals/${leadId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'sync_from_discovery' }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      toast.success('Proposta sincronizada');
      router.refresh();
    } catch (err) {
      toast.error('Falha', { description: err instanceof Error ? err.message : 'Erro' });
    } finally {
      setSyncing(false);
    }
  }

  async function setStatus(status: ProposalStatus) {
    setStatusSaving(true);
    try {
      const res = await fetch(`/api/proposals/${leadId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      toast.success(`Status → ${STATUS_LABELS[status]}`);
      router.refresh();
    } catch (err) {
      toast.error('Falha', { description: err instanceof Error ? err.message : 'Erro' });
    } finally {
      setStatusSaving(false);
    }
  }

  if (!hasDiscoveryBriefing) {
    return (
      <p className="text-sm text-muted-foreground">
        Gere o briefing de descoberta primeiro pra ter as ondas da proposta.
      </p>
    );
  }

  if (!proposal) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Sem proposta criada. Use o botão pra puxar as ondas do briefing de descoberta.
        </p>
        <Button onClick={sync} disabled={syncing}>
          {syncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Sincronizar do briefing
        </Button>
      </div>
    );
  }

  const waves = (proposal.waves ?? []) as ProposalWave[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={STATUS_COLORS[proposal.status]}>
            {STATUS_LABELS[proposal.status]}
          </Badge>
          <span className="text-sm font-semibold text-foreground">
            Total: {fmt.format(proposal.total_value_min ?? 0)} – {fmt.format(proposal.total_value_max ?? 0)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Select value={proposal.status} onValueChange={(v) => v && setStatus(v as ProposalStatus)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(STATUS_LABELS) as [ProposalStatus, string][]).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" onClick={sync} disabled={syncing}>
            {syncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Sincronizar
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">#</TableHead>
            <TableHead>Onda</TableHead>
            <TableHead>Escopo</TableHead>
            <TableHead className="text-right">Ticket</TableHead>
            <TableHead className="text-right">Prazo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {waves.map((w) => (
            <TableRow key={w.numero}>
              <TableCell className="font-mono">{w.numero}</TableCell>
              <TableCell>
                <div className="font-medium">{w.titulo}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Resolve: {w.dor_resolvida}</div>
              </TableCell>
              <TableCell className="text-xs max-w-md">{w.escopo}</TableCell>
              <TableCell className="text-right text-foreground font-medium tabular-nums whitespace-nowrap">
                {fmt.format(w.ticket_min)} – {fmt.format(w.ticket_max)}
              </TableCell>
              <TableCell className="text-right text-xs tabular-nums whitespace-nowrap">
                {w.duracao_semanas_min}-{w.duracao_semanas_max} sem
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-wrap gap-2 pt-2 border-t">
        {proposal.status === 'draft' || proposal.status === 'revised' ? (
          <Button variant="outline" onClick={() => setStatus('sent')} disabled={statusSaving}>
            <Send className="size-4" />
            Marcar como enviada
          </Button>
        ) : null}
        {proposal.status === 'sent' ? (
          <>
            <Button variant="outline" onClick={() => setStatus('accepted')} disabled={statusSaving}>
              <Check className="size-4" />
              Aceita
            </Button>
            <Button variant="outline" onClick={() => setStatus('rejected')} disabled={statusSaving}>
              <X className="size-4" />
              Rejeitada
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}

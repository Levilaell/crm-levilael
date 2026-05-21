'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UserPlus, Eye } from 'lucide-react';
import { DiagnosisSnapshotCard } from './diagnosis-snapshot-card';
import { formatPhoneBRDisplay } from '@/lib/phone';
import type { DiagnosisSnapshot } from '@/types/crm';

interface Props {
  snapshots: DiagnosisSnapshot[];
}

export function DiagnosisList({ snapshots }: Props) {
  const [previewing, setPreviewing] = useState<DiagnosisSnapshot | null>(null);

  if (snapshots.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">Nenhum diagnóstico órfão.</p>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead className="text-right w-[80px]">Score</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {snapshots.map((s) => (
            <TableRow key={s.id}>
              <TableCell>
                <div className="font-medium">{s.name ?? <span className="text-muted-foreground">Sem nome</span>}</div>
              </TableCell>
              <TableCell className="text-xs">
                <div>{s.email ?? '—'}</div>
                {s.phone ? (
                  <div className="text-muted-foreground">{formatPhoneBRDisplay(s.phone)}</div>
                ) : null}
              </TableCell>
              <TableCell className="text-right">
                <Badge variant="outline" className={scoreColor(s.score)}>
                  {s.score}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {format(new Date(s.completed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setPreviewing(s)}>
                    <Eye className="size-4" />
                    Ver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    render={
                      <Link href={`/leads/new?from_diagnosis=${s.id}`}>
                        <UserPlus className="size-4" />
                        Criar lead
                      </Link>
                    }
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Diagnóstico</DialogTitle>
          </DialogHeader>
          {previewing ? <DiagnosisSnapshotCard snapshot={previewing} variant="modal" /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function scoreColor(score: number): string {
  if (score >= 80) return 'border-emerald-300 text-emerald-700 bg-emerald-50/60 dark:border-emerald-500/50 dark:text-emerald-300 dark:bg-transparent';
  if (score >= 60) return 'border-blue-300 text-blue-700 bg-blue-50/60 dark:border-blue-500/50 dark:text-blue-300 dark:bg-transparent';
  if (score >= 40) return 'border-amber-300 text-amber-700 bg-amber-50/60 dark:border-amber-500/50 dark:text-amber-300 dark:bg-transparent';
  return 'border-border text-muted-foreground';
}

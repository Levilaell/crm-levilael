'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DiagnosisRender } from '@/components/lead/diagnosis-render';
import type { DiagnosisSnapshot } from '@/types/crm';

interface Props {
  snapshot: DiagnosisSnapshot;
  variant?: 'lead-overview' | 'modal';
}

/**
 * Card "Diagnóstico prévio" — usado em duas situações:
 * 1. Tab Overview do lead quando matched_diagnosis_id existe
 * 2. Modal de preview na página /diagnoses
 *
 * v1 usa o render genérico DiagnosisRender. Seção 3 substituirá pelo
 * componente tipado com base no schema real do site.
 */
export function DiagnosisSnapshotCard({ snapshot, variant = 'lead-overview' }: Props) {
  const [expanded, setExpanded] = useState(variant === 'modal');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Brain className="size-4 text-violet-400" />
            <CardTitle>Diagnóstico prévio</CardTitle>
            {variant === 'lead-overview' ? (
              <Badge variant="outline" className="text-[10px]">
                veio do funil de diagnóstico
              </Badge>
            ) : null}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-emerald-400 tabular-nums">
              {snapshot.score}
            </div>
            <div className="text-[10px] text-muted-foreground">score</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-muted-foreground">
          {format(new Date(snapshot.completed_at), "d 'de' MMM, yyyy 'às' HH:mm", { locale: ptBR })}
          {snapshot.email ? ` · ${snapshot.email}` : ''}
          {snapshot.phone ? ` · ${snapshot.phone}` : ''}
        </div>

        {snapshot.ai_analysis ? (
          <div className="rounded-md border bg-violet-950/20 border-violet-900/40 p-3 space-y-1.5">
            <div className="text-xs uppercase tracking-wider text-violet-300 font-medium">
              Análise IA
            </div>
            <DiagnosisRender answers={snapshot.ai_analysis as Record<string, unknown>} />
          </div>
        ) : null}

        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            className="-ml-2 mb-2"
          >
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            {expanded ? 'Recolher respostas' : 'Ver respostas do diagnóstico'}
          </Button>
          {expanded ? (
            <div className="rounded-md border bg-muted/30 p-3">
              <DiagnosisRender answers={snapshot.answers} />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

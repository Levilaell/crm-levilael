'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  TypedDiagnosisAIView,
  TypedDiagnosisAnswersView,
} from '@/components/diagnosis/typed-diagnosis-view';
import { formatPhoneBRDisplay } from '@/lib/phone';
import type { DiagnosisSnapshot } from '@/types/crm';
import type { DiagnosisAIAnalysis, DiagnosisAnswers } from '@/types/diagnosis';

interface Props {
  snapshot: DiagnosisSnapshot;
  variant?: 'lead-overview' | 'modal';
}

/**
 * Card "Diagnóstico prévio" — usado em:
 * 1. Tab Overview do lead quando matched_diagnosis_id existe
 * 2. Modal de preview na página /diagnoses
 * 3. /leads/new?from_diagnosis=ID
 *
 * Renderiza por seção (resumo, gargalo, alerta, oportunidades, plano 30/60/90)
 * usando os tipos derivados de samples/diagnosis_real.json. Respostas do form
 * vão em dl com labels PT-BR.
 */
export function DiagnosisSnapshotCard({ snapshot, variant = 'lead-overview' }: Props) {
  const [expanded, setExpanded] = useState(variant === 'modal');
  const ai = snapshot.ai_analysis as DiagnosisAIAnalysis | null;
  const answers = snapshot.answers as unknown as DiagnosisAnswers;
  const phoneDisplay = snapshot.phone ? formatPhoneBRDisplay(snapshot.phone) : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="size-7 rounded-md bg-brand/15 grid place-items-center">
              <Brain className="size-4 text-brand" />
            </div>
            <CardTitle>Diagnóstico prévio</CardTitle>
            {variant === 'lead-overview' ? (
              <Badge variant="outline" className="text-[10px] border-brand/40 text-foreground/80">
                veio do funil
              </Badge>
            ) : null}
          </div>
          <div className="text-right shrink-0">
            <div className="text-3xl font-bold text-foreground tabular-nums leading-none">
              {snapshot.score}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
              score
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-xs text-muted-foreground border-b pb-3">
          {format(new Date(snapshot.completed_at), "d 'de' MMM, yyyy 'às' HH:mm", { locale: ptBR })}
          {snapshot.email ? ` · ${snapshot.email}` : ''}
          {phoneDisplay ? ` · ${phoneDisplay}` : ''}
        </div>

        {ai ? (
          <div className="rounded-xl border border-brand/20 bg-brand/[0.03] p-3">
            <div className="text-[10px] uppercase tracking-wider text-brand font-semibold mb-3">
              Análise IA
            </div>
            <TypedDiagnosisAIView analysis={ai} />
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
            <div className="rounded-xl border bg-muted/30 p-3">
              <TypedDiagnosisAnswersView answers={answers} />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

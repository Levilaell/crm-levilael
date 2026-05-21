'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  CalendarDays,
  Compass,
  Layers3,
  Lightbulb,
  Target,
} from 'lucide-react';
import {
  type DiagnosisAIAnalysis,
  type DiagnosisAnswers,
  type DiagnosisOpportunity,
  QUESTION_LABELS,
  QUESTION_ORDER,
  labelForAnswer,
} from '@/types/diagnosis';

interface AIProps {
  analysis: DiagnosisAIAnalysis;
}

const COMPLEXITY_COLORS = {
  baixa: 'border-emerald-500/50 text-emerald-300',
  media: 'border-amber-500/50 text-amber-300',
  alta: 'border-red-500/50 text-red-300',
} as const;

export function TypedDiagnosisAIView({ analysis: a }: AIProps) {
  return (
    <div className="space-y-4">
      {a.diagnostico_resumido ? (
        <Section icon={Compass} title="Resumo do diagnóstico">
          <p className="text-sm leading-relaxed">{a.diagnostico_resumido}</p>
        </Section>
      ) : null}

      {a.gargalo_principal ? (
        <Section icon={Target} title="Gargalo principal">
          <div className="rounded-md border bg-red-950/20 border-red-900/40 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{a.gargalo_principal.area}</span>
              <Badge variant="outline" className="text-[10px]">
                impacto {a.gargalo_principal.impacto_estimado}
              </Badge>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {a.gargalo_principal.descricao}
            </p>
          </div>
        </Section>
      ) : null}

      {a.alerta_estrategico ? (
        <Section icon={AlertTriangle} title="Alerta estratégico">
          <div className="rounded-md border bg-amber-950/20 border-amber-900/40 p-3">
            <p className="text-sm leading-relaxed">{a.alerta_estrategico}</p>
          </div>
        </Section>
      ) : null}

      {a.tres_oportunidades && a.tres_oportunidades.length > 0 ? (
        <Section icon={Lightbulb} title={`Oportunidades (${a.tres_oportunidades.length})`}>
          <div className="space-y-2">
            {a.tres_oportunidades.map((op: DiagnosisOpportunity, i) => (
              <div key={i} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="font-medium text-sm">{op.titulo}</div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="outline" className={cn('text-[10px]', COMPLEXITY_COLORS[op.complexidade] ?? '')}>
                      {op.complexidade}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {op.prazo_implementacao}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground mb-1.5">{op.descricao}</p>
                <div className="text-[11px] text-emerald-400">
                  → {op.impacto_estimado}
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {a.plano_30_60_90 ? (
        <Section icon={CalendarDays} title="Plano 30/60/90">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <PlanCell label="30 dias" body={a.plano_30_60_90['30_dias']} />
            <PlanCell label="60 dias" body={a.plano_30_60_90['60_dias']} />
            <PlanCell label="90 dias" body={a.plano_30_60_90['90_dias']} />
          </div>
        </Section>
      ) : null}

      {a.proximo_passo_recomendado ? (
        <Section icon={Layers3} title="Próximo passo recomendado">
          <div className="rounded-md border bg-violet-950/20 border-violet-900/40 p-3 space-y-1">
            <div className="text-sm font-medium capitalize">{a.proximo_passo_recomendado.abordagem}</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {a.proximo_passo_recomendado.justificativa}
            </p>
          </div>
        </Section>
      ) : null}
    </div>
  );
}

interface AnswersProps {
  answers: DiagnosisAnswers;
}

export function TypedDiagnosisAnswersView({ answers }: AnswersProps) {
  const rendered: { key: string; label: string; value: string }[] = [];
  const seen = new Set<string>();

  // Perguntas em ordem canônica
  for (const key of QUESTION_ORDER) {
    if (!(key in answers)) continue;
    seen.add(key);
    const value = (answers as Record<string, unknown>)[key];
    if (value === null || value === undefined || value === '') continue;
    rendered.push({
      key,
      label: QUESTION_LABELS[key] ?? key,
      value: labelForAnswer(key, value),
    });
  }

  // Qualquer pergunta desconhecida (futuras adições no site) — mostra cru no fim
  for (const key of Object.keys(answers)) {
    if (seen.has(key)) continue;
    if (['name', 'email', 'whatsapp', 'company'].includes(key)) continue;
    const value = (answers as Record<string, unknown>)[key];
    if (value === null || value === undefined || value === '') continue;
    rendered.push({
      key,
      label: QUESTION_LABELS[key] ?? key,
      value: labelForAnswer(key, value),
    });
  }

  if (rendered.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem respostas.</p>;
  }

  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
      {rendered.map((r) => (
        <div key={r.key} className="space-y-0.5">
          <dt className="text-xs text-muted-foreground">{r.label}</dt>
          <dd className="font-medium">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Compass;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function PlanCell({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <p className="text-xs leading-relaxed">{body}</p>
    </div>
  );
}

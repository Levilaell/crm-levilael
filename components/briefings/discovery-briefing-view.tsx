'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Users,
  Layers3,
  Compass,
  ShieldAlert,
  ArrowRight,
  FileText,
} from 'lucide-react';
import type { BriefingDiscovery } from '@/types/crm';

interface ViewProps {
  briefing: BriefingDiscovery;
}

const POSITION_COLORS = {
  aliado: 'border-emerald-200 bg-emerald-50/60 text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-500/5 dark:text-emerald-300',
  cetico: 'border-red-200 bg-red-50/60 text-red-700 dark:border-red-500/50 dark:bg-red-500/5 dark:text-red-300',
  neutro: 'border-border bg-muted/40 text-muted-foreground',
} as const;

const PRIORITY_COLORS = {
  alta: 'border-red-200 bg-red-50/40 dark:border-red-500/40 dark:bg-red-500/5',
  media: 'border-amber-200 bg-amber-50/40 dark:border-amber-500/40 dark:bg-amber-500/5',
  baixa: 'border-border bg-muted/30',
} as const;

export function DiscoveryBriefingView({ briefing: b }: ViewProps) {
  const fmt = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
  const totalMin = b.ondas_propostas.reduce((s, o) => s + o.ticket_min, 0);
  const totalMax = b.ondas_propostas.reduce((s, o) => s + o.ticket_max, 0);

  return (
    <div className="space-y-5">
      <Section icon={Compass} title="Resumo">
        <p className="text-sm leading-relaxed">{b.resumo_executivo}</p>
      </Section>

      <Section icon={CheckCircle2} title={`Confirmações (${b.confirmacoes.length})`}>
        <div className="space-y-2">
          {b.confirmacoes.map((c, i) => (
            <div key={i} className="rounded-md border p-3 space-y-1">
              <div className="text-xs text-muted-foreground">P: {c.pergunta}</div>
              <div className="text-sm font-medium">R: {c.resposta}</div>
              <div className="text-xs text-blue-700 dark:text-blue-300">→ {c.impacto_proposta}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={Users} title={`Decisores (${b.decisores_envolvidos.length})`}>
        <div className="flex flex-wrap gap-2">
          {b.decisores_envolvidos.map((d, i) => (
            <div
              key={i}
              className={cn('rounded-md border px-3 py-2 text-xs', POSITION_COLORS[d.posicao])}
            >
              <div className="font-medium text-sm">{d.nome}</div>
              <div className="opacity-70">{d.papel}</div>
              <div className="mt-1 uppercase tracking-wider">{d.posicao}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        icon={Layers3}
        title={`Ondas propostas (${b.ondas_propostas.length})`}
        rightLabel={`Total: ${fmt.format(totalMin)} – ${fmt.format(totalMax)}`}
      >
        <div className="space-y-2">
          {b.ondas_propostas.map((o) => (
            <div key={o.numero} className={cn('rounded-md border p-3', PRIORITY_COLORS[o.prioridade])}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-muted-foreground">Onda {o.numero}</div>
                  <div className="font-semibold">{o.titulo}</div>
                </div>
                <div className="text-right">
                  <div className="text-foreground font-semibold text-sm">
                    {fmt.format(o.ticket_min)} – {fmt.format(o.ticket_max)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {o.duracao_semanas_min}-{o.duracao_semanas_max} semanas
                  </div>
                </div>
              </div>
              <p className="text-sm mt-2">{o.escopo}</p>
              <div className="text-xs text-muted-foreground mt-1">
                <span className="font-medium">Resolve:</span> {o.dor_resolvida}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={Compass} title="Contexto estratégico">
        <p className="text-sm leading-relaxed text-muted-foreground">{b.contexto_estrategico}</p>
      </Section>

      <Section icon={ShieldAlert} title="Riscos">
        <ul className="space-y-1 text-sm">
          {b.riscos_proposta.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-red-500 dark:text-red-400 shrink-0">•</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section icon={ArrowRight} title="Próximo passo">
        <p className="text-sm">{b.proximo_passo}</p>
      </Section>

      <Section icon={FileText} title="Rascunho da proposta">
        <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed p-3 rounded-md bg-muted/40 border">
          {b.rascunho_proposta}
        </pre>
      </Section>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  rightLabel,
  children,
}: {
  icon: typeof Compass;
  title: string;
  rightLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        {rightLabel ? <Badge variant="outline">{rightLabel}</Badge> : null}
      </div>
      {children}
    </div>
  );
}

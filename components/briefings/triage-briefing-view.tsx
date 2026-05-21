'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Building2,
  Users,
  ServerCog,
  AlertTriangle,
  Sparkles,
  HelpCircle,
  ShieldAlert,
  TrendingUp,
  BadgeDollarSign,
} from 'lucide-react';
import { QUALIFICATION_COLORS } from '@/types/crm';
import type { BriefingTriage } from '@/types/crm';

interface BriefingViewProps {
  briefing: BriefingTriage;
}

const SEVERITY_COLORS = {
  alta: 'border-red-500/40 bg-red-500/5 text-red-300',
  media: 'border-amber-500/40 bg-amber-500/5 text-amber-300',
  baixa: 'border-zinc-500/30 bg-zinc-500/5 text-zinc-300',
} as const;

export function TriageBriefingView({ briefing: b }: BriefingViewProps) {
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

  return (
    <div className="space-y-5">
      {/* Resumo */}
      <Section icon={Sparkles} title="Resumo">
        <p className="text-sm leading-relaxed">{b.resumo_executivo}</p>
      </Section>

      {/* Qualificação + Ticket */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">
            Qualificação
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn('text-base px-2', QUALIFICATION_COLORS[b.qualificacao.nivel])}>
              {b.qualificacao.nivel}
            </Badge>
            <span className="text-sm">{b.qualificacao.motivo}</span>
          </div>
        </div>
        <div className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">
            Ticket estimado
          </div>
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <BadgeDollarSign className="size-4" />
            {formatter.format(b.ticket_estimado.min)} – {formatter.format(b.ticket_estimado.max)}
          </div>
        </div>
      </div>

      {/* Porte */}
      <Section icon={Building2} title="Porte">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <Stat label="Clientes" value={b.porte.clientes_ativos ?? '—'} />
          <Stat label="Sócios" value={b.porte.funcionarios.socios ?? '—'} />
          <Stat label="CLT" value={b.porte.funcionarios.clt ?? '—'} />
          <Stat label="Estagiários" value={b.porte.funcionarios.estagiarios ?? '—'} />
          <Stat label="ERP" value={b.porte.erp_atual ?? '—'} />
          <Stat label="Infra" value={b.porte.infra} />
        </div>
      </Section>

      {/* Decisor */}
      <Section icon={Users} title="Perfil do decisor">
        <div className="text-sm space-y-1">
          <div>
            <span className="text-muted-foreground">Nome: </span>
            {b.perfil_decisor.nome ?? '—'}
          </div>
          <div>
            <span className="text-muted-foreground">Papel: </span>
            {b.perfil_decisor.papel ?? '—'}
          </div>
          <div>
            <span className="text-muted-foreground">Momento: </span>
            {b.perfil_decisor.momento}
          </div>
          <div>
            <span className="text-muted-foreground">Autoridade: </span>
            {b.perfil_decisor.autoridade}
          </div>
        </div>
      </Section>

      {/* Dores */}
      <Section icon={AlertTriangle} title={`Dores mapeadas (${b.dores_mapeadas.length})`}>
        <div className="space-y-2">
          {b.dores_mapeadas.map((dor, i) => (
            <div
              key={i}
              className={cn('rounded-md border p-3', SEVERITY_COLORS[dor.severidade])}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="font-medium text-sm">{dor.titulo}</div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[10px]">
                    {dor.severidade}
                  </Badge>
                  {dor.onda_relacionada ? (
                    <Badge variant="outline" className="text-[10px]">
                      onda {dor.onda_relacionada}
                    </Badge>
                  ) : null}
                </div>
              </div>
              <p className="text-xs leading-relaxed">{dor.descricao}</p>
            </div>
          ))}
          {b.dores_mapeadas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma dor mapeada.</p>
          ) : null}
        </div>
      </Section>

      {/* Sinais */}
      <Section icon={TrendingUp} title={`Sinais (${b.sinais.length})`}>
        <div className="flex flex-wrap gap-2">
          {b.sinais.map((s, i) => (
            <Badge key={i} variant="outline" className="font-normal">
              <span className="text-amber-400 mr-1">{s.tipo}:</span>
              {s.descricao}
            </Badge>
          ))}
        </div>
      </Section>

      {/* Perguntas */}
      <Section icon={HelpCircle} title="Próximas perguntas (pra descoberta)">
        <ul className="space-y-1.5">
          {b.proximas_perguntas.map((p, i) => (
            <li key={i} className="text-sm flex gap-2">
              <span className="text-muted-foreground">{i + 1}.</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Riscos */}
      <Section icon={ShieldAlert} title="Riscos">
        <ul className="space-y-1 text-sm">
          {b.riscos.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-red-400">•</span>
              {r}
            </li>
          ))}
          {b.riscos.length === 0 ? <li className="text-muted-foreground">Nenhum.</li> : null}
        </ul>
      </Section>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Building2;
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

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium truncate">{value}</div>
    </div>
  );
}

// Reuso pro icon de servidor (suprime warning não usado)
void ServerCog;

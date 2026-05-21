'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EventRow {
  id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
  actor_id: string | null;
}

interface TimelineProps {
  events: EventRow[];
  usersById: Record<string, string>;
}

const EVENT_LABELS: Record<string, string> = {
  lead_created: 'Lead criado',
  stage_changed: 'Estágio alterado',
  lead_updated: 'Dados atualizados',
  transcription_added: 'Transcrição adicionada',
  briefing_generated: 'Briefing gerado',
  diagram_updated: 'Diagrama atualizado',
  proposal_created: 'Proposta criada',
  task_completed: 'Tarefa concluída',
  note_added: 'Nota adicionada',
};

export function LeadHistoryTimeline({ events, usersById }: TimelineProps) {
  const types = useMemo(() => {
    const set = new Set(events.map((e) => e.event_type));
    return Array.from(set);
  }, [events]);
  const [filter, setFilter] = useState('__all__');

  const filtered = filter === '__all__' ? events : events.filter((e) => e.event_type === filter);

  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">Sem eventos.</p>;
  }

  return (
    <div className="space-y-4">
      <Select value={filter} onValueChange={(v) => setFilter(v ?? '__all__')}>
        <SelectTrigger className="w-[220px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todos eventos</SelectItem>
          {types.map((t) => (
            <SelectItem key={t} value={t}>
              {EVENT_LABELS[t] ?? t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ul className="relative space-y-3 pl-4 border-l border-border">
        {filtered.map((event) => {
          const actor = event.actor_id ? usersById[event.actor_id] : null;
          const label = EVENT_LABELS[event.event_type] ?? event.event_type;
          return (
            <li key={event.id} className="relative">
              <span className="absolute -left-[1.40rem] top-1.5 size-2 rounded-full bg-primary" />
              <div className="text-sm">
                <span className="font-medium">{label}</span>
                {actor ? <span className="text-muted-foreground"> por {actor}</span> : null}
              </div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(event.created_at), "dd 'de' MMM yyyy, HH:mm", { locale: ptBR })}
              </div>
              {event.payload && Object.keys(event.payload).length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {Object.entries(event.payload).map(([k, v]) => (
                    <Badge key={k} variant="outline" className="text-[10px] font-normal">
                      {k}: {String(v)}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

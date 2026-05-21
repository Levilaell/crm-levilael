'use client';

import Link from 'next/link';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Building2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QUALIFICATION_COLORS, SOURCE_LABELS } from '@/types/crm';
import type { LeadRow } from '@/lib/leads';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface KanbanCardProps {
  lead: LeadRow;
  ownerName?: string;
}

function formatCurrencyRange(min: number | null, max: number | null): string | null {
  if (!min && !max) return null;
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
  if (min && max) return `${formatter.format(min)} – ${formatter.format(max)}`;
  return formatter.format((min ?? max)!);
}

export function KanbanCard({ lead, ownerName }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { type: 'lead', stage: lead.stage },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const lastActivity = lead.last_contact_at ?? lead.updated_at;
  const ticket = formatCurrencyRange(lead.estimated_ticket_min, lead.estimated_ticket_max);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group rounded-md border bg-card p-3 cursor-grab active:cursor-grabbing',
        'hover:border-ring/50 transition-colors',
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/lead/${lead.id}/overview`}
            className="font-medium text-sm hover:underline line-clamp-1"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {lead.name}
          </Link>
          {lead.company_name ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 line-clamp-1">
              <Building2 className="size-3 shrink-0" />
              {lead.company_name}
            </div>
          ) : null}
        </div>
        {lead.qualification ? (
          <Badge
            variant="outline"
            className={cn('text-[10px] px-1.5 py-0', QUALIFICATION_COLORS[lead.qualification])}
          >
            {lead.qualification}
          </Badge>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="size-3" />
          {formatDistanceToNow(new Date(lastActivity), { locale: ptBR, addSuffix: false })}
        </span>
        <span className="opacity-70">{SOURCE_LABELS[lead.source]}</span>
      </div>

      {ticket ? <div className="text-[11px] text-emerald-400 mt-1.5 font-medium">{ticket}</div> : null}

      {ownerName ? (
        <div className="text-[10px] text-muted-foreground mt-1.5 truncate">→ {ownerName}</div>
      ) : null}
    </div>
  );
}

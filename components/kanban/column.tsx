'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './card';
import { cn } from '@/lib/utils';
import { KANBAN_COLUMN_LABELS, type KanbanColumn as ColKey } from '@/types/crm';
import type { LeadRow } from '@/lib/leads';

interface KanbanColumnProps {
  column: ColKey;
  leads: LeadRow[];
  usersById: Record<string, string>;
}

const COLUMN_ACCENT: Record<ColKey, string> = {
  new: 'bg-brand',
  contact_tried: 'bg-zinc-400',
  triage: 'bg-blue-400',
  discovery: 'bg-violet-400',
  proposal: 'bg-amber-500',
  stand_by: 'bg-slate-500',
  closed: 'bg-emerald-500',
};

export function KanbanColumn({ column, leads, usersById }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column,
    data: { type: 'column', column },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-xl bg-muted/50 min-w-[260px] w-[280px] shrink-0',
        'border transition-colors',
        isOver ? 'border-ring/70 bg-muted' : 'border-border/40',
      )}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className={cn('size-2 rounded-full', COLUMN_ACCENT[column])} />
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
            {KANBAN_COLUMN_LABELS[column]}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground tabular-nums font-medium px-1.5 py-0.5 rounded-md bg-background/60">
          {leads.length}
        </span>
      </div>
      <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 flex flex-col gap-2 p-2 min-h-[120px] overflow-y-auto">
          {leads.length === 0 ? (
            <div className="text-[11px] text-muted-foreground/60 text-center py-8 italic">
              sem leads
            </div>
          ) : (
            leads.map((lead) => (
              <KanbanCard
                key={lead.id}
                lead={lead}
                ownerName={lead.owner_id ? usersById[lead.owner_id] : undefined}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

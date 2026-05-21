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

export function KanbanColumn({ column, leads, usersById }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column,
    data: { type: 'column', column },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-md bg-muted/40 min-w-[260px] w-[280px] shrink-0',
        'border transition-colors',
        isOver ? 'border-ring/60 bg-muted/60' : 'border-transparent',
      )}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/60">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {KANBAN_COLUMN_LABELS[column]}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">{leads.length}</span>
      </div>
      <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 flex flex-col gap-2 p-2 min-h-[120px] overflow-y-auto">
          {leads.length === 0 ? (
            <div className="text-xs text-muted-foreground/60 text-center py-6">vazio</div>
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

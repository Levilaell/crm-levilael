'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { toast } from 'sonner';
import { KanbanColumn } from './column';
import { KanbanCard } from './card';
import {
  KANBAN_COLUMNS,
  stageToColumn,
  type LeadStage,
  type KanbanColumn as ColKey,
} from '@/types/crm';
import type { LeadRow } from '@/lib/leads';

interface BoardProps {
  leads: LeadRow[];
  users: Array<{ id: string; display_name: string }>;
}

// Quando o usuário dropa em uma coluna, qual estágio deve ser aplicado?
// Default conservador: mover pro estágio "mais cedo" da coluna.
const COLUMN_DEFAULT_STAGE: Record<ColKey, LeadStage> = {
  new: 'new',
  contact_tried: 'contact_tried',
  triage: 'triage_scheduled',
  discovery: 'discovery_scheduled',
  proposal: 'proposal_sent',
  closed: 'won',
};

export function KanbanBoard({ leads: initialLeads, users }: BoardProps) {
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const usersById = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u.display_name])),
    [users],
  );

  const grouped = useMemo(() => {
    const map: Record<ColKey, LeadRow[]> = {
      new: [],
      contact_tried: [],
      triage: [],
      discovery: [],
      proposal: [],
      closed: [],
    };
    for (const lead of leads) {
      map[stageToColumn(lead.stage)].push(lead);
    }
    return map;
  }, [leads]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const activeLead = activeId ? leads.find((l) => l.id === activeId) ?? null : null;

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const leadId = String(active.id);
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    // over pode ser uma coluna ou outro card (sortable). Pegar a coluna do destino.
    let targetCol: ColKey | null = null;
    const overData = over.data.current;
    if (overData?.type === 'column') {
      targetCol = overData.column as ColKey;
    } else if (overData?.type === 'lead') {
      targetCol = stageToColumn(overData.stage as LeadStage);
    }
    if (!targetCol) return;

    const currentCol = stageToColumn(lead.stage);
    if (targetCol === currentCol) return;

    const newStage = COLUMN_DEFAULT_STAGE[targetCol];
    const oldStage = lead.stage;

    // Optimistic update
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage: newStage } : l)));

    startTransition(async () => {
      try {
        const res = await fetch(`/api/leads/${leadId}/stage`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ stage: newStage }),
        });
        if (!res.ok) throw new Error(await res.text());
        toast.success('Lead movido', {
          description: `${lead.name} → ${newStage}`,
        });
        router.refresh();
      } catch (err) {
        setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage: oldStage } : l)));
        toast.error('Falha ao mover', {
          description: err instanceof Error ? err.message : 'Erro desconhecido',
        });
      }
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 flex-1 min-h-0">
        {KANBAN_COLUMNS.map((col) => (
          <KanbanColumn
            key={col}
            column={col}
            leads={grouped[col]}
            usersById={usersById}
          />
        ))}
      </div>
      <DragOverlay>
        {activeLead ? (
          <div className="rotate-2">
            <KanbanCard
              lead={activeLead}
              ownerName={activeLead.owner_id ? usersById[activeLead.owner_id] : undefined}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
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
import { arrayMove } from '@dnd-kit/sortable';
import { toast } from 'sonner';
import { TaskColumn } from './task-column';
import { TaskCard } from './task-card';
import { EditTaskDialog } from './edit-task-dialog';
import { TASK_PRIORITIES, type TaskPriority, type TaskStatus } from '@/types/crm';
import type { TaskRow } from '@/lib/tasks';

interface Props {
  tasks: TaskRow[];
  usersById: Record<string, string>;
  users: Array<{ id: string; display_name: string }>;
}

type Grouped = Record<TaskPriority, TaskRow[]>;

function group(tasks: TaskRow[]): Grouped {
  const map: Grouped = { urgent: [], high: [], medium: [], low: [] };
  for (const t of tasks) {
    (map[t.priority] ?? map.medium).push(t);
  }
  return map;
}

export function TaskBoard({ tasks: initial, usersById, users }: Props) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const [, startTransition] = useTransition();

  // Refresca quando o server retorna novo snapshot (ex: outra tab muda).
  useEffect(() => {
    setTasks(initial);
  }, [initial]);

  const grouped = useMemo(() => group(tasks), [tasks]);
  const activeTask = activeId ? tasks.find((t) => t.id === activeId) ?? null : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  async function toggleDone(task: TaskRow) {
    const next: TaskStatus = task.status === 'done' ? 'open' : 'done';
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: next } : t)));
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)));
      toast.error('Falha ao atualizar');
    } else {
      router.refresh();
    }
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const activeId = String(active.id);
    const dragged = tasks.find((t) => t.id === activeId);
    if (!dragged) return;

    const overData = over.data.current;
    let targetCol: TaskPriority | null = null;
    let overTaskId: string | null = null;
    if (overData?.type === 'column') {
      targetCol = overData.priority as TaskPriority;
    } else if (overData?.type === 'task') {
      targetCol = overData.priority as TaskPriority;
      overTaskId = String(over.id);
    }
    if (!targetCol) return;

    const sourceCol = dragged.priority;
    const beforeSnapshot = tasks;

    // Calcula nova lista por coluna.
    const before = group(tasks);

    let nextSource: TaskRow[] = before[sourceCol];
    let nextTarget: TaskRow[];

    if (sourceCol === targetCol) {
      const list = before[sourceCol];
      const fromIdx = list.findIndex((t) => t.id === activeId);
      let toIdx = overTaskId ? list.findIndex((t) => t.id === overTaskId) : list.length - 1;
      if (toIdx < 0) toIdx = list.length - 1;
      if (fromIdx < 0 || fromIdx === toIdx) return;
      nextSource = arrayMove(list, fromIdx, toIdx);
      nextTarget = nextSource;
    } else {
      nextSource = before[sourceCol].filter((t) => t.id !== activeId);
      const targetList = [...before[targetCol]];
      const insertAt = overTaskId
        ? targetList.findIndex((t) => t.id === overTaskId)
        : targetList.length;
      const movedTask: TaskRow = { ...dragged, priority: targetCol };
      targetList.splice(insertAt < 0 ? targetList.length : insertAt, 0, movedTask);
      nextTarget = targetList;
    }

    // Reindexa positions (0..N) das colunas afetadas e monta updates.
    const updates: Array<{ id: string; priority: TaskPriority; position: number }> = [];
    const apply = (list: TaskRow[], col: TaskPriority) => {
      list.forEach((t, idx) => {
        if (t.priority !== col || t.position !== idx) {
          updates.push({ id: t.id, priority: col, position: idx });
        }
      });
    };

    if (sourceCol === targetCol) {
      apply(nextTarget, targetCol);
    } else {
      apply(nextSource, sourceCol);
      apply(nextTarget, targetCol);
    }

    // Aplica optimistic.
    const replaced: TaskRow[] = [...tasks];
    const replace = (list: TaskRow[], col: TaskPriority) => {
      list.forEach((t, idx) => {
        const i = replaced.findIndex((r) => r.id === t.id);
        const current = replaced[i];
        if (i >= 0 && current) {
          replaced[i] = { ...current, priority: col, position: idx };
        }
      });
    };
    if (sourceCol === targetCol) {
      replace(nextTarget, targetCol);
    } else {
      replace(nextSource, sourceCol);
      replace(nextTarget, targetCol);
    }
    setTasks(replaced);

    if (updates.length === 0) return;

    startTransition(async () => {
      try {
        const res = await fetch('/api/tasks/reorder', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ updates }),
        });
        if (!res.ok) throw new Error(await res.text());
        router.refresh();
      } catch (err) {
        setTasks(beforeSnapshot);
        toast.error('Falha ao reordenar', {
          description: err instanceof Error ? err.message : 'Erro',
        });
      }
    });
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
          {TASK_PRIORITIES.map((p) => (
            <TaskColumn
              key={p}
              priority={p}
              tasks={grouped[p]}
              usersById={usersById}
              onToggleDone={toggleDone}
              onClickTask={(t) => setEditing(t)}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className="rotate-2 w-[260px]">
              <TaskCard
                task={activeTask}
                usersById={usersById}
                onToggleDone={() => {}}
                onClick={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      {editing ? (
        <EditTaskDialog
          task={editing}
          users={users}
          open={!!editing}
          onOpenChange={(v) => {
            if (!v) setEditing(null);
          }}
        />
      ) : null}
    </>
  );
}

'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './task-card';
import { cn } from '@/lib/utils';
import { TASK_PRIORITY_LABELS, type TaskPriority } from '@/types/crm';
import type { TaskRow } from '@/lib/tasks';

interface Props {
  priority: TaskPriority;
  tasks: TaskRow[];
  usersById: Record<string, string>;
  onToggleDone: (task: TaskRow) => void;
  onClickTask: (task: TaskRow) => void;
}

const PRIORITY_ACCENT: Record<TaskPriority, string> = {
  urgent: 'bg-red-500',
  high: 'bg-amber-500',
  medium: 'bg-blue-400',
  low: 'bg-zinc-400',
};

export function TaskColumn({ priority, tasks, usersById, onToggleDone, onClickTask }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col:${priority}`,
    data: { type: 'column', priority },
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
          <span className={cn('size-2 rounded-full', PRIORITY_ACCENT[priority])} />
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
            {TASK_PRIORITY_LABELS[priority]}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground tabular-nums font-medium px-1.5 py-0.5 rounded-md bg-background/60">
          {tasks.length}
        </span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 flex flex-col gap-2 p-2 min-h-[120px] overflow-y-auto">
          {tasks.length === 0 ? (
            <div className="text-[11px] text-muted-foreground/60 text-center py-8 italic">
              sem tarefas
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                usersById={usersById}
                onToggleDone={onToggleDone}
                onClick={onClickTask}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

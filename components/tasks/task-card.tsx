'use client';

import Link from 'next/link';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Building2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { TaskRow } from '@/lib/tasks';
import type { TaskStatus } from '@/types/crm';

interface Props {
  task: TaskRow;
  usersById: Record<string, string>;
  onToggleDone: (task: TaskRow) => void;
  onClick: (task: TaskRow) => void;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  open: 'Aberta',
  doing: 'Em andamento',
  done: 'Concluída',
  blocked: 'Bloqueada',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  open: 'border-zinc-500/40 text-zinc-300',
  doing: 'border-blue-300 text-blue-700 dark:border-blue-500/50 dark:text-blue-300',
  done: 'border-emerald-500/50 text-emerald-300',
  blocked: 'border-red-500/50 text-red-300',
};

export function TaskCard({ task, usersById, onToggleDone, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', priority: task.priority },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const overdue =
    task.status !== 'done' && task.due_at ? isPast(new Date(task.due_at)) : false;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group rounded-xl border border-border/70 bg-card p-3 shadow-xs',
        'hover:border-ring/50 hover:shadow-sm transition-all',
        task.status === 'done' && 'opacity-60',
      )}
      onClick={() => onClick(task)}
    >
      <div className="flex items-start gap-2">
        <Checkbox
          checked={task.status === 'done'}
          onCheckedChange={() => onToggleDone(task)}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0 cursor-pointer">
          <div
            className={cn(
              'text-sm font-medium leading-snug',
              task.status === 'done' && 'line-through',
            )}
          >
            {task.title}
          </div>
          {task.description ? (
            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {task.description}
            </div>
          ) : null}
          <div className="flex items-center gap-2 mt-2 flex-wrap text-[11px] text-muted-foreground">
            <Badge variant="outline" className={cn('text-[10px]', STATUS_COLORS[task.status])}>
              {STATUS_LABELS[task.status]}
            </Badge>
            {task.assignee_id ? <span>→ {usersById[task.assignee_id] ?? '?'}</span> : null}
            {task.due_at ? (
              <span className={overdue ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                📅 {format(new Date(task.due_at), 'dd/MM HH:mm', { locale: ptBR })}
              </span>
            ) : null}
            {task.lead_id ? (
              <Link
                href={`/lead/${task.lead_id}/overview`}
                className="flex items-center gap-1 hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <Building2 className="size-3" />
                {task.lead_name ?? 'Lead'}
              </Link>
            ) : null}
          </div>
        </div>
        <button
          {...attributes}
          {...listeners}
          type="button"
          aria-label="Arrastar"
          className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing px-1 -mx-1 py-1"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="size-4" />
        </button>
      </div>
    </div>
  );
}

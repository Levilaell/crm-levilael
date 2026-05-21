'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trash2, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskRow } from '@/lib/tasks';
import type { TaskStatus } from '@/types/crm';

interface Props {
  tasks: TaskRow[];
  usersById: Record<string, string>;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  open: 'Aberta',
  doing: 'Em andamento',
  done: 'Concluída',
  blocked: 'Bloqueada',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  open: 'border-zinc-500/40 text-zinc-300',
  doing: 'border-blue-500/50 text-blue-300',
  done: 'border-emerald-500/50 text-emerald-300',
  blocked: 'border-red-500/50 text-red-300',
};

export function TaskList({ tasks, usersById }: Props) {
  const router = useRouter();

  async function toggleDone(task: TaskRow) {
    const next: TaskStatus = task.status === 'done' ? 'open' : 'done';
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) router.refresh();
    else toast.error('Falha ao atualizar');
  }

  async function destroy(task: TaskRow) {
    if (!confirm('Deletar tarefa?')) return;
    const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Tarefa removida');
      router.refresh();
    } else {
      toast.error('Falha');
    }
  }

  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">Nenhuma tarefa.</p>;
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task) => {
        const overdue =
          task.status !== 'done' && task.due_at ? isPast(new Date(task.due_at)) : false;
        return (
          <li
            key={task.id}
            className={cn(
              'group rounded-md border p-3 flex items-start gap-3 transition-colors hover:border-ring/50',
              task.status === 'done' && 'opacity-60',
            )}
          >
            <Checkbox
              checked={task.status === 'done'}
              onCheckedChange={() => toggleDone(task)}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <div className={cn('text-sm font-medium', task.status === 'done' && 'line-through')}>
                {task.title}
              </div>
              {task.description ? (
                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {task.description}
                </div>
              ) : null}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-muted-foreground">
                <Badge variant="outline" className={cn('text-[10px]', STATUS_COLORS[task.status])}>
                  {STATUS_LABELS[task.status]}
                </Badge>
                {task.assignee_id ? <span>→ {usersById[task.assignee_id] ?? '?'}</span> : null}
                {task.due_at ? (
                  <span className={overdue ? 'text-red-400' : ''}>
                    📅 {format(new Date(task.due_at), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                ) : null}
                {task.lead_id ? (
                  <Link
                    href={`/lead/${task.lead_id}/overview`}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    <Building2 className="size-3" />
                    {task.lead_name ?? 'Lead'}
                  </Link>
                ) : null}
              </div>
            </div>
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={() => destroy(task)}
              className="opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="size-3" />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

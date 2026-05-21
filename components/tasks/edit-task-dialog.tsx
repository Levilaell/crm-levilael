'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  type TaskPriority,
  type TaskStatus,
} from '@/types/crm';
import type { TaskRow } from '@/lib/tasks';

interface Props {
  task: TaskRow;
  users: Array<{ id: string; display_name: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_OPTIONS: Array<{ value: TaskStatus; label: string }> = [
  { value: 'open', label: 'Aberta' },
  { value: 'doing', label: 'Em andamento' },
  { value: 'blocked', label: 'Bloqueada' },
  { value: 'done', label: 'Concluída' },
];

// Converte ISO em string aceita por <input type="datetime-local"> no fuso local.
function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const tz = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}

export function EditTaskDialog({ task, users, open, onOpenChange }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [assigneeId, setAssigneeId] = useState(task.assignee_id ?? '__none__');
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [dueAt, setDueAt] = useState<string>(isoToLocalInput(task.due_at));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? '');
    setAssigneeId(task.assignee_id ?? '__none__');
    setStatus(task.status);
    setPriority(task.priority);
    setDueAt(isoToLocalInput(task.due_at));
  }, [task]);

  async function submit() {
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() ? description : null,
          assignee_id: assigneeId === '__none__' ? null : assigneeId,
          status,
          priority,
          due_at: dueAt ? new Date(dueAt).toISOString() : null,
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      toast.success('Tarefa atualizada');
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error('Falha', { description: err instanceof Error ? err.message : 'Erro' });
    } finally {
      setSaving(false);
    }
  }

  async function destroy() {
    if (!confirm('Deletar tarefa?')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error ?? `HTTP ${res.status}`);
      }
      toast.success('Tarefa removida');
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error('Falha ao deletar', {
        description: err instanceof Error ? err.message : 'Erro',
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar tarefa</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="et-title">Título</Label>
            <Input
              id="et-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="et-desc">Descrição</Label>
            <Textarea
              id="et-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {TASK_PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Responsável</Label>
              <Select
                value={assigneeId}
                onValueChange={(v) => setAssigneeId(v ?? '__none__')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem responsável</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="et-due">Vencimento</Label>
              <Input
                id="et-due"
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="flex !justify-between gap-2">
          <Button
            variant="ghost"
            onClick={destroy}
            disabled={deleting || saving}
            className="text-red-600 hover:text-red-700 hover:bg-red-500/10"
          >
            {deleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="size-4" />
                Deletar
              </>
            )}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={!title.trim() || saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : 'Salvar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

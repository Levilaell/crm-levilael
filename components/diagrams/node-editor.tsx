'use client';

import { useEffect, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Node } from '@xyflow/react';

interface NodeEditorProps {
  node: Node;
  onUpdate: (data: Partial<Record<string, unknown>>) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function NodeEditor({ node, onUpdate, onDelete, onClose }: NodeEditorProps) {
  const data = node.data as { label?: string; description?: string; severity?: string };
  const [label, setLabel] = useState(data.label ?? '');
  const [description, setDescription] = useState(data.description ?? '');
  const [severity, setSeverity] = useState(data.severity ?? '__none__');

  useEffect(() => {
    setLabel(data.label ?? '');
    setDescription(data.description ?? '');
    setSeverity(data.severity ?? '__none__');
  }, [node.id, data.label, data.description, data.severity]);

  const hasSeverity = node.type === 'pain' || node.type === 'risk';

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-md p-3 w-[280px] shadow-lg space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-zinc-400">Editar nó</span>
        <Button size="icon-xs" variant="ghost" onClick={onClose}>
          <X className="size-3" />
        </Button>
      </div>
      <div className="space-y-2">
        <div className="space-y-1">
          <Label className="text-xs">Título</Label>
          <Input
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              onUpdate({ label: e.target.value });
            }}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Descrição</Label>
          <Textarea
            rows={3}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              onUpdate({ description: e.target.value });
            }}
          />
        </div>
        {hasSeverity ? (
          <div className="space-y-1">
            <Label className="text-xs">Severidade</Label>
            <Select
              value={severity}
              onValueChange={(v) => {
                const next = v ?? '__none__';
                setSeverity(next);
                onUpdate({ severity: next === '__none__' ? undefined : next });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
      <Button variant="destructive" size="sm" onClick={onDelete} className="w-full">
        <Trash2 className="size-3" />
        Deletar nó
      </Button>
    </div>
  );
}

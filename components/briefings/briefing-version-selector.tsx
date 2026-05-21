'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { BriefingRow } from '@/lib/briefings';

interface VersionSelectorProps<T> {
  briefings: BriefingRow[];
  Renderer: (props: { briefing: T }) => React.ReactNode;
}

export function BriefingVersionSelector<T>({
  briefings,
  Renderer,
}: VersionSelectorProps<T>) {
  const [selectedId, setSelectedId] = useState(briefings[0]?.id ?? '');
  const current = briefings.find((b) => b.id === selectedId) ?? briefings[0];

  if (!current) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Select value={selectedId} onValueChange={(v) => setSelectedId(v ?? '')}>
          <SelectTrigger className="w-[260px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {briefings.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                v{b.version} ·{' '}
                {format(new Date(b.generated_at), "dd/MM HH:mm", { locale: ptBR })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {current.ai_model ?? '—'} · {current.prompt_tokens ?? 0}+{current.completion_tokens ?? 0} tk
        </span>
      </div>
      <Renderer briefing={current.content_json as T} />
    </div>
  );
}

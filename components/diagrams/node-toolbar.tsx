'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { NODE_CONFIG } from './node-config';
import type { DiagramNodeType } from '@/types/crm';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  onAdd: (type: DiagramNodeType) => void;
}

export function NodeToolbar({ onAdd }: ToolbarProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button size="sm" variant="secondary">
            <Plus className="size-4" />
            Nó
          </Button>
        }
      />
      <PopoverContent align="start" className="w-[280px] p-2 bg-zinc-900 border-zinc-700">
        <div className="grid grid-cols-2 gap-1">
          {(Object.entries(NODE_CONFIG) as [DiagramNodeType, typeof NODE_CONFIG[DiagramNodeType]][]).map(
            ([type, cfg]) => {
              const Icon = cfg.icon;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    onAdd(type);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded border text-xs hover:opacity-80 transition-opacity text-left',
                    cfg.bg,
                    cfg.border,
                    cfg.text,
                  )}
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span className="truncate">{cfg.label}</span>
                </button>
              );
            },
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

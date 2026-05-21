'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { NODE_CONFIG } from './node-config';
import type { DiagramNodeType, Severity } from '@/types/crm';

const SEVERITY_OPACITY: Record<Severity, string> = {
  alta: 'ring-2 ring-red-500/60',
  media: 'ring-1 ring-amber-500/50',
  baixa: '',
};

export function CustomDiagramNode({ type, data }: NodeProps) {
  const nodeType = (type ?? 'process') as DiagramNodeType;
  const config = NODE_CONFIG[nodeType] ?? NODE_CONFIG.process;
  const Icon = config.icon;
  const d = data as { label?: string; description?: string; severity?: Severity } | undefined;
  const sev = d?.severity;

  return (
    <div
      className={cn(
        'rounded-md border px-3 py-2 min-w-[140px] max-w-[240px] shadow-sm',
        config.bg,
        config.border,
        config.text,
        sev ? SEVERITY_OPACITY[sev] : null,
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-white/40 !border-none !w-2 !h-2" />
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className="size-3.5 shrink-0 opacity-80" />
        <span className="text-[10px] uppercase tracking-wider opacity-70 font-medium">
          {config.label}
        </span>
      </div>
      <div className="text-sm font-medium leading-tight break-words">{d?.label ?? '—'}</div>
      {d?.description ? (
        <div className="text-[11px] opacity-80 mt-1 leading-snug break-words">
          {d.description}
        </div>
      ) : null}
      <Handle type="source" position={Position.Right} className="!bg-white/40 !border-none !w-2 !h-2" />
    </div>
  );
}

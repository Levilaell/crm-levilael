'use client';

interface DiagnosisRenderProps {
  answers: Record<string, unknown> | null;
}

function renderValue(v: unknown, depth = 0): React.ReactNode {
  if (v === null || v === undefined || v === '') return <span className="text-muted-foreground/60">—</span>;
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
    return <span className="text-sm">{String(v)}</span>;
  }
  if (Array.isArray(v)) {
    if (v.length === 0) return <span className="text-muted-foreground/60">vazio</span>;
    return (
      <ul className="list-disc pl-5 space-y-0.5">
        {v.map((item, i) => (
          <li key={i} className="text-sm">
            {renderValue(item, depth + 1)}
          </li>
        ))}
      </ul>
    );
  }
  if (typeof v === 'object') {
    return (
      <div className="space-y-1">
        {Object.entries(v as Record<string, unknown>).map(([k, val]) => (
          <div key={k} className={depth > 0 ? 'pl-3 border-l border-border/40' : ''}>
            <span className="text-xs font-medium text-muted-foreground">{humanize(k)}</span>
            <div className="mt-0.5">{renderValue(val, depth + 1)}</div>
          </div>
        ))}
      </div>
    );
  }
  return <span className="text-sm">{String(v)}</span>;
}

function humanize(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

export function DiagnosisRender({ answers }: DiagnosisRenderProps) {
  if (!answers || Object.keys(answers).length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-2">Sem respostas de diagnóstico.</div>
    );
  }
  return <div className="space-y-2">{renderValue(answers)}</div>;
}

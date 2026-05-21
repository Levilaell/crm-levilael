'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Check, X } from 'lucide-react';

interface HealthResult {
  service: string;
  ok: boolean;
  latency_ms?: number;
  detail?: string;
}

export function HealthStatus() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<HealthResult[]>([]);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  async function check() {
    setLoading(true);
    try {
      const res = await fetch('/api/health');
      const json = (await res.json()) as { results: HealthResult[]; checked_at: string };
      setResults(json.results);
      setCheckedAt(new Date(json.checked_at));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void check();
  }, []);

  return (
    <div className="space-y-3 max-w-md">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {checkedAt ? `Verificado ${checkedAt.toLocaleTimeString('pt-BR')}` : '—'}
        </div>
        <Button size="sm" variant="ghost" onClick={check} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Verificar
        </Button>
      </div>
      <ul className="space-y-1.5">
        {results.map((r) => (
          <li
            key={r.service}
            className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
          >
            <div className="flex items-center gap-2">
              {r.ok ? (
                <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <X className="size-4 text-red-600 dark:text-red-400" />
              )}
              <span className="text-sm capitalize">{r.service}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {r.latency_ms ? <Badge variant="outline">{r.latency_ms}ms</Badge> : null}
              {r.detail ? <span>{r.detail}</span> : null}
            </div>
          </li>
        ))}
        {results.length === 0 && !loading ? (
          <li className="text-sm text-muted-foreground">Sem dados.</li>
        ) : null}
      </ul>
    </div>
  );
}

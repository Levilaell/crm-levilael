'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Presentation, RefreshCw, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SlideDeck {
  id: string;
  kind: 'discovery_prep' | 'proposal';
  created_at: string;
}

interface Props {
  leadId: string;
  kind: 'discovery_prep' | 'proposal';
  decks: SlideDeck[];
  prerequisiteMet: boolean;
  prerequisiteMessage: string;
}

export function SlideDeckCard({
  leadId,
  kind,
  decks,
  prerequisiteMet,
  prerequisiteMessage,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const latest = decks[0];
  const older = decks.slice(1);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch('/api/slides/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, kind }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      toast.success('PPTX gerado');
      router.refresh();
    } catch (err) {
      toast.error('Falha', { description: err instanceof Error ? err.message : 'Erro' });
    } finally {
      setLoading(false);
    }
  }

  if (!prerequisiteMet) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-end">
          <Button size="sm" disabled>
            <Presentation className="size-4" />
            Gerar PPTX
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{prerequisiteMessage}</p>
      </div>
    );
  }

  if (!latest) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-end">
          <Button size="sm" onClick={generate} disabled={loading}>
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Presentation className="size-4" />
                Gerar PPTX
              </>
            )}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Vai gerar um .pptx final usando o briefing como base. Download direto após pronto.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Última versão em destaque */}
      <div className="flex items-center justify-between gap-2 rounded-md border p-3">
        <div className="flex items-baseline gap-2 text-sm">
          <span className="font-medium text-foreground">Última versão</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {format(new Date(latest.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            render={
              <a href={`/api/slides/${latest.id}/download`} download>
                <Download className="size-4" />
                Baixar PPTX
              </a>
            }
          />
          <Button size="sm" variant="outline" onClick={generate} disabled={loading}>
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="size-4" />
                Regenerar
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Histórico de versões anteriores (visível, sem <details>) */}
      {older.length > 0 ? (
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground px-1">
            Versões anteriores ({older.length})
          </div>
          <ul className="divide-y rounded-md border">
            {older.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <span className="tabular-nums text-muted-foreground">
                  {format(new Date(d.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  render={
                    <a href={`/api/slides/${d.id}/download`} download>
                      <Download className="size-3.5" />
                      baixar
                    </a>
                  }
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

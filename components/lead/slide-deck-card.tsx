'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Presentation, RefreshCw, ExternalLink } from 'lucide-react';
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

export function SlideDeckCard({ leadId, kind, decks, prerequisiteMet, prerequisiteMessage }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const latest = decks[0];

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
      toast.success('Slides gerados');
      router.refresh();
    } catch (err) {
      toast.error('Falha', { description: err instanceof Error ? err.message : 'Erro' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          {latest ? `Última: ${format(new Date(latest.created_at), "dd/MM HH:mm", { locale: ptBR })}` : 'Sem slides ainda'}
        </div>
        <div className="flex items-center gap-1">
          {latest ? (
            <Button
              size="sm"
              variant="ghost"
              render={
                <a href={`/api/slides/${latest.id}/view`} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" />
                  Abrir
                </a>
              }
            />
          ) : null}
          <Button
            size="sm"
            variant={latest ? 'outline' : 'default'}
            onClick={generate}
            disabled={!prerequisiteMet || loading}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : latest ? (
              <>
                <RefreshCw className="size-4" />
                Regenerar
              </>
            ) : (
              <>
                <Presentation className="size-4" />
                Gerar slides
              </>
            )}
          </Button>
        </div>
      </div>
      {!prerequisiteMet ? (
        <p className="text-sm text-muted-foreground">{prerequisiteMessage}</p>
      ) : (
        <div className="text-xs text-muted-foreground">
          {latest
            ? 'Abra em nova aba pra revisar e use Ctrl+P / Cmd+P para salvar como PDF.'
            : 'Vai gerar HTML standalone com botão de impressão.'}
        </div>
      )}
    </div>
  );
}

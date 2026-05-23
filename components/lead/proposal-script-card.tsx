'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Copy, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { BriefingRow } from '@/lib/briefings';

interface Props {
  leadId: string;
  scripts: BriefingRow[];
  hasTriageBriefing: boolean;
  hasDiscoveryBriefing: boolean;
}

export function ProposalScriptCard({
  leadId,
  scripts,
  hasTriageBriefing,
  hasDiscoveryBriefing,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const latest = scripts[0];
  const prerequisiteMet = hasTriageBriefing && hasDiscoveryBriefing;

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch('/api/scripts/generate-proposal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        data?: { version: number };
      };
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      toast.success(`Script v${json.data?.version} gerado`);
      router.refresh();
    } catch (err) {
      toast.error('Falha', { description: err instanceof Error ? err.message : 'Erro' });
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!latest?.content_markdown) return;
    await navigator.clipboard.writeText(latest.content_markdown);
    toast.success('Script copiado');
  }

  const missingMessage = !hasTriageBriefing
    ? 'Gere o briefing de triagem primeiro.'
    : !hasDiscoveryBriefing
      ? 'Gere o briefing de descoberta primeiro.'
      : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          {latest
            ? `v${latest.version} · ${latest.prompt_tokens ?? 0}+${latest.completion_tokens ?? 0} tk`
            : null}
        </div>
        <div className="flex items-center gap-1">
          {latest ? (
            <Button size="sm" variant="ghost" onClick={copy}>
              <Copy className="size-4" />
              Copiar
            </Button>
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
                <Sparkles className="size-4" />
                Gerar script
              </>
            )}
          </Button>
        </div>
      </div>
      {missingMessage ? (
        <p className="text-sm text-muted-foreground">{missingMessage}</p>
      ) : !latest ? (
        <p className="text-sm text-muted-foreground">Sem script ainda.</p>
      ) : (
        <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed p-4 rounded-md bg-muted/40 border max-h-[400px] overflow-y-auto">
          {latest.content_markdown}
        </pre>
      )}
    </div>
  );
}

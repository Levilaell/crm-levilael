'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Markdown } from '@/components/ui/markdown';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import type { BriefingRow } from '@/lib/briefings';

interface Props {
  leadId: string;
  scripts: BriefingRow[];
  hasTriageBriefing: boolean;
  hasDiscoveryBriefing: boolean;
  defaultExpanded?: boolean;
}

export function ProposalScriptCard({
  leadId,
  scripts,
  hasTriageBriefing,
  hasDiscoveryBriefing,
  defaultExpanded = false,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(defaultExpanded);
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
      <div className="flex items-center justify-between gap-2 flex-wrap">
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
      ) : expanded ? (
        <div className="space-y-2">
          <div className="p-4 rounded-md bg-muted/40 border max-h-[480px] overflow-y-auto">
            <Markdown>{latest.content_markdown ?? ''}</Markdown>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setExpanded(false)}
            className="-ml-2"
          >
            <ChevronUp className="size-4" />
            Recolher
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <p className="text-sm leading-relaxed line-clamp-3 text-muted-foreground/90 whitespace-pre-wrap">
              {latest.content_markdown ?? ''}
            </p>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-card to-transparent" />
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setExpanded(true)}
            className="-ml-2"
          >
            <ChevronDown className="size-4" />
            Expandir
          </Button>
        </div>
      )}
    </div>
  );
}

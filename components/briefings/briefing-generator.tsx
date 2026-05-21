'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface BriefingGeneratorProps {
  leadId: string;
  kind: 'triage' | 'discovery';
  hasTranscription: boolean;
  hasBriefing: boolean;
}

export function BriefingGenerator({ leadId, kind, hasTranscription, hasBriefing }: BriefingGeneratorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const endpoint =
        kind === 'triage'
          ? '/api/briefings/generate-triage'
          : '/api/briefings/generate-discovery';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string; data?: { version: number } };
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      toast.success(`Briefing v${json.data?.version} gerado`);
      router.refresh();
    } catch (err) {
      toast.error('Falha ao gerar', {
        description: err instanceof Error ? err.message : 'Erro desconhecido',
      });
    } finally {
      setLoading(false);
    }
  }

  if (!hasTranscription) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        Adicione uma transcrição antes de gerar o briefing.
      </div>
    );
  }

  return (
    <Button onClick={generate} disabled={loading} variant={hasBriefing ? 'outline' : 'default'}>
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : hasBriefing ? (
        <>
          <RefreshCw className="size-4" />
          Regenerar
        </>
      ) : (
        <>
          <Sparkles className="size-4" />
          Gerar briefing
        </>
      )}
    </Button>
  );
}

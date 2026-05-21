'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trash2, Save, Edit, X } from 'lucide-react';
import { toast } from 'sonner';
import type { TranscriptionRow } from '@/lib/transcriptions';

interface ListProps {
  leadId: string;
  transcriptions: TranscriptionRow[];
}

export function TranscriptionList({ leadId, transcriptions }: ListProps) {
  if (transcriptions.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">Nenhuma transcrição ainda.</p>;
  }
  return (
    <div className="space-y-3">
      {transcriptions.map((t) => (
        <TranscriptionItem key={t.id} leadId={leadId} transcription={t} />
      ))}
    </div>
  );
}

function TranscriptionItem({ leadId, transcription }: { leadId: string; transcription: TranscriptionRow }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(transcription.raw_text);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/transcriptions/${transcription.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setEditing(false);
      toast.success('Transcrição atualizada');
      router.refresh();
    } catch (err) {
      toast.error('Falha ao salvar', {
        description: err instanceof Error ? err.message : 'Erro',
      });
    } finally {
      setSaving(false);
    }
  }

  async function destroy() {
    if (!confirm('Deletar essa transcrição? O áudio também será removido.')) return;
    const res = await fetch(`/api/leads/${leadId}/transcriptions/${transcription.id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      toast.success('Removida');
      router.refresh();
    } else {
      toast.error('Falha ao deletar');
    }
  }

  return (
    <div className="border rounded-md p-3 space-y-2 bg-card/50">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {transcription.source_type === 'audio_upload' ? 'áudio' : 'texto'}
          </Badge>
          <span>
            {transcription.word_count ? `${transcription.word_count} palavras` : '—'}
            {transcription.duration_seconds ? ` · ${transcription.duration_seconds}s` : ''}
          </span>
          <span>·</span>
          <span>
            {format(new Date(transcription.created_at), "dd/MM HH:mm", { locale: ptBR })}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {editing ? (
            <>
              <Button size="xs" variant="outline" onClick={() => { setEditing(false); setText(transcription.raw_text); }}>
                <X className="size-3" />
                Cancelar
              </Button>
              <Button size="xs" onClick={save} disabled={saving}>
                <Save className="size-3" />
                Salvar
              </Button>
            </>
          ) : (
            <>
              <Button size="xs" variant="ghost" onClick={() => setEditing(true)}>
                <Edit className="size-3" />
                Editar
              </Button>
              <Button size="xs" variant="ghost" onClick={destroy}>
                <Trash2 className="size-3" />
              </Button>
            </>
          )}
        </div>
      </div>
      {editing ? (
        <Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} />
      ) : (
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{transcription.raw_text}</p>
      )}
    </div>
  );
}

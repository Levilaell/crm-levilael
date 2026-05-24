'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Pencil, Save, Trash2 } from 'lucide-react';
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

function TranscriptionItem({
  leadId,
  transcription,
}: {
  leadId: string;
  transcription: TranscriptionRow;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(transcription.raw_text);
  const [saving, setSaving] = useState(false);

  const charCount = transcription.raw_text.length;
  const minutes = transcription.duration_seconds
    ? Math.max(1, Math.round(transcription.duration_seconds / 60))
    : null;

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
      setOpen(false);
      router.refresh();
    } else {
      toast.error('Falha ao deletar');
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setEditing(false);
      setText(transcription.raw_text);
    }
  }

  return (
    <div className="border rounded-md p-3 space-y-2 bg-card/50">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px]">
            {transcription.source_type === 'audio_upload' ? 'áudio' : 'texto'}
          </Badge>
          <span>
            {transcription.word_count
              ? `${transcription.word_count.toLocaleString('pt-BR')} palavras`
              : `${charCount.toLocaleString('pt-BR')} chars`}
          </span>
          {minutes ? (
            <>
              <span>·</span>
              <span>{minutes} min</span>
            </>
          ) : null}
          <span>·</span>
          <span>{format(new Date(transcription.created_at), 'dd/MM HH:mm', { locale: ptBR })}</span>
        </div>
        <Sheet open={open} onOpenChange={handleOpenChange}>
          <SheetTrigger
            render={
              <Button size="xs" variant="outline">
                <FileText className="size-3" />
                Ver transcrição
              </Button>
            }
          />
          <SheetContent side="right" className="w-full sm:max-w-2xl p-0">
            <SheetHeader>
              <SheetTitle>
                Transcrição ·{' '}
                {transcription.kind === 'triage_call'
                  ? 'triagem'
                  : transcription.kind === 'discovery_call'
                    ? 'descoberta'
                    : 'outra'}
              </SheetTitle>
              <SheetDescription>
                {transcription.word_count?.toLocaleString('pt-BR') ?? charCount.toLocaleString('pt-BR')}{' '}
                {transcription.word_count ? 'palavras' : 'chars'}
                {minutes ? ` · ${minutes} min` : ''} ·{' '}
                {format(new Date(transcription.created_at), "dd 'de' MMM yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
              {editing ? (
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="font-mono text-xs h-full min-h-[400px] resize-none"
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">
                  {transcription.raw_text}
                </p>
              )}
            </div>
            <SheetFooter className="border-t flex-row items-center justify-between gap-2 mt-0">
              <Button variant="ghost" size="sm" onClick={destroy}>
                <Trash2 className="size-4" />
                Deletar
              </Button>
              <div className="flex gap-2">
                {editing ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(false);
                        setText(transcription.raw_text);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={save} disabled={saving}>
                      <Save className="size-4" />
                      Salvar
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <Pencil className="size-4" />
                    Editar
                  </Button>
                )}
              </div>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      <div className="relative">
        <p className="text-sm leading-relaxed line-clamp-3 text-muted-foreground/90 whitespace-pre-wrap">
          {transcription.raw_text}
        </p>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-card/80 to-transparent" />
      </div>
    </div>
  );
}

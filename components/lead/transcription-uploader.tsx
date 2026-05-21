'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { TranscriptionKind } from '@/types/crm';

interface UploaderProps {
  leadId: string;
  kind: TranscriptionKind;
}

const MAX_BYTES = 25 * 1024 * 1024;

async function parseError(res: Response): Promise<string> {
  try {
    const json = (await res.clone().json()) as { error?: string };
    if (json?.error) return json.error;
  } catch {
    // não era JSON (provavelmente HTML do Vercel/proxy)
  }
  return `HTTP ${res.status}`;
}

export function TranscriptionUploader({ leadId, kind }: UploaderProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [savingText, setSavingText] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function uploadAudio(file: File) {
    if (file.size > MAX_BYTES) {
      toast.error('Arquivo grande demais', {
        description: `Máximo 25MB · este tem ${(file.size / 1024 / 1024).toFixed(1)}MB`,
      });
      return;
    }

    setUploading(true);
    try {
      const ext = (file.name.split('.').pop() || 'm4a').toLowerCase();

      // 1) pede signed upload URL
      const urlRes = await fetch(`/api/leads/${leadId}/transcribe/upload-url`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, ext, size: file.size }),
      });
      if (!urlRes.ok) throw new Error(await parseError(urlRes));
      const urlJson = (await urlRes.json()) as {
        ok: boolean;
        error?: string;
        data?: { path: string; token: string };
      };
      if (!urlJson.ok || !urlJson.data) throw new Error(urlJson.error ?? 'signed url failed');

      // 2) sobe direto pro Storage (sem passar pelo Vercel function body de 4.5MB)
      const supabase = createClient();
      const { error: uploadErr } = await supabase.storage
        .from('crm_audio')
        .uploadToSignedUrl(urlJson.data.path, urlJson.data.token, file, {
          contentType: file.type || 'audio/mpeg',
        });
      if (uploadErr) throw new Error(uploadErr.message || 'upload failed');

      // 3) dispara transcrição
      const res = await fetch(`/api/leads/${leadId}/transcribe`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          storage_path: urlJson.data.path,
          kind,
          file_name: file.name,
          file_type: file.type || 'audio/mpeg',
          file_size: file.size,
        }),
      });
      if (!res.ok) throw new Error(await parseError(res));
      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        data?: { word_count: number; duration_seconds: number | null };
      };
      if (!json.ok) throw new Error(json.error ?? 'transcription failed');

      toast.success('Transcrição pronta', {
        description: `${json.data?.word_count ?? '?'} palavras${json.data?.duration_seconds ? ` · ${json.data.duration_seconds}s` : ''}`,
      });
      router.refresh();
    } catch (err) {
      toast.error('Falha na transcrição', {
        description: err instanceof Error ? err.message : 'Erro desconhecido',
      });
    } finally {
      setUploading(false);
    }
  }

  async function saveText() {
    if (!pastedText.trim()) return;
    setSavingText(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/transcriptions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, text: pastedText }),
      });
      if (!res.ok) throw new Error(await parseError(res));
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? 'save failed');
      setPastedText('');
      toast.success('Transcrição salva');
      router.refresh();
    } catch (err) {
      toast.error('Falha ao salvar', {
        description: err instanceof Error ? err.message : 'Erro desconhecido',
      });
    } finally {
      setSavingText(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadAudio(file);
  }

  return (
    <Tabs defaultValue="audio">
      <TabsList className="mb-3">
        <TabsTrigger value="audio">Upload de áudio</TabsTrigger>
        <TabsTrigger value="text">Colar texto</TabsTrigger>
      </TabsList>

      <TabsContent value="audio">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-brand bg-brand/5'
              : 'border-border hover:border-ring/60 hover:bg-muted/30'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/ogg,audio/webm"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadAudio(file);
              e.target.value = '';
            }}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
              Transcrevendo… pode levar 30s-2min
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="size-6 text-muted-foreground" />
              <div className="text-sm font-medium">Arraste o áudio ou clique pra escolher</div>
              <div className="text-xs text-muted-foreground">mp3, m4a, wav, ogg, webm · até 25MB (limite do Whisper)</div>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="text" className="space-y-3">
        <Textarea
          rows={10}
          placeholder="Cole aqui a transcrição completa da call..."
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
        />
        <Button onClick={saveText} disabled={!pastedText.trim() || savingText}>
          {savingText ? <Loader2 className="size-4 animate-spin" /> : 'Salvar transcrição'}
        </Button>
      </TabsContent>
    </Tabs>
  );
}

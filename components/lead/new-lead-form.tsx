'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { LEAD_SOURCES, SOURCE_LABELS, type LeadSource, type DiagnosisSnapshot } from '@/types/crm';
import { formatPhoneBRDisplay } from '@/lib/phone';

interface Props {
  snapshot: DiagnosisSnapshot | null;
}

export function NewLeadForm({ snapshot }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    source: 'manual' as LeadSource,
    name: snapshot?.name ?? '',
    email: snapshot?.email ?? '',
    phone: snapshot?.phone ? formatPhoneBRDisplay(snapshot.phone) : '',
    company_name: '',
    role_title: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          source: form.source,
          name: form.name,
          email: form.email || null,
          phone: form.phone,
          company_name: form.company_name || null,
          role_title: form.role_title || null,
          notes: form.notes || null,
          from_diagnosis: snapshot?.id ?? null,
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string; data?: { id: string }; existing_id?: string };
      if (res.status === 409 && json.existing_id) {
        toast.warning('Lead já existe', {
          description: 'Mesmo phone + origem já tem registro.',
          action: { label: 'Abrir', onClick: () => router.push(`/lead/${json.existing_id}/overview`) },
        });
        return;
      }
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      toast.success('Lead criado');
      router.push(`/lead/${json.data!.id}/overview`);
    } catch (err) {
      toast.error('Falha ao criar', {
        description: err instanceof Error ? err.message : 'Erro',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {snapshot ? (
        <Alert>
          <AlertDescription className="text-xs">
            Criando lead a partir do diagnóstico de{' '}
            <span className="font-medium">{snapshot.name ?? snapshot.email ?? 'anônimo'}</span>.
            As respostas serão copiadas pro lead e o diagnóstico será marcado como convertido.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Origem</Label>
          <Select
            value={form.source}
            onValueChange={(v) => v && setForm((f) => ({ ...f, source: v as LeadSource }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {SOURCE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="n-name">Nome</Label>
          <Input
            id="n-name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="n-email">Email</Label>
          <Input
            id="n-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="n-phone">Telefone</Label>
          <Input
            id="n-phone"
            placeholder="(11) 99999-9999"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="n-company">Empresa</Label>
          <Input
            id="n-company"
            value={form.company_name}
            onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="n-role">Cargo</Label>
          <Input
            id="n-role"
            value={form.role_title}
            onChange={(e) => setForm((f) => ({ ...f, role_title: e.target.value }))}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="n-notes">Observações</Label>
        <Textarea
          id="n-notes"
          rows={3}
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
      </div>
      <Button onClick={submit} disabled={!form.name.trim() || !form.phone.trim() || saving}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : 'Criar lead'}
      </Button>
    </div>
  );
}

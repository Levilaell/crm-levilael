'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { QUALIFICATIONS } from '@/types/crm';
import type { LeadRow } from '@/lib/leads';

interface LeadOverviewFormProps {
  lead: LeadRow;
}

export function LeadOverviewForm({ lead }: LeadOverviewFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: lead.name,
    email: lead.email ?? '',
    phone: lead.phone ?? '',
    company_name: lead.company_name ?? '',
    role_title: lead.role_title ?? '',
    qualification: lead.qualification ?? '__none__',
    qualification_reason: lead.qualification_reason ?? '',
    estimated_ticket_min: lead.estimated_ticket_min?.toString() ?? '',
    estimated_ticket_max: lead.estimated_ticket_max?.toString() ?? '',
    notes: lead.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  const update = (key: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  async function handleSave() {
    setSaving(true);
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      company_name: form.company_name.trim() || null,
      role_title: form.role_title.trim() || null,
      qualification: form.qualification === '__none__' ? null : form.qualification,
      qualification_reason: form.qualification_reason.trim() || null,
      estimated_ticket_min: form.estimated_ticket_min
        ? Number.parseInt(form.estimated_ticket_min, 10)
        : null,
      estimated_ticket_max: form.estimated_ticket_max
        ? Number.parseInt(form.estimated_ticket_max, 10)
        : null,
      notes: form.notes.trim() || null,
    };
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      toast.success('Salvo');
      router.refresh();
    } catch (err) {
      toast.error('Falha ao salvar', {
        description: err instanceof Error ? err.message : 'Erro desconhecido',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" value={form.name} onChange={(e) => update('name')(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company_name">Empresa</Label>
          <Input
            id="company_name"
            value={form.company_name}
            onChange={(e) => update('company_name')(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => update('email')(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" value={form.phone} onChange={(e) => update('phone')(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role_title">Cargo</Label>
          <Input
            id="role_title"
            value={form.role_title}
            onChange={(e) => update('role_title')(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Qualificação</Label>
          <Select
            value={form.qualification}
            onValueChange={(v) => setForm((f) => ({ ...f, qualification: v ?? '__none__' }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sem qualificação</SelectItem>
              {QUALIFICATIONS.map((q) => (
                <SelectItem key={q} value={q}>
                  {q}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ticket_min">Ticket mín. (R$)</Label>
          <Input
            id="ticket_min"
            type="number"
            min={0}
            value={form.estimated_ticket_min}
            onChange={(e) => update('estimated_ticket_min')(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ticket_max">Ticket máx. (R$)</Label>
          <Input
            id="ticket_max"
            type="number"
            min={0}
            value={form.estimated_ticket_max}
            onChange={(e) => update('estimated_ticket_max')(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="qualification_reason">Motivo da qualificação</Label>
        <Textarea
          id="qualification_reason"
          rows={2}
          value={form.qualification_reason}
          onChange={(e) => update('qualification_reason')(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notas internas</Label>
        <Textarea
          id="notes"
          rows={4}
          value={form.notes}
          onChange={(e) => update('notes')(e.target.value)}
        />
      </div>
      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Salvando…' : 'Salvar alterações'}
      </Button>
    </div>
  );
}

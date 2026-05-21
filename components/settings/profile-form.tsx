'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface Props {
  user: {
    display_name: string;
    email: string;
    telegram_chat_id: string | null;
    receives_new_leads: boolean;
    receives_sla_alerts: boolean;
    receives_briefing_ready: boolean;
  };
}

export function ProfileForm({ user }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    display_name: user.display_name,
    telegram_chat_id: user.telegram_chat_id ?? '',
    receives_new_leads: user.receives_new_leads,
    receives_sla_alerts: user.receives_sla_alerts,
    receives_briefing_ready: user.receives_briefing_ready,
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          display_name: form.display_name,
          telegram_chat_id: form.telegram_chat_id || null,
          receives_new_leads: form.receives_new_leads,
          receives_sla_alerts: form.receives_sla_alerts,
          receives_briefing_ready: form.receives_briefing_ready,
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      toast.success('Perfil salvo');
      router.refresh();
    } catch (err) {
      toast.error('Falha', { description: err instanceof Error ? err.message : 'Erro' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 max-w-md">
      <div className="space-y-1.5">
        <Label htmlFor="p-name">Nome</Label>
        <Input
          id="p-name"
          value={form.display_name}
          onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Email</Label>
        <Input value={user.email} disabled />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="p-tg">Telegram chat_id</Label>
        <Input
          id="p-tg"
          placeholder="123456789"
          value={form.telegram_chat_id}
          onChange={(e) => setForm((f) => ({ ...f, telegram_chat_id: e.target.value }))}
        />
        <p className="text-xs text-muted-foreground">
          Pra descobrir: mande <code>/start</code> pro bot e use{' '}
          <a
            href="https://t.me/userinfobot"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-foreground"
          >
            @userinfobot
          </a>{' '}
          pra pegar seu id.
        </p>
      </div>

      <div className="space-y-2.5 border-t pt-4">
        <div className="text-sm font-medium">Notificações</div>
        <NotifToggle
          label="Lead novo"
          checked={form.receives_new_leads}
          onChange={(v) => setForm((f) => ({ ...f, receives_new_leads: v }))}
        />
        <NotifToggle
          label="Briefing pronto"
          checked={form.receives_briefing_ready}
          onChange={(v) => setForm((f) => ({ ...f, receives_briefing_ready: v }))}
        />
        <NotifToggle
          label="Alerta de SLA"
          checked={form.receives_sla_alerts}
          onChange={(v) => setForm((f) => ({ ...f, receives_sla_alerts: v }))}
        />
      </div>

      <Button onClick={save} disabled={saving}>
        {saving ? 'Salvando…' : 'Salvar'}
      </Button>
    </div>
  );
}

function NotifToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm font-normal cursor-pointer">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

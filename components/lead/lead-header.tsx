'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  LEAD_STAGES,
  QUALIFICATION_COLORS,
  SOURCE_LABELS,
  STAGE_LABELS,
  type LeadStage,
} from '@/types/crm';
import type { LeadRow } from '@/lib/leads';

interface LeadHeaderProps {
  lead: LeadRow;
  users: Array<{ id: string; display_name: string }>;
}

export function LeadHeader({ lead, users }: LeadHeaderProps) {
  const router = useRouter();
  const [stage, setStage] = useState<LeadStage>(lead.stage);
  const [ownerId, setOwnerId] = useState<string | null>(lead.owner_id);
  const [, startTransition] = useTransition();

  async function patch(body: Record<string, unknown>, successMsg: string) {
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error('Falha ao salvar', { description: errBody.error ?? `HTTP ${res.status}` });
      return false;
    }
    toast.success(successMsg);
    startTransition(() => router.refresh());
    return true;
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-semibold tracking-tight truncate">{lead.name}</h1>
          {lead.qualification ? (
            <Badge
              variant="outline"
              className={cn('text-xs', QUALIFICATION_COLORS[lead.qualification])}
            >
              {lead.qualification}
            </Badge>
          ) : null}
          <Badge variant="secondary" className="text-xs">
            {SOURCE_LABELS[lead.source]}
          </Badge>
          {typeof lead.diagnosis_score === 'number' ? (
            <Badge variant="outline" className="text-xs">
              score {lead.diagnosis_score}
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {lead.company_name ? (
            <span className="flex items-center gap-1">
              <Building2 className="size-3.5" />
              {lead.company_name}
            </span>
          ) : null}
          {lead.phone ? (
            <a className="flex items-center gap-1 hover:text-foreground" href={`tel:${lead.phone}`}>
              <Phone className="size-3.5" />
              {lead.phone}
            </a>
          ) : null}
          {lead.email ? (
            <a
              className="flex items-center gap-1 hover:text-foreground"
              href={`mailto:${lead.email}`}
            >
              <Mail className="size-3.5" />
              {lead.email}
            </a>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 lg:shrink-0">
        <Select
          value={stage}
          onValueChange={(v) => {
            const next = v as LeadStage;
            const prev = stage;
            setStage(next);
            patch({ stage: next }, `Estágio → ${STAGE_LABELS[next]}`).then((ok) => {
              if (!ok) setStage(prev);
            });
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LEAD_STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {STAGE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={ownerId ?? '__none__'}
          onValueChange={(v) => {
            const next = v === '__none__' ? null : v;
            const prev = ownerId;
            setOwnerId(next);
            patch({ owner_id: next }, 'Owner atualizado').then((ok) => {
              if (!ok) setOwnerId(prev);
            });
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sem owner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Sem owner</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

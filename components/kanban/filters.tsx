'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useTransition, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { LEAD_SOURCES, QUALIFICATIONS, SOURCE_LABELS } from '@/types/crm';
import { Search, X } from 'lucide-react';

interface FiltersProps {
  users: Array<{ id: string; display_name: string }>;
}

const ALL = '__all__';

export function KanbanFilters({ users }: FiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState(params.get('q') ?? '');
  useEffect(() => {
    setSearch(params.get('q') ?? '');
  }, [params]);

  const update = useCallback(
    (key: string, value: string | null) => {
      const sp = new URLSearchParams(params.toString());
      if (value && value !== ALL && value.length > 0) sp.set(key, value);
      else sp.delete(key);
      const qs = sp.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [params, pathname, router],
  );

  // Debounce search
  useEffect(() => {
    const handle = setTimeout(() => {
      update('q', search || null);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const hasActive =
    params.get('owner') || params.get('qualification') || params.get('source') || params.get('q');

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Buscar nome, empresa, email..."
          className="pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <Select
        value={params.get('owner') ?? ALL}
        onValueChange={(v) => update('owner', v === ALL ? null : v)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Owner" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos owners</SelectItem>
          {users.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.display_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={params.get('qualification') ?? ALL}
        onValueChange={(v) => update('qualification', v === ALL ? null : v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Qualificação" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Toda qualif.</SelectItem>
          {QUALIFICATIONS.map((q) => (
            <SelectItem key={q} value={q}>
              {q}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={params.get('source') ?? ALL}
        onValueChange={(v) => update('source', v === ALL ? null : v)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Origem" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Toda origem</SelectItem>
          {LEAD_SOURCES.map((s) => (
            <SelectItem key={s} value={s}>
              {SOURCE_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasActive ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSearch('');
            startTransition(() => router.replace(pathname));
          }}
        >
          <X className="size-4" />
          Limpar
        </Button>
      ) : null}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export function OrphanFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [scoreMin, setScoreMin] = useState(params.get('score_min') ?? '');
  const [scoreMax, setScoreMax] = useState(params.get('score_max') ?? '');
  const [from, setFrom] = useState(params.get('from') ?? '');
  const [to, setTo] = useState(params.get('to') ?? '');

  useEffect(() => {
    setScoreMin(params.get('score_min') ?? '');
    setScoreMax(params.get('score_max') ?? '');
    setFrom(params.get('from') ?? '');
    setTo(params.get('to') ?? '');
  }, [params]);

  const apply = useCallback(() => {
    const sp = new URLSearchParams();
    if (scoreMin) sp.set('score_min', scoreMin);
    if (scoreMax) sp.set('score_max', scoreMax);
    if (from) sp.set('from', from);
    if (to) sp.set('to', to);
    const qs = sp.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    });
  }, [scoreMin, scoreMax, from, to, pathname, router]);

  const hasActive = !!(scoreMin || scoreMax || from || to);

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label htmlFor="sm" className="text-xs">Score min</Label>
        <Input
          id="sm"
          type="number"
          min={0}
          max={100}
          value={scoreMin}
          onChange={(e) => setScoreMin(e.target.value)}
          className="w-[100px]"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="sx" className="text-xs">Score max</Label>
        <Input
          id="sx"
          type="number"
          min={0}
          max={100}
          value={scoreMax}
          onChange={(e) => setScoreMax(e.target.value)}
          className="w-[100px]"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="fr" className="text-xs">De</Label>
        <Input
          id="fr"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="to" className="text-xs">Até</Label>
        <Input
          id="to"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>
      <Button onClick={apply} size="sm">Aplicar</Button>
      {hasActive ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setScoreMin('');
            setScoreMax('');
            setFrom('');
            setTo('');
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

import { Suspense } from 'react';
import { requireCrmSession } from '@/lib/auth';
import { listOrphanSnapshots } from '@/lib/diagnosis-snapshots';
import { OrphanFilters } from '@/components/diagnosis/orphan-filters';
import { DiagnosisList } from '@/components/diagnosis/diagnosis-list';

interface PageProps {
  searchParams: Promise<{
    score_min?: string;
    score_max?: string;
    from?: string;
    to?: string;
  }>;
}

export default async function DiagnosesPage({ searchParams }: PageProps) {
  await requireCrmSession();
  const params = await searchParams;

  const scoreMin = parseIntOrUndef(params.score_min);
  const scoreMax = parseIntOrUndef(params.score_max);
  const fromDate = params.from ? new Date(params.from).toISOString() : undefined;
  const toDate = params.to ? new Date(params.to + 'T23:59:59').toISOString() : undefined;

  const snapshots = await listOrphanSnapshots({ scoreMin, scoreMax, fromDate, toDate });

  return (
    <div className="flex flex-col gap-4 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Diagnósticos órfãos</h1>
        <p className="text-sm text-muted-foreground">
          {snapshots.length} diagnóstico{snapshots.length === 1 ? '' : 's'} sem lead vinculado
        </p>
      </div>
      <Suspense>
        <OrphanFilters />
      </Suspense>
      <DiagnosisList snapshots={snapshots} />
    </div>
  );
}

function parseIntOrUndef(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : undefined;
}

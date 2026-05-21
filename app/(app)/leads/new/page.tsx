import { notFound } from 'next/navigation';
import { requireCrmSession } from '@/lib/auth';
import { getSnapshot } from '@/lib/diagnosis-snapshots';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NewLeadForm } from '@/components/lead/new-lead-form';
import { DiagnosisSnapshotCard } from '@/components/diagnosis/diagnosis-snapshot-card';

interface PageProps {
  searchParams: Promise<{ from_diagnosis?: string }>;
}

export default async function NewLeadPage({ searchParams }: PageProps) {
  await requireCrmSession();
  const params = await searchParams;
  const snapshot = params.from_diagnosis ? await getSnapshot(params.from_diagnosis) : null;
  if (params.from_diagnosis && !snapshot) notFound();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl">
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Novo lead</CardTitle>
          </CardHeader>
          <CardContent>
            <NewLeadForm snapshot={snapshot} />
          </CardContent>
        </Card>
      </div>
      {snapshot ? (
        <div>
          <DiagnosisSnapshotCard snapshot={snapshot} variant="modal" />
        </div>
      ) : null}
    </div>
  );
}

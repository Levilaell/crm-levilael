import { notFound } from 'next/navigation';
import { getLead } from '@/lib/leads';
import { listTranscriptions } from '@/lib/transcriptions';
import { listBriefings } from '@/lib/briefings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TranscriptionUploader } from '@/components/lead/transcription-uploader';
import { TranscriptionList } from '@/components/lead/transcription-list';
import { BriefingGenerator } from '@/components/briefings/briefing-generator';
import { BriefingVersionSelector } from '@/components/briefings/briefing-version-selector';

export default async function TriagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  const [transcriptions, briefings] = await Promise.all([
    listTranscriptions(id, 'triage_call'),
    listBriefings(id, 'triage'),
  ]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Transcrição da call de triagem</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <TranscriptionUploader leadId={id} kind="triage_call" />
          <TranscriptionList leadId={id} transcriptions={transcriptions} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Briefing</CardTitle>
            <BriefingGenerator
              leadId={id}
              kind="triage"
              hasTranscription={transcriptions.length > 0}
              hasBriefing={briefings.length > 0}
            />
          </div>
        </CardHeader>
        <CardContent>
          {briefings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Sem briefing ainda. Gere após adicionar a transcrição.
            </p>
          ) : (
            <BriefingVersionSelector briefings={briefings} kind="triage" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

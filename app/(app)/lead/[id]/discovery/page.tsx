import { notFound } from 'next/navigation';
import { getLead } from '@/lib/leads';
import { listTranscriptions } from '@/lib/transcriptions';
import { listBriefings } from '@/lib/briefings';
import { listSlideDecks } from '@/lib/slides';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TranscriptionUploader } from '@/components/lead/transcription-uploader';
import { TranscriptionList } from '@/components/lead/transcription-list';
import { BriefingGenerator } from '@/components/briefings/briefing-generator';
import { BriefingVersionSelector } from '@/components/briefings/briefing-version-selector';
import { DiscoveryScriptCard } from '@/components/lead/discovery-script-card';
import { SlideDeckCard } from '@/components/lead/slide-deck-card';

export default async function DiscoveryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  const [transcriptions, scripts, briefings, slideDecks, triageBriefings] = await Promise.all([
    listTranscriptions(id, 'discovery_call'),
    listBriefings(id, 'discovery_script'),
    listBriefings(id, 'discovery'),
    listSlideDecks(id, 'discovery_prep'),
    listBriefings(id, 'triage'),
  ]);

  const hasTriage = triageBriefings.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Briefing final</CardTitle>
            <BriefingGenerator
              leadId={id}
              kind="discovery"
              hasTranscription={transcriptions.length > 0 && hasTriage}
              hasBriefing={briefings.length > 0}
            />
          </div>
        </CardHeader>
        <CardContent>
          {briefings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sem briefing ainda. Precisa de: briefing de triagem + transcrição da descoberta.
            </p>
          ) : (
            <BriefingVersionSelector briefings={briefings} kind="discovery" />
          )}
        </CardContent>
      </Card>

      <div className="space-y-5 self-start">
        <section className="space-y-3">
          <h2 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1">
            Preparação da call
          </h2>
          <Card>
            <CardHeader>
              <CardTitle>Script de descoberta</CardTitle>
            </CardHeader>
            <CardContent>
              <DiscoveryScriptCard
                leadId={id}
                scripts={scripts}
                hasTriageBriefing={hasTriage}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Slides de preparação</CardTitle>
            </CardHeader>
            <CardContent>
              <SlideDeckCard
                leadId={id}
                kind="discovery_prep"
                decks={slideDecks}
                prerequisiteMet={hasTriage}
                prerequisiteMessage="Gere o briefing de triagem primeiro."
              />
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1">
            Call gravada
          </h2>
          <Card>
            <CardHeader>
              <CardTitle>Transcrição</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <TranscriptionUploader leadId={id} kind="discovery_call" />
              <TranscriptionList leadId={id} transcriptions={transcriptions} />
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

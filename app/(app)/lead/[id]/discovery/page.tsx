import { notFound } from 'next/navigation';
import { getLead } from '@/lib/leads';
import { listTranscriptions } from '@/lib/transcriptions';
import { listBriefings } from '@/lib/briefings';
import { getDiagram } from '@/lib/diagrams';
import { listSlideDecks } from '@/lib/slides';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TranscriptionUploader } from '@/components/lead/transcription-uploader';
import { TranscriptionList } from '@/components/lead/transcription-list';
import { BriefingGenerator } from '@/components/briefings/briefing-generator';
import { BriefingVersionSelector } from '@/components/briefings/briefing-version-selector';
import { DiscoveryBriefingView } from '@/components/briefings/discovery-briefing-view';
import { DiscoveryScriptCard } from '@/components/lead/discovery-script-card';
import { SlideDeckCard } from '@/components/lead/slide-deck-card';
import { DiagramCanvas } from '@/components/diagrams/diagram-canvas';
import type { BriefingDiscovery } from '@/types/crm';

export default async function DiscoveryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  const [transcriptions, scripts, briefings, slideDecks, triageBriefings, diagram] = await Promise.all([
    listTranscriptions(id, 'discovery_call'),
    listBriefings(id, 'discovery_script'),
    listBriefings(id, 'discovery'),
    listSlideDecks(id, 'discovery_prep'),
    listBriefings(id, 'triage'),
    getDiagram(id, 'discovery'),
  ]);

  const hasTriage = triageBriefings.length > 0;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="space-y-4">
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

        <Card>
          <CardHeader>
            <CardTitle>Transcrição da call de descoberta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TranscriptionUploader leadId={id} kind="discovery_call" />
            <TranscriptionList leadId={id} transcriptions={transcriptions} />
          </CardContent>
        </Card>

        <Card>
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
              <BriefingVersionSelector<BriefingDiscovery>
                briefings={briefings}
                Renderer={({ briefing }) => <DiscoveryBriefingView briefing={briefing} />}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="self-start">
        <CardHeader>
          <CardTitle>Diagrama de descoberta</CardTitle>
        </CardHeader>
        <CardContent>
          <DiagramCanvas
            leadId={id}
            kind="discovery"
            initialNodes={diagram?.nodes ?? []}
            initialEdges={diagram?.edges ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}

import { notFound } from 'next/navigation';
import { getLead } from '@/lib/leads';
import { getDiagram } from '@/lib/diagrams';
import { listBriefings } from '@/lib/briefings';
import { getProposal } from '@/lib/proposals';
import { listSlideDecks } from '@/lib/slides';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DiagramCanvas } from '@/components/diagrams/diagram-canvas';
import { ProposalCard } from '@/components/lead/proposal-card';
import { ProposalScriptCard } from '@/components/lead/proposal-script-card';
import { SlideDeckCard } from '@/components/lead/slide-deck-card';

export default async function SolutionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  const [diagram, triageBriefings, discoveryBriefings, scripts, slideDecks, proposal] =
    await Promise.all([
      getDiagram(id, 'solution'),
      listBriefings(id, 'triage'),
      listBriefings(id, 'discovery'),
      listBriefings(id, 'solution_draft'),
      listSlideDecks(id, 'proposal'),
      getProposal(id),
    ]);

  const hasTriage = triageBriefings.length > 0;
  const hasDiscovery = discoveryBriefings.length > 0;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Script da call de proposta</CardTitle>
          </CardHeader>
          <CardContent>
            <ProposalScriptCard
              leadId={id}
              scripts={scripts}
              hasTriageBriefing={hasTriage}
              hasDiscoveryBriefing={hasDiscovery}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Slides da proposta</CardTitle>
          </CardHeader>
          <CardContent>
            <SlideDeckCard
              leadId={id}
              kind="proposal"
              decks={slideDecks}
              prerequisiteMet={hasTriage && hasDiscovery}
              prerequisiteMessage={
                !hasTriage
                  ? 'Gere o briefing de triagem primeiro.'
                  : 'Gere o briefing de descoberta primeiro.'
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proposta — ondas e status</CardTitle>
          </CardHeader>
          <CardContent>
            <ProposalCard
              leadId={id}
              proposal={proposal}
              hasDiscoveryBriefing={hasDiscovery}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="self-start">
        <CardHeader>
          <CardTitle>Diagrama de solução</CardTitle>
        </CardHeader>
        <CardContent>
          <DiagramCanvas
            leadId={id}
            kind="solution"
            initialNodes={diagram?.nodes ?? []}
            initialEdges={diagram?.edges ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}

import { notFound } from 'next/navigation';
import { getLead } from '@/lib/leads';
import { getDiagram } from '@/lib/diagrams';
import { listBriefings } from '@/lib/briefings';
import { getProposal } from '@/lib/proposals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DiagramCanvas } from '@/components/diagrams/diagram-canvas';
import { ProposalCard } from '@/components/lead/proposal-card';

export default async function SolutionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  const [diagram, discoveryBriefings, proposal] = await Promise.all([
    getDiagram(id, 'solution'),
    listBriefings(id, 'discovery'),
    getProposal(id),
  ]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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

      <Card>
        <CardHeader>
          <CardTitle>Proposta</CardTitle>
        </CardHeader>
        <CardContent>
          <ProposalCard
            leadId={id}
            proposal={proposal}
            hasDiscoveryBriefing={discoveryBriefings.length > 0}
          />
        </CardContent>
      </Card>
    </div>
  );
}

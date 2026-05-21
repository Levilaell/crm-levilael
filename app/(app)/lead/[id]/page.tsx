import { redirect } from 'next/navigation';

export default async function LeadIndexPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/lead/${id}/overview`);
}

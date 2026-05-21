'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'overview', label: 'Visão geral' },
  { key: 'triage', label: 'Triagem' },
  { key: 'discovery', label: 'Descoberta' },
  { key: 'solution', label: 'Solução' },
  { key: 'history', label: 'Histórico' },
] as const;

export function LeadTabs({ leadId }: { leadId: string }) {
  const pathname = usePathname();
  return (
    <div className="border-b">
      <nav className="-mb-px flex gap-4 overflow-x-auto" aria-label="Tabs">
        {TABS.map((tab) => {
          const href = `/lead/${leadId}/${tab.key}`;
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={tab.key}
              href={href}
              className={cn(
                'border-b-2 px-1 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                active
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

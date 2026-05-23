'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { LeadProgress, ProgressState } from '@/lib/lead-progress';

const TABS = [
  { key: 'overview', label: 'Visão geral', progressKey: null },
  { key: 'triage', label: 'Triagem', progressKey: 'triage' },
  { key: 'discovery', label: 'Descoberta', progressKey: 'discovery' },
  { key: 'solution', label: 'Solução', progressKey: 'solution' },
  { key: 'history', label: 'Histórico', progressKey: null },
] as const;

const STATUS_DOT: Record<ProgressState, string> = {
  empty: 'bg-zinc-300 dark:bg-zinc-700',
  in_progress: 'bg-amber-500',
  done: 'bg-emerald-500',
};

const STATUS_LABEL: Record<ProgressState, string> = {
  empty: 'vazio',
  in_progress: 'em progresso',
  done: 'concluído',
};

export function LeadTabs({
  leadId,
  progress,
}: {
  leadId: string;
  progress: LeadProgress;
}) {
  const pathname = usePathname();
  return (
    <div className="border-b">
      <nav className="-mb-px flex gap-4 overflow-x-auto" aria-label="Tabs">
        {TABS.map((tab) => {
          const href = `/lead/${leadId}/${tab.key}`;
          const active = pathname === href || pathname.startsWith(href + '/');
          const state = tab.progressKey ? progress[tab.progressKey] : null;
          return (
            <Link
              key={tab.key}
              href={href}
              title={state ? `${tab.label} — ${STATUS_LABEL[state]}` : undefined}
              className={cn(
                'inline-flex items-center gap-2 border-b-2 px-1 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                active
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              )}
            >
              {tab.label}
              {state ? (
                <span
                  aria-label={STATUS_LABEL[state]}
                  className={cn('size-2 rounded-full', STATUS_DOT[state])}
                />
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

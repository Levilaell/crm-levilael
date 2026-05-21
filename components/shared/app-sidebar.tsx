'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ListChecks, Settings, KanbanSquare, Brain } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';

const items = [
  { href: '/', label: 'Pipeline', icon: KanbanSquare, match: (p: string) => p === '/' || p.startsWith('/lead') },
  { href: '/tasks', label: 'Tarefas', icon: ListChecks, match: (p: string) => p.startsWith('/tasks') },
  { href: '/diagnoses', label: 'Diagnósticos', icon: Brain, match: (p: string) => p.startsWith('/diagnoses') },
  { href: '/settings', label: 'Configurações', icon: Settings, match: (p: string) => p.startsWith('/settings') },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="size-8 rounded-lg bg-brand grid place-items-center text-sm font-bold text-brand-foreground shadow-sm shrink-0">
            LL
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="font-semibold text-sm tracking-tight">Levi Lael</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">CRM</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const Icon = item.icon;
                const active = item.match(pathname);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.label}
                      render={
                        <Link href={item.href}>
                          <Icon className="size-4" />
                          <span>{item.label}</span>
                        </Link>
                      }
                    />
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

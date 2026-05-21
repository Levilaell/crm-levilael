import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/shared/app-sidebar';
import { AppTopbar } from '@/components/shared/app-topbar';
import { requireCrmSession } from '@/lib/auth';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireCrmSession();
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppTopbar email={session.email} displayName={session.crmUser.display_name} />
        <main className="flex flex-1 flex-col p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

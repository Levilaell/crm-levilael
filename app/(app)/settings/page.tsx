import { requireCrmSession } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileForm } from '@/components/settings/profile-form';
import { HealthStatus } from '@/components/settings/health-status';
import { WebhookInfo } from '@/components/settings/webhook-info';

export default async function SettingsPage() {
  const session = await requireCrmSession();
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from('crm_users')
    .select('display_name, email, telegram_chat_id, receives_new_leads, receives_sla_alerts, receives_briefing_ready')
    .eq('id', session.crmUser.id)
    .single();

  const user = data as {
    display_name: string;
    email: string;
    telegram_chat_id: string | null;
    receives_new_leads: boolean;
    receives_sla_alerts: boolean;
    receives_briefing_ready: boolean;
  };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://crm.levilael.com.br';
  const webhookSecret = process.env.CRM_WEBHOOK_SECRET ?? null;
  const isAdmin = session.crmUser.role === 'admin';

  return (
    <div className="space-y-4 max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Seu perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm user={user} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Health checks</CardTitle>
          </CardHeader>
          <CardContent>
            <HealthStatus />
          </CardContent>
        </Card>
      </div>

      {isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>Webhook do site</CardTitle>
          </CardHeader>
          <CardContent>
            <WebhookInfo appUrl={appUrl} webhookSecret={webhookSecret} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service';
import type { UserRole } from '@/types/crm';

export interface CrmSession {
  authUserId: string;
  email: string;
  crmUser: {
    id: string;
    email: string;
    display_name: string;
    role: UserRole;
    telegram_chat_id: string | null;
  };
}

/**
 * Garante sessão Supabase válida + membership em crm_users.
 * Use no início de cada layout/page autenticado. Redireciona pra /login se falhar.
 */
export async function requireCrmSession(): Promise<CrmSession> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    redirect('/login');
  }
  const authUser = data.user;

  // Membership via service-role (bypassa RLS — evita catch-22 onde RLS bloqueia
  // a própria leitura de crm_users antes do user ser whitelisted).
  const admin = createServiceRoleClient();
  const { data: crmUser, error: crmErr } = await admin
    .from('crm_users')
    .select('id, email, display_name, role, telegram_chat_id')
    .eq('id', authUser.id)
    .maybeSingle();

  if (crmErr || !crmUser) {
    redirect(`/login?denied=1&email=${encodeURIComponent(authUser.email ?? '')}`);
  }

  return {
    authUserId: authUser.id,
    email: authUser.email ?? crmUser.email,
    crmUser: crmUser as CrmSession['crmUser'],
  };
}

/**
 * Versão soft: retorna null se não autenticado/whitelisted, sem redirect.
 * Usar quando a página renderiza algo público também (ex: layout raiz).
 */
export async function getCrmSession(): Promise<CrmSession | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const admin = createServiceRoleClient();
  const { data: crmUser } = await admin
    .from('crm_users')
    .select('id, email, display_name, role, telegram_chat_id')
    .eq('id', data.user.id)
    .maybeSingle();
  if (!crmUser) return null;
  return {
    authUserId: data.user.id,
    email: data.user.email ?? crmUser.email,
    crmUser: crmUser as CrmSession['crmUser'],
  };
}

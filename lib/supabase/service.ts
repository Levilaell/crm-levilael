import { createClient as createServiceClient } from '@supabase/supabase-js';

// Cliente Supabase service-role. BYPASSA RLS.
// Usar APENAS em route handlers/server actions onde:
//   - webhook externo grava sem sessão do usuário
//   - precisa ler dados de outros usuários (ex: cron, notificações)
//   - é mais seguro escrever sem depender de policy
//
// NUNCA expor pro browser. NUNCA usar em RSC se uma sessão de usuário daria conta.
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase URL or service role key');
  }
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

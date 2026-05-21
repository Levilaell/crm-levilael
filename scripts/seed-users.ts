/**
 * Cria os 2 usuários iniciais (admin + operator) em crm_users.
 * Pré-requisito: ambos já precisam ter feito sign-in via magic link uma vez
 * pra existir em auth.users. Esse script só cria o registro em crm_users que
 * destrava o acesso ao app.
 *
 * Uso:
 *   pnpm tsx scripts/seed-users.ts
 *
 * Lê de .env.local:
 *   CRM_ADMIN_EMAIL, CRM_ADMIN_NAME, CRM_ADMIN_TELEGRAM_CHAT_ID
 *   CRM_OPERATOR_EMAIL, CRM_OPERATOR_NAME, CRM_OPERATOR_TELEGRAM_CHAT_ID
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any, any, any>;

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  try {
    const raw = readFileSync(envPath, 'utf-8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const value = trimmed
        .slice(idx + 1)
        .trim()
        .replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    console.warn('[seed] .env.local not found — using process.env only');
  }
}

async function findAuthUserByEmail(
  supabase: AnySupabase,
  email: string,
): Promise<string | null> {
  // listUsers paginado; nossa base tem poucos users, primeira página resolve.
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;
  const user = data.users.find((u: { email?: string | null }) => u.email?.toLowerCase() === email.toLowerCase());
  return user?.id ?? null;
}

async function ensureAuthUser(supabase: AnySupabase, email: string): Promise<string> {
  const existing = await findAuthUserByEmail(supabase, email);
  if (existing) return existing;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`falha ao criar auth user pra ${email}: ${error?.message ?? 'unknown'}`);
  }
  console.log(`[seed] criado em auth.users: ${email}`);
  return data.user.id;
}

async function upsertCrmUser(args: {
  supabase: AnySupabase;
  email: string;
  name: string;
  role: 'admin' | 'operator';
  telegramChatId: string | undefined;
}) {
  const { supabase, email, name, role, telegramChatId } = args;
  let authUserId: string;
  try {
    authUserId = await ensureAuthUser(supabase, email);
  } catch (err) {
    console.error(`[seed] ${err instanceof Error ? err.message : 'erro'}`);
    return;
  }
  const { error } = await supabase.from('crm_users').upsert(
    {
      id: authUserId,
      email,
      display_name: name,
      role,
      telegram_chat_id: telegramChatId ?? null,
    },
    { onConflict: 'id' },
  );
  if (error) {
    console.error(`[seed] falha ao upsert ${email}:`, error.message);
  } else {
    console.log(`[seed] ${email} (${role}) ok`);
  }
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('[seed] faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const adminEmail = process.env.CRM_ADMIN_EMAIL;
  const operatorEmail = process.env.CRM_OPERATOR_EMAIL;
  if (!adminEmail || !operatorEmail) {
    console.error('[seed] faltam CRM_ADMIN_EMAIL ou CRM_OPERATOR_EMAIL no .env.local');
    process.exit(1);
  }

  await upsertCrmUser({
    supabase,
    email: adminEmail,
    name: process.env.CRM_ADMIN_NAME ?? 'Admin',
    role: 'admin',
    telegramChatId: process.env.CRM_ADMIN_TELEGRAM_CHAT_ID,
  });
  await upsertCrmUser({
    supabase,
    email: operatorEmail,
    name: process.env.CRM_OPERATOR_NAME ?? 'Operator',
    role: 'operator',
    telegramChatId: process.env.CRM_OPERATOR_TELEGRAM_CHAT_ID,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

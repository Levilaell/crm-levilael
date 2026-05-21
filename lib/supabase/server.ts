import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Cliente Supabase pra Server Components e Route Handlers.
// Usa cookie do usuário autenticado e respeita RLS.
// Em rotas que precisam bypassar RLS (webhooks externos, escritas internas),
// use `lib/supabase/service.ts`.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Em RSC puro o set falha — chamado de middleware ou Server Action OK.
          }
        },
      },
    },
  );
}

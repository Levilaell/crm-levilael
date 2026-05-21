import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Só refresh de sessão Supabase + redirect pro login se rota privada sem cookie.
// NÃO consulta crm_users (custo por navegação). Membership valida no layout.
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getUser();
  const url = request.nextUrl;
  const isPublic =
    url.pathname.startsWith('/login') ||
    url.pathname.startsWith('/auth/callback') ||
    url.pathname.startsWith('/api/webhooks/') ||
    url.pathname.startsWith('/api/cron/') ||
    url.pathname.startsWith('/_next') ||
    url.pathname === '/favicon.ico';

  if (!data.user && !isPublic) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', url.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (data.user && url.pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

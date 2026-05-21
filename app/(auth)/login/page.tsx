'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Carregando…</div>}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const params = useSearchParams();
  const denied = params.get('denied') === '1';
  const deniedEmail = params.get('email');
  const next = params.get('next') ?? '/';

  const [email, setEmail] = useState(deniedEmail ?? '');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const redirectBase =
        process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${redirectBase}/auth/callback?next=${encodeURIComponent(next)}`,
          // Whitelisting é em crm_users (checado no layout autenticado), não em auth.users.
          shouldCreateUser: true,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>CRM Levi Lael</CardTitle>
          <CardDescription>
            Entrar com magic link. Só emails autorizados têm acesso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {denied && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
                {deniedEmail
                  ? `${deniedEmail} não está autorizado. Fale com o admin.`
                  : 'Email não autorizado.'}
              </AlertDescription>
            </Alert>
          )}
          {sent ? (
            <div className="text-sm text-muted-foreground">
              Link enviado pra <span className="font-medium text-foreground">{email}</span>. Cheque
              o email e clique pra entrar.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="voce@dominio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={loading || !email}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : 'Receber link'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

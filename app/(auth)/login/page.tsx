'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createClient } from '@/lib/supabase/client';
import { Loader2, ArrowRight, MailCheck } from 'lucide-react';

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
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 grid place-items-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-3 text-center">
            <div className="mx-auto size-12 rounded-xl bg-brand grid place-items-center text-brand-foreground font-bold shadow-sm">
              LL
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">CRM Levi Lael</h1>
              <p className="text-sm text-muted-foreground">
                Entrar com magic link no email
              </p>
            </div>
          </div>

          {denied ? (
            <Alert variant="destructive">
              <AlertDescription className="text-xs">
                {deniedEmail
                  ? `${deniedEmail} não está autorizado. Só os 2 emails cadastrados em crm_users entram.`
                  : 'Email não autorizado.'}
              </AlertDescription>
            </Alert>
          ) : null}

          {sent ? (
            <div className="rounded-xl border bg-card p-6 text-center space-y-3">
              <MailCheck className="size-8 text-brand mx-auto" />
              <div className="space-y-1">
                <p className="font-medium text-sm">Link enviado</p>
                <p className="text-xs text-muted-foreground">
                  Cheque a caixa de <span className="font-medium text-foreground">{email}</span> e
                  clique no link pra entrar. Pode levar até 30s.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSent(false);
                  setEmail('');
                }}
              >
                Tentar outro email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="voce@dominio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  className="h-11"
                />
              </div>
              {error ? (
                <Alert variant="destructive">
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              ) : null}
              <Button
                type="submit"
                variant="brand"
                size="lg"
                className="w-full"
                disabled={loading || !email}
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    Receber link
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>
          )}

          <p className="text-[11px] text-muted-foreground text-center">
            Operação interna · Levi Lael Automação
          </p>
        </div>
      </main>
    </div>
  );
}

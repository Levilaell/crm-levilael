# Bloqueios

Lista do que está esperando input externo. Vazio = nada bloqueado.

## Atualmente bloqueado (precisam de você)

- **Env vars de produção:** preencher `.env.local` (copia do `.env.example`) com:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — do mesmo projeto Supabase do site
  - `ANTHROPIC_API_KEY` — pode reutilizar a do site
  - `OPENAI_API_KEY` — gerar nova (Whisper)
  - `TELEGRAM_BOT_TOKEN` — do bot já existente
  - `CRM_WEBHOOK_SECRET` — string aleatória forte (`openssl rand -hex 32`)
  - `CRM_ADMIN_EMAIL` + `CRM_OPERATOR_EMAIL` — seus emails
  - `CRON_SECRET` — outra string aleatória pra autenticar o cron
  - `NEXT_PUBLIC_APP_URL` — `https://crm.levilael.com.br` em prod, `http://localhost:3000` em dev

- **Aplicar migration no Supabase:** copiar `supabase/migrations/0001_crm_schema.sql` e rodar no SQL Editor do dashboard. Não roda 2x — é one-shot. Em CLI: `supabase db push` se o projeto estiver linkado.

- **Seed inicial:** depois das envs:
  ```bash
  pnpm tsx scripts/seed-users.ts
  ```
  O script cria ambos os usuários direto em `auth.users` (via service role) + `crm_users`. Daí já pode fazer sign-in via magic link.

- **Repo do site:** implementar a chamada ao webhook em `INTEGRATIONS.md`. Snippet TS pronto, é só colar no `/api/diagnosis/submit` (ou onde grava lead novo).

- **Vercel:**
  1. Criar projeto (`vercel link` ou via dashboard)
  2. Setar todas as env vars (use `vercel env add` por var ou import bulk)
  3. Apontar `crm.levilael.com.br` em Domains
  4. Deploy: `vercel --prod`

## Sem credenciais — não consegui executar daqui

- Aplicar migration no Supabase de produção
- Rodar `next build` com env reais (rodei com placeholders, passou)
- Validar webhook end-to-end com site
- Testar Telegram com bot real
- Smoke test no deploy preview

## Limites conhecidos / decisões pra rever

- **Cron SLA roda a cada 2h** (`0 */2 * * *` em `vercel.json`) pra ficar dentro do limite de invocations do Vercel Hobby (~20/dia). Se você for Pro, pode aumentar pra `*/10 * * * *` (cada 10 min, conforme spec original) ou `*/30 * * * *`.
- **Whisper max = 25MB** (limite da OpenAI). Áudios maiores precisam ser cortados antes. Calls de 30min em mono/64kbps cabem.
- **`middleware.ts` está deprecated em Next 16** — funciona, mas ideal renomear pra `proxy.ts` e exportar `proxy()` em vez de `middleware()`. Cleanup futuro.
- **PDF de slides v1 = HTML standalone + window.print()** (não puppeteer). Puppeteer-core + @sparticuz/chromium estão instalados mas não usados — deixei pra v2.

## Resolvidos

- ✅ Escopo confirmado (constrói tudo, 17 etapas).
- ✅ Supabase compartilhado (mesmo projeto do site).
- ✅ Telegram bot já existe.
- ✅ Diagnosis answers como blob genérico no v1.
- ✅ Build local passou com tsc + next build (placeholders).
- ✅ Bootstrap simplificado: o seed cria o user em `auth.users` se não existir, então não precisa de "sign-in primeiro".

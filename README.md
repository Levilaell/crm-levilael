# CRM Levi Lael

CRM próprio pra operação de engenharia de automação. 2 usuários (Levi + parceiro), foco em escritórios contábeis BR.

**Stack:** Next.js 16 + TS strict + Tailwind v4 + shadcn + Supabase + @xyflow/react + Anthropic Sonnet 4.6 + OpenAI Whisper + Telegram Bot.

## Setup local

```bash
pnpm install
cp .env.example .env.local
# preencher .env.local com keys reais
pnpm tsx scripts/seed-users.ts   # cria 2 usuários iniciais em crm_users
pnpm dev
```

Aplicar migration no Supabase:

```bash
# Via SQL Editor do dashboard Supabase, executar:
cat supabase/migrations/0001_crm_schema.sql
```

Ou via CLI:

```bash
supabase db push   # se tiver projeto linkado
```

## Arquitetura

```
app/(auth)         # login + magic link callback
app/(app)          # área autenticada — kanban, lead detail, tasks, settings
app/api            # webhooks, lead/briefing/diagram endpoints, cron
components/        # ui (shadcn), kanban, diagrams (xyflow), briefings, lead, shared
lib/supabase       # client (browser), server (RSC com anon), service (server-only, bypass RLS)
lib/prompts        # prompts pra Claude (triage, discovery, slides)
lib/anthropic.ts   # wrapper de Claude com tool_use forçado pra structured output
lib/openai.ts      # Whisper
lib/telegram.ts    # sendTelegram util
stores/            # zustand (kanban drag, diagram edit)
supabase/migrations
```

## Fluxo de lead

1. Site dispara `POST /api/webhooks/lead-from-site` → CRM cria `crm_leads`, dispara Telegram.
2. Lead aparece no kanban em `new`. Operador move pra `contact_tried`, agenda triagem.
3. Após call de triagem (15min), operador faz upload do áudio → Whisper → texto editável.
4. Operador clica "Gerar briefing" → Claude (tool_use) → preenche `crm_briefings` + popula diagrama de triagem.
5. Lead avança pra discovery. Repete: upload → transcrição → briefing → diagrama.
6. Operador desenha diagrama de solução final, monta proposta, envia.

## Webhook do site

Ver [INTEGRATIONS.md](./INTEGRATIONS.md) pro curl exato.

## Convenções

- TS strict + `noUncheckedIndexedAccess` ativados. Zero `any`.
- Zod em todos os endpoints de entrada.
- Briefings IA usam **tool_use forçado** (não prompt+parse).
- Server Components default; `'use client'` só pra forms, canvas xyflow, drag-drop.
- PDF v1: HTML standalone com `window.print()`. Puppeteer adiado pra v2.
- Dark mode default; toggle opcional.

## Deploy

```bash
vercel link
# adicionar env vars (uma por uma ou via dashboard)
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add ANTHROPIC_API_KEY
vercel env add OPENAI_API_KEY
vercel env add TELEGRAM_BOT_TOKEN
vercel env add CRM_WEBHOOK_SECRET
vercel env add CRON_SECRET
vercel env add NEXT_PUBLIC_APP_URL
# deploy
vercel --prod
# apontar subdomínio em vercel.com/dashboard → Domains → crm.levilael.com.br
```

Cron `/api/cron/sla` em `*/10 * * * *` já está configurado em `vercel.json`.

## Aplicar migration no Supabase

Via SQL Editor do dashboard (cola `supabase/migrations/0001_crm_schema.sql` e executa) ou via CLI:

```bash
supabase link --project-ref <seu-project-ref>
supabase db push
```

Depois, faça sign-in via magic link com `CRM_ADMIN_EMAIL` e `CRM_OPERATOR_EMAIL` (vai dar "Email não autorizado" — esperado), e rode:

```bash
pnpm tsx scripts/seed-users.ts
```

Isso cria os registros em `crm_users` que destravam o acesso.

## Bloqueios

Ver [BLOCKED.md](./BLOCKED.md) — coisas que dependem de você ou credenciais.

## Custos estimados mensais

- **Anthropic (Claude Sonnet 4.6):** ~10-30 briefings/mês × ~6k tokens prompt + 2k saída ≈ R$ 5-15/mês
- **OpenAI Whisper:** US$ 0.006/min — 10 calls × 30 min ≈ R$ 1/mês
- **Vercel Hobby:** grátis (até hit dos limites de função)
- **Supabase Free:** grátis (compartilhado com site)

Total estimado: < R$ 50/mês no início.

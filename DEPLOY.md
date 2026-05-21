# Deploy — CRM Levi Lael

Passos sequenciais. Cada step é independente, mas precisam ser feitos nessa ordem.

## 1. Vercel — criar projeto

```bash
# do diretório do repo:
vercel link
# selecione a conta + crie projeto novo "crm-levilael"
```

Ou via dashboard: vercel.com/dashboard → New Project → Import this repo.

## 2. Vercel — env vars (production + preview)

Pra cada uma, rode `vercel env add <NOME>` e cole o valor. Repita marcando "production" e "preview".

```
NEXT_PUBLIC_SUPABASE_URL          # mesma instância do site
NEXT_PUBLIC_SUPABASE_ANON_KEY     # mesma instância do site
SUPABASE_SERVICE_ROLE_KEY         # mesma instância do site
ANTHROPIC_API_KEY                 # pode reutilizar a do site
ANTHROPIC_MODEL                   # claude-sonnet-4-6 (opcional, default já)
OPENAI_API_KEY                    # gerar nova no dashboard OpenAI (Whisper)
OPENAI_TRANSCRIBE_MODEL           # whisper-1 (opcional, default já)
TELEGRAM_BOT_TOKEN                # bot já existente (BotFather)
CRM_WEBHOOK_SECRET                # gerar: openssl rand -hex 32
CRON_SECRET                       # gerar: openssl rand -hex 32
NEXT_PUBLIC_APP_URL               # https://crm.levilael.com.br
CRM_ADMIN_EMAIL                   # seu email
CRM_ADMIN_NAME                    # Levi
CRM_ADMIN_TELEGRAM_CHAT_ID        # seu chat_id (ver @userinfobot)
CRM_OPERATOR_EMAIL                # parceiro
CRM_OPERATOR_NAME                 # nome do parceiro
CRM_OPERATOR_TELEGRAM_CHAT_ID     # chat_id do parceiro
```

## 3. Custom domain `crm.levilael.com.br`

Vercel → Project → Settings → Domains → Add `crm.levilael.com.br`.

Vercel mostra o CNAME esperado. No seu registrar (Registro.br/Cloudflare/etc):

```
Type:    CNAME
Name:    crm
Value:   cname.vercel-dns.com
TTL:     3600
```

Aguarda propagação (~5-30 min). Verifica em `dig crm.levilael.com.br`.

## 4. Supabase — aplicar migrations

Via SQL Editor do dashboard, executar em ordem:

```
supabase/migrations/0001_crm_schema.sql       # tabelas CRM + RLS + buckets
supabase/migrations/0002_diagnosis_separation.sql   # snapshot table + novo enum source
supabase/migrations/0003_ai_logs.sql          # tabela de logs de IA
```

Backfill opcional (0002 tem bloco comentado) — só descomentar se houver
leads de teste em `crm_leads` com `source='diagnosis'` ou `source='telegram'`.

Via CLI (alternativo):

```bash
supabase link --project-ref <seu-project-ref>
supabase db push
```

## 5. Storage buckets

As migrations 0001 criam `crm_audio` e `crm_pdfs` (privados, limite 25MB e 20MB,
respectivamente) via `insert into storage.buckets` + policies amarradas ao
helper `crm_is_member()`.

Verifica em Supabase Dashboard → Storage que ambos aparecem como **private**
(não public).

## 6. Seed inicial dos 2 usuários

Localmente com `.env.local` apontando pra prod (cuidado pra não confundir env):

```bash
pnpm tsx scripts/seed-users.ts
```

O script:
1. Cria os usuários em `auth.users` via service role (se ainda não existirem).
2. Cria os registros em `crm_users` com role admin/operator + telegram_chat_id.

Depois disso, qualquer um dos dois consegue fazer sign-in via magic link.

## 7. Primeiro deploy

```bash
vercel --prod
```

Aguarda o build (~2-3 min). URL aparece no terminal.

## 8. Smoke test

Roda o checklist completo em `SMOKE_TEST.md`. Se passar tudo, está deployado.

## 9. Configurar webhooks no site + Cal.com

Ver `INTEGRATIONS.md` pros snippets e configuração do Cal.com.

---

## Rollback rápido

Se um deploy quebrar prod:

```bash
vercel rollback              # interativo, escolhe versão anterior
# ou via dashboard: Deployments → ⋯ → Promote to Production na anterior
```

Migrations não têm down — se uma migration quebrou prod, restaura backup
do Supabase (point-in-time recovery se for Pro) ou roda DROP/ALTER manual.

## Cron jobs

Definidos em `vercel.json`:

```
/api/cron/sla-check       */10 * * * *    Vercel Pro (Hobby cai em 1/dia)
/api/cron/health-check    0 9 * * *       todo dia 9h da manhã
```

Pra testar manualmente:

```bash
curl -X POST https://crm.levilael.com.br/api/cron/sla-check \
  -H "Authorization: Bearer $CRON_SECRET"
```

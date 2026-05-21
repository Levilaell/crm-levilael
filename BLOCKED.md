# Bloqueios

Lista do que está esperando input externo. Vazio = nada bloqueado.

## Atualmente bloqueado (precisam de você)

Tudo abaixo está documentado em `DEPLOY.md` passo a passo.

- **Env vars no Vercel:** `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`,
  `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `TELEGRAM_BOT_TOKEN`,
  `CRM_WEBHOOK_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`, `CRM_ADMIN_*`,
  `CRM_OPERATOR_*`.
- **Aplicar migrations em ordem:** `0001_crm_schema.sql`,
  `0002_diagnosis_separation.sql`, `0003_ai_logs.sql`.
- **Custom domain:** apontar `crm.levilael.com.br` → `cname.vercel-dns.com`
  no Registro.br/CF.
- **Seed:** `pnpm tsx scripts/seed-users.ts` (cria auth.users + crm_users
  num passo só).
- **Repo do site:** colar os 2 snippets de `INTEGRATIONS.md`
  (notifyCrmOfDiagnosisCompleted + notifyCrmOfNewLead) nos endpoints
  correspondentes (`/api/diagnosis/submit` e `/api/contact`).
- **Cal.com webhook:** seguir §4 de `INTEGRATIONS.md` (URL + secret +
  payload template).
- **Smoke test pós-deploy:** rodar `SMOKE_TEST.md` end-to-end.

## Sem credenciais — não consegui executar daqui

- Aplicar migrations no Supabase prod
- Smoke test em deploy real (rodei `tsc --noEmit` e `next build` localmente
  com placeholders — ambos passam)
- Validar Cal.com webhook
- Validar match diagnostic → lead com dados reais

## Limites conhecidos / decisões pra revisitar

- **Cron SLA a cada 10min** (`*/10 * * * *`) — depende de Vercel **Pro**
  (Hobby restringe pra 1/dia). Se algum dia voltar pro Hobby, mudar pra
  `0 */6 * * *` em `vercel.json`.
- **Whisper max = 25MB** (limite da OpenAI). Áudios maiores precisam ser
  cortados antes. Calls de 30min em mono/64kbps cabem.
- **PDF de slides = HTML standalone + `window.print()`** (não puppeteer).
  Puppeteer-core + @sparticuz/chromium estão instalados mas não usados —
  ficam pra v2 quando o atrito de "abre nova aba, Ctrl+P" incomodar de
  verdade.
- **`USD_TO_BRL = 5.5` hardcoded** em `lib/ai-log.ts`. Custo é estimativa,
  não contábil. Atualizar quando o spread incomodar.
- **Custos por modelo hardcoded** em `lib/ai-log.ts` — atualizar se mudar
  preço ou trocar modelo padrão.
- **DiagnosisAIAnalysis tipa só os 6 campos vistos no sample.** Se o site
  começar a emitir campos novos no `ai_analysis`, o componente tipado vai
  ignorá-los silenciosamente. Atualizar `types/diagnosis.ts` quando isso
  acontecer.
- **Backfill da migration 0002** está como bloco SQL comentado. Descomentar
  na hora de aplicar se houver dados em prod com `source='diagnosis'` ou
  `source='telegram'` (que viraram inválidos no novo enum).

## Resolvidos

- ✅ Escopo confirmado (constrói tudo, 17 etapas v1 + ajustes pós-v1).
- ✅ Supabase compartilhado (mesmo projeto do site).
- ✅ Telegram bot já existe.
- ✅ Diagnosis answers tipados (sample em `samples/diagnosis_real.json`).
- ✅ Build local passou com tsc + next build (placeholders).
- ✅ Bootstrap simplificado: seed cria user em `auth.users` se não existir.
- ✅ `middleware.ts` → `proxy.ts` (deprecation Next 16 resolvida).
- ✅ Definição oficial de lead alinhada: form "Vamos conversar" + Cal.com,
   nada mais.

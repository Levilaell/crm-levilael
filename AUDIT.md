# AUDIT — site principal (levilael.com.br)

> Este audit roda em modo "perguntas pendentes". O repo do CRM é novo e separado do site. Não tenho acesso ao código do site daqui. Levi: preenche o que souber direto neste arquivo ou cola via chat.

## 1. Stack do site (esperado vs confirmado)

| Item | Esperado | Confirmado | Notas |
|---|---|---|---|
| Next.js | 16 | ? | confirma versão exata |
| Tailwind | v4 | ? | |
| shadcn | sim | ? | quais components já instalados |
| Supabase | mesma instância | sim | mesmo projeto, ver §2 |
| Deploy | Vercel | ? | mesma org? |

## 2. Schema Supabase (tabelas relevantes do site)

Tabelas que o CRM referencia ou monitora — preciso da definição exata.

- [ ] `leads` (do site) — colunas, PK, FKs
- [ ] `diagnoses` — relacionamento com `leads`, formato dos answers (JSON shape)
- [ ] `tracking_events` — usado pra alguma coisa no CRM?
- [ ] `email_subscribers` — tem? CRM ignora?
- [ ] `auth.users` — confirmado como compartilhado (mesmo projeto = mesma tabela)

**Decisão atual no CRM:** `crm_leads.diagnosis_answers` é jsonb genérico. UI renderiza key→value recursivamente. Se você colar shape exata depois, faço render tipado.

## 3. Endpoints do site

- [ ] `POST /api/diagnosis/submit` — endpoint que grava lead novo do diagnóstico (path real?)
- [ ] Algum webhook do Cal.com já implementado?
- [ ] Telegram já é disparado em algum lugar do site?

**Ação pendente:** o site precisa chamar `POST https://crm.levilael.com.br/api/webhooks/lead-from-site` com `x-webhook-secret` quando criar lead. Curl em `INTEGRATIONS.md`. Mande pro Claude Code do repo do site quando o CRM estiver deployed.

## 4. Env vars do site (relevantes)

| Var | Site tem? | CRM reutiliza? |
|---|---|---|
| `ANTHROPIC_API_KEY` | ? | sim (mesma key) |
| `NEXT_PUBLIC_SUPABASE_URL` | ? | sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ? | sim |
| `SUPABASE_SERVICE_ROLE_KEY` | ? | sim |
| `TELEGRAM_BOT_TOKEN` | ? | sim (ou criar bot novo se site usa pra outra coisa) |
| `OPENAI_API_KEY` | provavelmente não | CRM cria nova |

## 5. shadcn components já configurados no site

Pra alinhar visual entre site e CRM. Levi: lista os components.json ou cola o arquivo. Por ora o CRM usa preset `base-nova` com base `neutral`.

## GAPS conhecidos

- **Webhook do site → CRM ainda não existe.** Precisa ser implementado no repo do site depois que o CRM estiver deployed.
- **Cal.com → CRM:** plug-in ou webhook nativo do Cal? Decidir como leads do Cal entram. Por enquanto a fonte `calcom` existe no enum mas não tem ingestão.
- **Telegram inbound:** o spec só fala de outbound (notificar). Se quiser que o bot receba comandos (ex: `/leads`, `/lead 123`) é v2.

## Próximas perguntas pro Levi (em ordem de criticidade)

1. ✅ Mesmo projeto Supabase — confirmado.
2. ✅ Bot Telegram existe — confirmado.
3. ✅ Diagnosis answers tipados via `samples/diagnosis_real.json`.
4. ✅ Definição de lead alinhada: form "Vamos conversar" + Cal.com.
5. ⏳ URL exata do Supabase + service key (pra rodar local e deploy).
6. ⏳ Anthropic key (pode reutilizar do site).
7. ⏳ OpenAI key (precisa criar/copiar do dashboard).
8. ⏳ Bot token + chat_ids Telegram (admin + operator).

## Status do CRM (entregue)

### v1
- ✅ Schema CRM completo em `supabase/migrations/0001_crm_schema.sql` (10 tabelas, RLS, buckets de Storage).
- ✅ Auth magic link + whitelist em `crm_users` (validado no layout, não no middleware — mais barato).
- ✅ Kanban com 6 colunas + drag-drop (@dnd-kit) + filtros (owner, qualif, origem, busca).
- ✅ Lead detail com 5 tabs (overview, triage, discovery, solution, history).
- ✅ Transcrição via Whisper-1 (upload áudio até 25MB + paste texto).
- ✅ Briefings IA (triagem + descoberta) via `tool_use` forçado, versionado.
- ✅ React Flow com 17 tipos de nodes config-driven, dark theme, auto-save.
- ✅ Script de descoberta + slides HTML (com botão print pra PDF).
- ✅ Proposta com ondas auto-sincronizadas do briefing 2.
- ✅ Tasks com assignee + status + filtros.
- ✅ Settings: perfil + notificações + health checks.
- ✅ Webhook do site (idempotente) + Telegram notifications.
- ✅ Cron SLA + Error boundaries + loading states + 404.

### Ajustes pós-v1
- ✅ `middleware.ts` → `proxy.ts` (Next 16).
- ✅ Cron SLA `*/10` (Pro) + `lib/sla.ts` centralizando thresholds.
- ✅ Migration 0002: separação diagnosis vs. lead + novo enum source +
   `matched_diagnosis_id` + unique `(source, phone)`.
- ✅ 2 webhooks: `diagnosis-completed` (snapshot, sem Telegram) e
   `lead-from-site` (cria lead com matching + dispara Telegram).
- ✅ `lib/phone.ts` normaliza E.164 BR + valida DDD.
- ✅ Matching email/phone últimos 90 dias.
- ✅ Telegram com badge match + preview da mensagem.
- ✅ Página `/diagnoses` + `/leads/new` + sidebar item Diagnósticos.
- ✅ Tipagem diagnosis com labels PT-BR + render por seção da análise IA.
- ✅ Cron `/api/cron/health-check` diário 9h.
- ✅ `crm_ai_logs` + dashboard `/settings/ai-usage` (custo mês, breakdown,
   top leads, gráfico 30d).
- ✅ Docs: `DEPLOY.md`, `SMOKE_TEST.md`, `INTEGRATIONS.md` reescrito.
- ✅ Build limpo: tsc sem erros, `next build` passou com placeholders.

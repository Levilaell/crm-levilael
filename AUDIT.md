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
3. ✅ Diagnosis answers como blob genérico — confirmado.
4. ⏳ URL exata do Supabase + service key (pra rodar local e deploy).
5. ⏳ Anthropic key (pode reutilizar do site).
6. ⏳ OpenAI key (precisa criar/copiar do dashboard).
7. ⏳ Bot token + seu chat_id Telegram.
8. ⏳ Schema exato de `leads` e `diagnoses` do site (pra confirmar source_lead_id refere bem e diagnosis_answers tem campos esperáveis).

## Status do CRM (entregue)

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
- ✅ Settings: perfil + notificações + health checks (Supabase, Anthropic, OpenAI, Telegram).
- ✅ Webhook do site (idempotente) + Telegram notifications.
- ✅ Cron SLA (a cada 2h, ajustável se Pro).
- ✅ Error boundaries + loading states + 404.
- ✅ Build limpo: tsc sem erros, `next build` passou com placeholders.

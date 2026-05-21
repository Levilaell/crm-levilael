# Smoke test — pós-deploy

Roda toda essa checklist na primeira vez que o CRM sobe em prod. Depois,
roda só o subset relevante após mudança de produção.

Tempo estimado: 30-45 min.

## Auth + navegação básica

- [ ] Acessar `https://crm.levilael.com.br` → redireciona pra `/login`
- [ ] Fazer login com `CRM_ADMIN_EMAIL` → email do magic link chega
- [ ] Clicar no link → cai na home `/` (pipeline vazio)
- [ ] Sidebar mostra: Pipeline, Tarefas, Diagnósticos, Configurações
- [ ] Topbar mostra avatar + tema (toggle dark/light)
- [ ] Logout funciona, redireciona pro login

## Kanban

- [ ] Kanban carrega 6 colunas (Novos / Em contato / Triagem / Descoberta / Proposta / Fechados), todas vazias
- [ ] Botão "Novo lead" no header abre `/leads/new`
- [ ] Criar lead manual (source=manual, sem diagnóstico) → aparece em "Novos"
- [ ] Drag e drop pra coluna "Em contato" → estágio persiste após F5
- [ ] Filtros funcionam (owner, qualificação, origem, busca)

## Lead detail — tabs

- [ ] Clica no card → abre `/lead/[id]/overview`
- [ ] Header mostra nome, qualif (vazia), origem, score
- [ ] Inline edit em "Dados básicos" salva (testa nome, email, phone)
- [ ] Tabs Triagem / Descoberta / Solução / Histórico todos navegam

## Triagem (briefing + diagrama)

- [ ] Tab Triagem → colar texto fake na transcrição → "Salvar" aparece
- [ ] Item aparece na lista de transcrições com word_count
- [ ] Clicar "Gerar briefing" → loading → briefing aparece em <30s
- [ ] Briefing mostra resumo, dores, sinais, qualificação, ticket
- [ ] Diagrama de triagem populado com nodes
- [ ] Mover um node → "salvando…" → "salvo HH:mm"
- [ ] Adicionar node novo via toolbar (Plus → Pain) → aparece + auto-save
- [ ] Reload → diagrama persiste

## Discovery

- [ ] Tab Descoberta → "Gerar script" → markdown aparece com seções
- [ ] Botão "Copiar" funciona
- [ ] "Gerar slides" → HTML aparece em /api/slides/{id}/view em nova aba
- [ ] HTML tem botão de print que esconde no @media print
- [ ] Cmd+P / Ctrl+P gera PDF aceitável
- [ ] Colar transcrição da descoberta + "Gerar briefing final" → ondas aparecem
- [ ] Diagrama de descoberta auto-popula

## Solution

- [ ] Diagrama de solução aparece com nodes data_source/integration/etc
- [ ] Botão "Sincronizar do briefing" cria proposta com ondas
- [ ] Tabela das ondas mostra ticket + duração + prioridade
- [ ] Botão "Gerar HTML da proposta" abre nova aba
- [ ] "Marcar como enviada" muda status + estágio do lead vai pra "Proposta enviada"

## History

- [ ] Timeline mostra todos os eventos: lead_created, stage_changed, transcription_added, briefing_generated, diagram_updated, slides_generated, proposal_synced
- [ ] Filtro por tipo de evento funciona

## Tasks

- [ ] `/tasks` → tabs "Minhas / Todas abertas / Concluídas"
- [ ] Criar tarefa via "Nova tarefa" dialog
- [ ] Marcar como done → some de "abertas", aparece em "concluídas"
- [ ] Delete funciona (com confirm)

## Diagnósticos (novos)

- [ ] `/diagnoses` → lista vazia OK
- [ ] Curl test diagnosis-completed (ver seção webhooks abaixo) → diagnóstico aparece
- [ ] Modal "Ver" abre com Análise IA tipada + respostas
- [ ] "Criar lead" pré-preenche form com snapshot

## Settings

- [ ] `/settings` mostra perfil, health checks, webhook info (admin)
- [ ] Health checks: todos verdes (Supabase, Anthropic, OpenAI, Telegram)
- [ ] Editar display_name + telegram_chat_id → salva
- [ ] Toggles de notificação persistem
- [ ] `/settings/ai-usage` → custo do mês = 0 inicialmente; após rodar briefings, valores aparecem
- [ ] Chart de 30 dias renderiza (mesmo zerado)

## Webhooks — diagnosis-completed

```bash
curl -X POST https://crm.levilael.com.br/api/webhooks/diagnosis-completed \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: $CRM_WEBHOOK_SECRET" \
  -d '{
    "source_diagnosis_id": "'"$(uuidgen)"'",
    "email": "teste1@exemplo.com",
    "phone": "(11) 99999-1111",
    "name": "Teste Diagnóstico",
    "score": 75,
    "answers": {"q1_size":"30_a_100","q2_erp":"dominio","q3_pain_areas":["cobranca","lancamentos"],"q3_client_profile":"simples"},
    "completed_at": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"
  }'
```

- [ ] Resposta `{ id, status: "stored", duplicate: false }`
- [ ] Diagnóstico aparece em `/diagnoses`
- [ ] **Telegram NÃO disparou** (diagnóstico sozinho não notifica)
- [ ] Repetir curl com mesmo `source_diagnosis_id` → `duplicate: true`

## Webhooks — lead-from-site (sem match)

```bash
curl -X POST https://crm.levilael.com.br/api/webhooks/lead-from-site \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: $CRM_WEBHOOK_SECRET" \
  -d '{
    "source": "whatsapp_form",
    "name": "Sem Match",
    "email": "naomatch@exemplo.com",
    "phone": "(11) 98888-2222",
    "message": "Quero saber mais sobre automação"
  }'
```

- [ ] Resposta `{ id, telegram_sent: true, matched_diagnosis: false }`
- [ ] Lead aparece no kanban em "Novos"
- [ ] **Telegram dispara** com 💬 mensagem preview
- [ ] Tab Overview do lead: SEM card "Diagnóstico prévio"

## Webhooks — match diagnóstico → lead

```bash
# 1. Cria diagnóstico
EMAIL="match@exemplo.com"
curl -X POST https://crm.levilael.com.br/api/webhooks/diagnosis-completed \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: $CRM_WEBHOOK_SECRET" \
  -d '{
    "source_diagnosis_id": "'"$(uuidgen)"'",
    "email": "'"$EMAIL"'",
    "phone": "(11) 97777-3333",
    "name": "Match Test",
    "score": 88,
    "answers": {"q1_size":"30_a_100","q2_erp":"alterdata","q3_pain_areas":["cobranca"]},
    "completed_at": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"
  }'

# 2. Cria lead com mesmo email
curl -X POST https://crm.levilael.com.br/api/webhooks/lead-from-site \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: $CRM_WEBHOOK_SECRET" \
  -d '{
    "source": "whatsapp_form",
    "name": "Match Test",
    "email": "'"$EMAIL"'",
    "phone": "(11) 97777-3333"
  }'
```

- [ ] Segunda resposta tem `matched_diagnosis: true`
- [ ] Telegram dispara com 🧠 "Tem diagnóstico prévio (score 88/100)"
- [ ] Tab Overview do lead mostra card "Diagnóstico prévio"
- [ ] `/diagnoses` não mostra mais esse diagnóstico (foi convertido)

## Idempotência

- [ ] Repetir o curl do `lead-from-site` (mesmo source+phone) → `duplicate: true` e Telegram NÃO dispara de novo

## SLA cron

```bash
# Anteciar created_at via SQL editor pra forçar:
# update crm_leads set qualification = 'AAA', created_at = now() - interval '40 minutes'
#   where name = 'Match Test';

curl -X POST https://crm.levilael.com.br/api/cron/sla-check \
  -H "Authorization: Bearer $CRON_SECRET"
```

- [ ] Resposta lista o lead em `detailed`
- [ ] Telegram chega: "⏰ SLA estourando..."
- [ ] Rodar de novo em <1h → não duplica (cooldown)

## Health check cron

```bash
curl -X POST https://crm.levilael.com.br/api/cron/health-check \
  -H "Authorization: Bearer $CRON_SECRET"
```

- [ ] Resposta `{ ok: true, failures: [], notified: 0 }`
- [ ] Quebrar uma key (ex: rotacionar `OPENAI_API_KEY` pra valor errado) → rodar de novo → Telegram chega com falha

## AI usage

- [ ] Após rodar 1-2 briefings, `/settings/ai-usage` mostra custo > 0
- [ ] Operação aparece na tabela "por operação"
- [ ] Lead aparece em "top 10"

## Cleanup

- [ ] Deletar leads de teste via SQL Editor ou UI
- [ ] Deletar diagnósticos de teste

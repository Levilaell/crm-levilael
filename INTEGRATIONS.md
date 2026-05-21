# Integrações

Como o repo do site, o Cal.com e (futuramente) outros canais conversam com o CRM.

---

## 1. Visão geral dos endpoints

| Endpoint                                       | Quem chama         | O que faz                              | Dispara Telegram? |
|------------------------------------------------|--------------------|----------------------------------------|-------------------|
| `POST /api/webhooks/diagnosis-completed`       | Site (após /api/diagnosis/submit) | Armazena snapshot do diagnóstico | **Não** |
| `POST /api/webhooks/lead-from-site`            | Site (após /api/contact) ou Cal.com | Cria lead, faz matching com snapshot prévio | **Sim** |

**Header de segurança em ambos:** `x-webhook-secret: ${CRM_WEBHOOK_SECRET}`.

---

## 2. Site → CRM — diagnóstico completado

**Quando chamar:** depois que `diagnoses.insert` retornar no site (ou seja:
diagnóstico salvo no banco do site).

**Por quê:** o CRM precisa do snapshot pra fazer matching com lead futuro
quando a pessoa clicar em "Vamos conversar".

### Payload

```json
{
  "source_diagnosis_id": "uuid-do-diagnostico-no-site",
  "email": "joao@contabilxyz.com.br",
  "phone": "(11) 99999-8888",
  "name": "João Silva",
  "score": 75,
  "answers": { /* todos os q1_size, q2_*, q3_*, ... */ },
  "ai_analysis": { /* opcional: análise IA gerada no site */ },
  "completed_at": "2026-05-20T18:45:23Z"
}
```

`source_diagnosis_id` é **idempotente** — chamar 2x retorna o mesmo registro.

### Resposta

```json
{ "id": "uuid-do-snapshot", "status": "stored", "duplicate": false }
```

### Snippet TypeScript (pra colar no site)

```ts
// lib/crm-webhook.ts no repo do site
export async function notifyCrmOfDiagnosisCompleted(diagnosis: {
  id: string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  score: number;
  answers: Record<string, unknown>;
  ai_analysis?: Record<string, unknown> | null;
  created_at: string;
}) {
  try {
    const res = await fetch(
      `${process.env.CRM_URL}/api/webhooks/diagnosis-completed`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-webhook-secret': process.env.CRM_WEBHOOK_SECRET!,
        },
        body: JSON.stringify({
          source_diagnosis_id: diagnosis.id,
          email: diagnosis.email,
          phone: diagnosis.phone,
          name: diagnosis.name,
          score: diagnosis.score,
          answers: diagnosis.answers,
          ai_analysis: diagnosis.ai_analysis,
          completed_at: diagnosis.created_at,
        }),
      },
    );
    if (!res.ok) {
      console.error('[crm] diagnosis webhook failed', res.status, await res.text());
    }
  } catch (err) {
    console.error('[crm] diagnosis webhook error', err);
    // não bloqueia resposta pro usuário do site
  }
}
```

---

## 3. Site → CRM — lead via formulário "Vamos conversar"

**Quando chamar:** depois que o formulário "Vamos conversar. Te chamo no
WhatsApp em alguns minutos." é submetido com sucesso.

**Por quê:** este é o **gatilho oficial de lead**. Sem isso, o lead não
existe no CRM e o parceiro não é notificado.

### Payload

```json
{
  "source": "whatsapp_form",
  "name": "João Silva",
  "email": "joao@contabilxyz.com.br",
  "phone": "(11) 99999-8888",
  "company_name": "Contábil XYZ",
  "message": "Quero entender como vocês resolvem cobrança de documentos"
}
```

Campos obrigatórios: `source`, `name`, `phone`. Resto opcional.

### Resposta

```json
{
  "id": "uuid-do-lead",
  "telegram_sent": true,
  "matched_diagnosis": true,
  "duplicate": false
}
```

- `matched_diagnosis: true` → CRM achou snapshot prévio com mesmo email ou
  phone normalizado (últimos 90 dias). O snapshot é vinculado ao lead e
  marcado como convertido. O Telegram inclui a badge 🧠.
- `duplicate: true` → já existe lead com mesmo `(source, phone)`. Telegram
  **não** dispara de novo.

### Snippet TypeScript

```ts
// lib/crm-webhook.ts no repo do site (continuação)
export async function notifyCrmOfNewLead(payload: {
  name: string;
  email?: string | null;
  phone: string;
  company_name?: string | null;
  message?: string | null;
}) {
  try {
    const res = await fetch(
      `${process.env.CRM_URL}/api/webhooks/lead-from-site`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-webhook-secret': process.env.CRM_WEBHOOK_SECRET!,
        },
        body: JSON.stringify({
          source: 'whatsapp_form',
          ...payload,
        }),
      },
    );
    if (!res.ok) {
      console.error('[crm] lead webhook failed', res.status, await res.text());
    }
  } catch (err) {
    console.error('[crm] lead webhook error', err);
  }
}
```

Chama assim no endpoint do formulário:

```ts
// app/api/contact/route.ts (ou onde o form vai)
import { notifyCrmOfNewLead } from '@/lib/crm-webhook';

// ... após salvar no banco do site ...
await notifyCrmOfNewLead({
  name: body.name,
  email: body.email,
  phone: body.phone,
  company_name: body.company,
  message: body.message,
});
```

**Não use `await` se a resposta da rota não puder esperar.** Em produção,
disparar com `void notifyCrmOfNewLead(...)` ou pôr em fila se for crítico.
Como o site é serverless, await está OK (timeout do CRM é 10s).

### Env vars no repo do SITE

```
CRM_URL=https://crm.levilael.com.br
CRM_WEBHOOK_SECRET=<mesmo valor que está na env do CRM>
```

---

## 4. Cal.com → CRM

Cal.com tem webhook nativo. Configurar:

### Passos no Cal.com

1. Logar em cal.com → **Settings** → **Developer** → **Webhooks**
2. **Create webhook**
3. Preencher:
   - **Subscriber URL:** `https://crm.levilael.com.br/api/webhooks/lead-from-site`
   - **Event triggers:** marcar apenas **`BOOKING_CREATED`**
   - **Payload template:** ativar e colar:

```json
{
  "source": "calcom",
  "name": "{{ATTENDEE_NAME}}",
  "email": "{{ATTENDEE_EMAIL}}",
  "phone": "{{ATTENDEE_PHONE_NUMBER}}",
  "calcom_event_uri": "{{BOOKING_URL}}"
}
```

   - **Custom headers:** adicionar
     - Header: `x-webhook-secret`
     - Value: `{{CRM_WEBHOOK_SECRET}}` (não dá pra ter env no Cal, então cola o valor real — rotacionar exige editar aqui)

4. Save webhook

### Validar

Agendar um booking de teste em si mesmo. Em <30s:

- Lead aparece no kanban como `source=calcom`
- Telegram dispara
- Se o email/phone bater com diagnóstico prévio, vem com badge de match

### Limites

- O `phone` do Cal.com pode vir vazio dependendo do campo do form. Se vier
  vazio, o webhook rejeita 422 (`phone` é obrigatório). Solução: marcar
  campo phone como required no form do Cal.com.

---

## 5. Rotação do `CRM_WEBHOOK_SECRET`

1. Gerar novo: `openssl rand -hex 32`
2. Atualizar no Vercel do CRM: `vercel env rm CRM_WEBHOOK_SECRET production && vercel env add CRM_WEBHOOK_SECRET production`
3. Redeploy CRM: `vercel --prod`
4. Atualizar no Vercel do site (mesma var) + redeploy
5. Atualizar no Cal.com webhook (Custom headers)

Janela de inconsistência: chamadas durante o redeploy retornam 401. Vale a
pena fazer fora de horário comercial.

---

## 6. Cal.com → CRM (passo a passo visual)

> Screenshots quando o setup for feito. Por enquanto, ver §4.

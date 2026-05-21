# Integrações

## Site → CRM (webhook de lead novo)

Quando o site cria um lead (via diagnóstico, formulário manual, etc), dispara POST pro CRM.

### Endpoint

```
POST https://crm.levilael.com.br/api/webhooks/lead-from-site
```

### Headers

```
content-type: application/json
x-webhook-secret: <CRM_WEBHOOK_SECRET>
```

### Body

```json
{
  "source": "diagnosis",
  "source_lead_id": "uuid-do-lead-no-site",
  "name": "João Silva",
  "email": "joao@contabilxyz.com.br",
  "phone": "+5511999999999",
  "company_name": "Contábil XYZ",
  "diagnosis_score": 85,
  "diagnosis_answers": {
    "porte": "30 funcionários",
    "erp": "Domínio",
    "dor_principal": "triagem de documentos"
  }
}
```

`source` aceita: `diagnosis`, `calcom`, `manual`, `telegram`, `referral`.

`source_lead_id` é opcional mas recomendado — torna o endpoint idempotente. Se já existir um `crm_leads` com esse `source_lead_id`, retorna o existente sem duplicar.

### Resposta

```json
{
  "id": "uuid-do-crm-lead",
  "telegram_sent": true,
  "created": true
}
```

`created: false` significa que já existia (idempotência).

### Curl pra copiar pro repo do site

```bash
curl -X POST https://crm.levilael.com.br/api/webhooks/lead-from-site \
  -H "content-type: application/json" \
  -H "x-webhook-secret: $CRM_WEBHOOK_SECRET" \
  -d '{
    "source": "diagnosis",
    "source_lead_id": "'"$LEAD_ID"'",
    "name": "'"$LEAD_NAME"'",
    "email": "'"$LEAD_EMAIL"'",
    "phone": "'"$LEAD_PHONE"'",
    "company_name": "'"$LEAD_COMPANY"'",
    "diagnosis_score": '"$LEAD_SCORE"',
    "diagnosis_answers": '"$LEAD_ANSWERS"'
  }'
```

### TypeScript helper (cola no repo do site)

```ts
// lib/crm-webhook.ts
export async function notifyCrmOfNewLead(payload: {
  source: 'diagnosis' | 'calcom' | 'manual';
  source_lead_id?: string;
  name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  diagnosis_score?: number;
  diagnosis_answers?: Record<string, unknown>;
}) {
  const res = await fetch(`${process.env.CRM_URL}/api/webhooks/lead-from-site`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-webhook-secret': process.env.CRM_WEBHOOK_SECRET!,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.error('CRM webhook failed', res.status, await res.text());
    return null;
  }
  return res.json() as Promise<{ id: string; telegram_sent: boolean; created: boolean }>;
}
```

## Telegram

CRM dispara via bot já criado. Cada usuário em `crm_users` tem `telegram_chat_id`. Pra descobrir o chat_id, mandar `/start` pro bot e ler em `/settings` (futura tela com helper).

## Cal.com → CRM (TODO)

Ainda não implementado. Opção 1: webhook nativo do Cal.com (Settings → Webhooks → URL do CRM). Opção 2: Zapier/Make como ponte. Definir em v2.

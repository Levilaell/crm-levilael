'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  appUrl: string;
  webhookSecret: string | null;
}

export function WebhookInfo({ appUrl, webhookSecret }: Props) {
  const [reveal, setReveal] = useState(false);
  const url = `${appUrl}/api/webhooks/lead-from-site`;

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success('Copiado');
  }

  return (
    <div className="space-y-3 max-w-2xl">
      <div className="space-y-1.5">
        <Label>Endpoint</Label>
        <div className="flex gap-2">
          <Input value={url} readOnly className="font-mono text-xs" />
          <Button size="icon" variant="outline" onClick={() => copy(url)}>
            <Copy className="size-4" />
          </Button>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Secret (header x-webhook-secret)</Label>
        <div className="flex gap-2">
          <Input
            value={webhookSecret ? (reveal ? webhookSecret : '•'.repeat(Math.min(webhookSecret.length, 24))) : '— não configurado'}
            readOnly
            className="font-mono text-xs"
          />
          <Button size="icon" variant="outline" onClick={() => setReveal((v) => !v)}>
            {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
          <Button
            size="icon"
            variant="outline"
            disabled={!webhookSecret}
            onClick={() => webhookSecret && copy(webhookSecret)}
          >
            <Copy className="size-4" />
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Pra rotacionar o secret, edite a env <code>CRM_WEBHOOK_SECRET</code> no Vercel e
        republique. Curl de teste e snippet TS em{' '}
        <code>INTEGRATIONS.md</code>.
      </p>
    </div>
  );
}

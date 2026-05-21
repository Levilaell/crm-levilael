import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY');
  _client = new Anthropic({ apiKey });
  return _client;
}

export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';

export interface StructuredCallOptions<T> {
  system: string;
  user: string;
  toolName: string;
  toolDescription: string;
  inputSchema: Record<string, unknown>;
  maxTokens?: number;
  // narrow + validate o output bruto pra T (use zod se quiser)
  validate?: (input: unknown) => T;
}

export interface StructuredCallResult<T> {
  data: T;
  raw: unknown;
  model: string;
  promptTokens: number;
  completionTokens: number;
}

/**
 * Chama Claude com `tool_use` forçado pra retornar estrutura.
 * Mais confiável que prompt+JSON.parse — sem retries por JSON malformado.
 */
export async function generateStructured<T>(
  opts: StructuredCallOptions<T>,
): Promise<StructuredCallResult<T>> {
  const client = getAnthropic();
  const res = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: opts.maxTokens ?? 8192,
    system: opts.system,
    tools: [
      {
        name: opts.toolName,
        description: opts.toolDescription,
        input_schema: opts.inputSchema as Anthropic.Tool['input_schema'],
      },
    ],
    tool_choice: { type: 'tool', name: opts.toolName },
    messages: [{ role: 'user', content: opts.user }],
  });

  const block = res.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === opts.toolName,
  );
  if (!block) {
    throw new Error(`Claude did not emit tool_use for ${opts.toolName}`);
  }

  const data = opts.validate ? opts.validate(block.input) : (block.input as T);

  return {
    data,
    raw: block.input,
    model: res.model,
    promptTokens: res.usage.input_tokens,
    completionTokens: res.usage.output_tokens,
  };
}

/**
 * Chama Claude pra resposta livre (markdown). Usado em script de descoberta,
 * rascunho de proposta, HTML de slides.
 */
export async function generateText(opts: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<{ text: string; model: string; promptTokens: number; completionTokens: number }> {
  const client = getAnthropic();
  const res = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: opts.maxTokens ?? 8192,
    system: opts.system,
    messages: [{ role: 'user', content: opts.user }],
  });
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n\n');
  return {
    text,
    model: res.model,
    promptTokens: res.usage.input_tokens,
    completionTokens: res.usage.output_tokens,
  };
}

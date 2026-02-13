const TEXT_IMAGE_LANGUAGE_OPTIONS = {
  expectedInputs: [{ type: 'text' as const, languages: ['en'] }, { type: 'image' as const }],
  expectedOutputs: [{ type: 'text' as const, languages: ['en'] }],
};

const TEXT_LANGUAGE_OPTIONS = {
  expectedInputs: [{ type: 'text' as const, languages: ['en'] }],
  expectedOutputs: [{ type: 'text' as const, languages: ['en'] }],
};

const INTERACTION_ACTION_ITEM_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['action', 'index', 'text', 'url', 'reason', 'confidence'],
  properties: {
    action: { enum: ['openUrl', 'click', 'type', 'done', 'unknown'] },
    index: { anyOf: [{ type: 'integer', minimum: 1 }, { type: 'null' }] },
    text: { anyOf: [{ type: 'string', minLength: 1, maxLength: 240 }, { type: 'null' }] },
    url: { anyOf: [{ type: 'string', minLength: 1, maxLength: 500 }, { type: 'null' }] },
    reason: { anyOf: [{ type: 'string', minLength: 1, maxLength: 320 }, { type: 'null' }] },
    confidence: { enum: ['high', 'medium', 'low'] },
  },
} as const;

const INTERACTION_PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'finalAnswer', 'reason', 'actions'],
  properties: {
    status: { enum: ['continue', 'done', 'fail'] },
    finalAnswer: { anyOf: [{ type: 'string', minLength: 1, maxLength: 4000 }, { type: 'null' }] },
    reason: { anyOf: [{ type: 'string', minLength: 1, maxLength: 320 }, { type: 'null' }] },
    actions: { type: 'array', minItems: 0, maxItems: 4, items: INTERACTION_ACTION_ITEM_SCHEMA },
  },
} as const;

interface PromptRequestOptions {
  responseConstraint: unknown;
  omitResponseConstraintInput: boolean;
}

export interface TextImagePromptResult {
  output: string;
  measuredInputTokens: number | null;
  sessionInputUsageBefore: number | null;
  sessionInputUsageAfter: number | null;
  sessionInputQuota: number | null;
  sessionInputQuotaRemaining: number | null;
}

function toNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function remainingQuota(quota: number | null, usage: number | null): number | null {
  if (quota === null || usage === null) return null;
  return Math.max(0, quota - usage);
}

function buildPromptInput(prompt: string, bitmap: ImageBitmap) {
  return [{
    role: 'user' as const,
    content: [{ type: 'text' as const, value: prompt }, { type: 'image' as const, value: bitmap }],
  }] as const;
}

function buildPromptOptions(): PromptRequestOptions {
  return { responseConstraint: INTERACTION_PLAN_SCHEMA, omitResponseConstraintInput: true };
}

async function measureInputUsage(session: LanguageModel, input: unknown, options: PromptRequestOptions): Promise<number | null> {
  try {
    const measured = await (session as unknown as {
      measureInputUsage: (value: unknown, opts: unknown) => Promise<unknown>;
    }).measureInputUsage(input, options);
    return toNumber(measured);
  } catch {
    return null;
  }
}

async function promptOnce(session: LanguageModel, input: unknown, options: PromptRequestOptions): Promise<string> {
  const prompt = (session as unknown as {
    prompt?: (value: unknown, opts?: unknown) => Promise<string>;
  }).prompt;

  if (typeof prompt === 'function') {
    return prompt.call(session, input, options);
  }

  const stream = (session as unknown as {
    promptStreaming: (value: unknown, opts?: unknown) => ReadableStream<string>;
  }).promptStreaming(input, options);
  const reader = stream.getReader();
  let output = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) output += value;
    }
    return output;
  } finally {
    reader.releaseLock();
  }
}

export function estimateTokens(value: string): number {
  return Math.ceil(value.length / 4);
}

export function isInputTooLargeError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /input is too large/i.test(message);
}

export async function runTextImagePrompt(prompt: string, imageCanvas: HTMLCanvasElement): Promise<TextImagePromptResult> {
  const availability = await LanguageModel.availability(TEXT_IMAGE_LANGUAGE_OPTIONS);
  if (availability === 'unavailable') {
    throw new Error('Chrome Prompt API is unavailable in this browser profile');
  }

  const session = await LanguageModel.create(TEXT_IMAGE_LANGUAGE_OPTIONS);
  const sessionAny = session as unknown as { inputUsage?: unknown; inputQuota?: unknown };
  const bitmap = await createImageBitmap(imageCanvas);
  const input = buildPromptInput(prompt, bitmap);
  const options = buildPromptOptions();
  const sessionInputUsageBefore = toNumber(sessionAny.inputUsage);
  const sessionInputQuota = toNumber(sessionAny.inputQuota);

  try {
    const measuredInputTokens = await measureInputUsage(session, input, options);
    const output = await promptOnce(session, input, options);
    const sessionInputUsageAfter = toNumber(sessionAny.inputUsage);
    const usage = sessionInputUsageAfter ?? sessionInputUsageBefore;
    return {
      output: output.trim(),
      measuredInputTokens,
      sessionInputUsageBefore,
      sessionInputUsageAfter,
      sessionInputQuota,
      sessionInputQuotaRemaining: remainingQuota(sessionInputQuota, usage),
    };
  } finally {
    bitmap.close();
    session.destroy();
  }
}

function buildTextPromptInput(prompt: string) {
  return [{
    role: 'user' as const,
    content: [{ type: 'text' as const, value: prompt }],
  }] as const;
}

function buildPromptOptionsWithSchema(schema: unknown): PromptRequestOptions {
  return { responseConstraint: schema, omitResponseConstraintInput: true };
}

export async function runTextPromptWithConstraint(
  prompt: string,
  responseConstraint: unknown,
): Promise<TextImagePromptResult> {
  const availability = await LanguageModel.availability(TEXT_LANGUAGE_OPTIONS);
  if (availability === 'unavailable') {
    throw new Error('Chrome Prompt API is unavailable in this browser profile');
  }

  const session = await LanguageModel.create(TEXT_LANGUAGE_OPTIONS);
  const sessionAny = session as unknown as { inputUsage?: unknown; inputQuota?: unknown };
  const input = buildTextPromptInput(prompt);
  const options = buildPromptOptionsWithSchema(responseConstraint);
  const sessionInputUsageBefore = toNumber(sessionAny.inputUsage);
  const sessionInputQuota = toNumber(sessionAny.inputQuota);

  try {
    const measuredInputTokens = await measureInputUsage(session, input, options);
    const output = await promptOnce(session, input, options);
    const sessionInputUsageAfter = toNumber(sessionAny.inputUsage);
    const usage = sessionInputUsageAfter ?? sessionInputUsageBefore;
    return {
      output: output.trim(),
      measuredInputTokens,
      sessionInputUsageBefore,
      sessionInputUsageAfter,
      sessionInputQuota,
      sessionInputQuotaRemaining: remainingQuota(sessionInputQuota, usage),
    };
  } finally {
    session.destroy();
  }
}

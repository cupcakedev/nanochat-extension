const TEXT_IMAGE_LANGUAGE_OPTIONS = {
  expectedInputs: [{ type: 'text' as const, languages: ['en'] }, { type: 'image' as const }],
  expectedOutputs: [{ type: 'text' as const, languages: ['en'] }],
};

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

async function measureInputUsage(session: LanguageModel, input: ReturnType<typeof buildPromptInput>) {
  try {
    const measured = await (session as unknown as {
      measureInputUsage: (value: unknown, options: unknown) => Promise<unknown>;
    }).measureInputUsage(input, { expectedOutputs: TEXT_IMAGE_LANGUAGE_OPTIONS.expectedOutputs });
    return toNumber(measured);
  } catch {
    return null;
  }
}

async function readPromptOutput(session: LanguageModel, input: ReturnType<typeof buildPromptInput>) {
  const stream = (session as unknown as {
    promptStreaming: (value: unknown, options: unknown) => ReadableStream<string>;
  }).promptStreaming(input, { expectedOutputs: TEXT_IMAGE_LANGUAGE_OPTIONS.expectedOutputs });
  const reader = stream.getReader();
  let output = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) output += value;
    }
  } finally {
    reader.releaseLock();
  }
  return output;
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
  const sessionInputUsageBefore = toNumber(sessionAny.inputUsage);
  const sessionInputQuota = toNumber(sessionAny.inputQuota);
  let sessionInputUsageAfter: number | null = null;

  try {
    const measuredInputTokens = await measureInputUsage(session, input);
    const output = await readPromptOutput(session, input);
    sessionInputUsageAfter = toNumber(sessionAny.inputUsage);
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

import { createLogger } from '@shared/utils';
import { TEXT_IMAGE_LANGUAGE_MODEL_OPTIONS, TEXT_LANGUAGE_MODEL_OPTIONS } from '@shared/constants';
import {
  INTERACTION_PLANNER_PROMPT_TIMEOUT_MS,
  INTERACTION_VERIFIER_PROMPT_TIMEOUT_MS,
} from './constants';

const logger = createLogger('interaction-prompt');

const PLANNER_SYSTEM_PROMPT =
  'You are a browser automation agent. Analyze the page screenshot and indexed elements, then return a JSON action plan. Be precise with element indices. Prefer clicking visible elements over openUrl. Use scrollDown/scrollUp when target content or elements are not visible in the current viewport.';

const PLANNER_INITIAL_PROMPTS: [
  { role: 'system'; content: string },
  ...{ role: 'user' | 'assistant'; content: string }[],
] = [
  { role: 'system', content: PLANNER_SYSTEM_PROMPT },
  {
    role: 'user',
    content:
      'Task: Click the login button\nCurrent URL: https://example.com\nIndexed interactive elements:\n[1] <a> | text="Home" | href="/"\n[2] <button> | text="Login" | role=button\n[3] <a> | text="Sign up" | href="/signup"',
  },
  {
    role: 'assistant',
    content:
      '{"status":"continue","finalAnswer":null,"reason":null,"actions":[{"action":"click","index":2,"text":null,"url":null,"reason":"Login button found at index 2","confidence":"high"}]}',
  },
  {
    role: 'user',
    content:
      'Task: Find the pricing section\nScroll position: 0px (viewport height: 800px)\nCurrent URL: https://example.com\nIndexed interactive elements:\n[1] <a> | text="Home"\n[2] <a> | text="About"',
  },
  {
    role: 'assistant',
    content:
      '{"status":"continue","finalAnswer":null,"reason":null,"actions":[{"action":"scrollDown","index":null,"text":null,"url":null,"reason":"Pricing section not visible in current viewport, scrolling down","confidence":"medium"}]}',
  },
];

const VERIFIER_SYSTEM_PROMPT =
  'You are a strict task-completion verifier. Analyze whether the browser agent has fully completed the given task based on page evidence. Return JSON with complete, reason, and confidence fields. Default to complete=false unless there is clear proof.';

const VERIFIER_INITIAL_PROMPTS: [{ role: 'system'; content: string }] = [
  { role: 'system', content: VERIFIER_SYSTEM_PROMPT },
];

const INTERACTION_ACTION_ITEM_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['action', 'index', 'text', 'url', 'reason', 'confidence'],
  properties: {
    action: { enum: ['openUrl', 'click', 'type', 'scrollDown', 'scrollUp', 'done', 'unknown'] },
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
  signal?: AbortSignal;
}

export interface TextImagePromptResult {
  output: string;
  measuredInputTokens: number | null;
  sessionInputUsageBefore: number | null;
  sessionInputUsageAfter: number | null;
  sessionInputQuota: number | null;
  sessionInputQuotaRemaining: number | null;
}

function createTimeoutError(scope: string, timeoutMs: number): Error {
  const error = new Error(`${scope} timed out after ${timeoutMs}ms`);
  error.name = 'TimeoutError';
  return error;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, scope: string): Promise<T> {
  if (timeoutMs <= 0) return promise;
  return new Promise<T>((resolve, reject) => {
    const timerId = globalThis.setTimeout(() => {
      reject(createTimeoutError(scope, timeoutMs));
    }, timeoutMs);
    promise.then(
      (value) => {
        globalThis.clearTimeout(timerId);
        resolve(value);
      },
      (error) => {
        globalThis.clearTimeout(timerId);
        reject(error);
      },
    );
  });
}

function deriveRequestSignal(
  baseSignal: AbortSignal | undefined,
  timeoutMs: number,
): { signal: AbortSignal | undefined; cleanup: () => void } {
  if (timeoutMs <= 0 && !baseSignal) return { signal: undefined, cleanup: () => undefined };
  if (timeoutMs <= 0) return { signal: baseSignal, cleanup: () => undefined };

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => {
    controller.abort(createTimeoutError('Prompt request', timeoutMs));
  }, timeoutMs);

  const onBaseAbort = () => {
    if (!controller.signal.aborted) controller.abort(baseSignal?.reason);
  };

  if (baseSignal) {
    if (baseSignal.aborted) {
      onBaseAbort();
    } else {
      baseSignal.addEventListener('abort', onBaseAbort, { once: true });
    }
  }

  const cleanup = () => {
    globalThis.clearTimeout(timeoutId);
    if (baseSignal) baseSignal.removeEventListener('abort', onBaseAbort);
  };

  return { signal: controller.signal, cleanup };
}

function toNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function remainingQuota(quota: number | null, usage: number | null): number | null {
  if (quota === null || usage === null) return null;
  return Math.max(0, quota - usage);
}

function buildPromptInput(prompt: string, bitmap: ImageBitmap) {
  return [
    {
      role: 'user' as const,
      content: [
        { type: 'text' as const, value: prompt },
        { type: 'image' as const, value: bitmap },
      ],
    },
  ] as const;
}

function buildPromptOptions(signal?: AbortSignal): PromptRequestOptions {
  return { responseConstraint: INTERACTION_PLAN_SCHEMA, omitResponseConstraintInput: true, signal };
}

async function measureInputUsage(
  session: LanguageModel,
  input: unknown,
  options: PromptRequestOptions,
): Promise<number | null> {
  try {
    const measured = await (
      session as unknown as {
        measureInputUsage: (value: unknown, opts: unknown) => Promise<unknown>;
      }
    ).measureInputUsage(input, options);
    return toNumber(measured);
  } catch {
    return null;
  }
}

async function promptOnce(
  session: LanguageModel,
  input: unknown,
  options: PromptRequestOptions,
): Promise<string> {
  const prompt = (
    session as unknown as {
      prompt?: (value: unknown, opts?: unknown) => Promise<string>;
    }
  ).prompt;

  if (typeof prompt === 'function') {
    return prompt.call(session, input, options);
  }

  const stream = (
    session as unknown as {
      promptStreaming: (value: unknown, opts?: unknown) => ReadableStream<string>;
    }
  ).promptStreaming(input, options);
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

export function isPromptTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === 'TimeoutError') return true;
  return /timed out/i.test(error.message);
}

export async function runTextImagePrompt(
  prompt: string,
  imageCanvas: HTMLCanvasElement,
  signal?: AbortSignal,
): Promise<TextImagePromptResult> {
  logger.info('[input][text+image]', prompt);
  if (signal?.aborted) {
    const aborted = new Error('Prompt request aborted');
    aborted.name = 'AbortError';
    throw aborted;
  }

  const availability = await withTimeout(
    LanguageModel.availability(TEXT_IMAGE_LANGUAGE_MODEL_OPTIONS),
    INTERACTION_PLANNER_PROMPT_TIMEOUT_MS,
    'Prompt availability',
  );
  if (availability === 'unavailable') {
    throw new Error('Chrome Prompt API is unavailable in this browser profile');
  }

  const { signal: requestSignal, cleanup } = deriveRequestSignal(
    signal,
    INTERACTION_PLANNER_PROMPT_TIMEOUT_MS,
  );
  const session = await withTimeout(
    LanguageModel.create({
      ...TEXT_IMAGE_LANGUAGE_MODEL_OPTIONS,
      initialPrompts: PLANNER_INITIAL_PROMPTS,
      ...(requestSignal ? { signal: requestSignal } : {}),
    }),
    INTERACTION_PLANNER_PROMPT_TIMEOUT_MS,
    'Prompt session create',
  );
  const sessionAny = session as unknown as { inputUsage?: unknown; inputQuota?: unknown };
  const bitmap = await createImageBitmap(imageCanvas);
  const input = buildPromptInput(prompt, bitmap);
  const options = buildPromptOptions(requestSignal);
  const sessionInputUsageBefore = toNumber(sessionAny.inputUsage);
  const sessionInputQuota = toNumber(sessionAny.inputQuota);

  try {
    const measuredInputTokens = await withTimeout(
      measureInputUsage(session, input, options),
      INTERACTION_PLANNER_PROMPT_TIMEOUT_MS,
      'Prompt input measurement',
    );
    const output = await withTimeout(
      promptOnce(session, input, options),
      INTERACTION_PLANNER_PROMPT_TIMEOUT_MS,
      'Prompt generation',
    );
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
    cleanup();
    bitmap.close();
    session.destroy();
  }
}

function buildTextPromptInput(prompt: string) {
  return [
    {
      role: 'user' as const,
      content: [{ type: 'text' as const, value: prompt }],
    },
  ] as const;
}

function buildPromptOptionsWithSchema(schema: unknown, signal?: AbortSignal): PromptRequestOptions {
  return { responseConstraint: schema, omitResponseConstraintInput: true, signal };
}

export async function runTextPromptWithConstraint(
  prompt: string,
  responseConstraint: unknown,
  signal?: AbortSignal,
): Promise<TextImagePromptResult> {
  logger.info('[input][text]', prompt);
  if (signal?.aborted) {
    const aborted = new Error('Prompt request aborted');
    aborted.name = 'AbortError';
    throw aborted;
  }

  const availability = await withTimeout(
    LanguageModel.availability(TEXT_LANGUAGE_MODEL_OPTIONS),
    INTERACTION_VERIFIER_PROMPT_TIMEOUT_MS,
    'Prompt availability',
  );
  if (availability === 'unavailable') {
    throw new Error('Chrome Prompt API is unavailable in this browser profile');
  }

  const { signal: requestSignal, cleanup } = deriveRequestSignal(
    signal,
    INTERACTION_VERIFIER_PROMPT_TIMEOUT_MS,
  );
  const session = await withTimeout(
    LanguageModel.create({
      ...TEXT_LANGUAGE_MODEL_OPTIONS,
      initialPrompts: VERIFIER_INITIAL_PROMPTS,
      ...(requestSignal ? { signal: requestSignal } : {}),
    }),
    INTERACTION_VERIFIER_PROMPT_TIMEOUT_MS,
    'Prompt session create',
  );
  const sessionAny = session as unknown as { inputUsage?: unknown; inputQuota?: unknown };
  const input = buildTextPromptInput(prompt);
  const options = buildPromptOptionsWithSchema(responseConstraint, requestSignal);
  const sessionInputUsageBefore = toNumber(sessionAny.inputUsage);
  const sessionInputQuota = toNumber(sessionAny.inputQuota);

  try {
    const measuredInputTokens = await withTimeout(
      measureInputUsage(session, input, options),
      INTERACTION_VERIFIER_PROMPT_TIMEOUT_MS,
      'Prompt input measurement',
    );
    const output = await withTimeout(
      promptOnce(session, input, options),
      INTERACTION_VERIFIER_PROMPT_TIMEOUT_MS,
      'Prompt generation',
    );
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
    cleanup();
    session.destroy();
  }
}

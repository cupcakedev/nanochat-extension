import type {
  InteractionCompletionVerification,
  InteractionConfidence,
  InteractionExecutionResult,
} from '@shared/types';
import { runTextPromptWithConstraint } from './prompt-api';

const COMPLETION_VERIFICATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['complete', 'reason', 'confidence'],
  properties: {
    complete: { type: 'boolean' },
    reason: { type: 'string', minLength: 1, maxLength: 400 },
    confidence: { enum: ['high', 'medium', 'low'] },
  },
} as const;

function extractJsonObject(text: string): string {
  const start = text.indexOf('{');
  if (start === -1) throw new Error('Verifier returned non-JSON output');

  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (char === '{') depth += 1;
    if (char !== '}') continue;
    depth -= 1;
    if (depth === 0) return text.slice(start, index + 1);
  }

  throw new Error('Verifier returned incomplete JSON output');
}

function normalizeConfidence(value: unknown): InteractionConfidence {
  if (typeof value !== 'string') return 'low';
  const normalized = value.trim().toLowerCase();
  if (normalized === 'high') return 'high';
  if (normalized === 'medium') return 'medium';
  return 'low';
}

function normalizeReason(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeComplete(value: unknown): boolean {
  return value === true;
}

function formatHistory(history: InteractionExecutionResult[]): string {
  if (!history.length) return 'none';

  return history
    .slice(-4)
    .map((execution, index) => {
      const parts: string[] = [execution.requestedAction];
      if (execution.requestedIndex !== null) parts.push(`#${execution.requestedIndex}`);
      if (execution.requestedText) parts.push(`"${execution.requestedText}"`);
      if (execution.requestedUrl) parts.push(execution.requestedUrl);
      return `${index + 1}. ${parts.join(' ')} => ${execution.executed ? 'ok' : 'fail'} | ${execution.message}`;
    })
    .join('\n');
}

function buildVerifierPrompt(params: {
  task: string;
  pageUrl: string;
  pageTitle: string;
  history: InteractionExecutionResult[];
  plannerFinalAnswer: string | null;
}): string {
  return [
    'Return only minified JSON: {"complete":boolean,"reason":string,"confidence":"high|medium|low"}',
    `Task: ${params.task}`,
    `URL: ${params.pageUrl}`,
    `Title: ${params.pageTitle}`,
    `Final answer candidate: ${params.plannerFinalAnswer ?? 'none'}`,
    `Recent history:\n${formatHistory(params.history)}`,
  ].join('\n');
}

function parseVerifierOutput(output: string): InteractionCompletionVerification {
  const parsed = JSON.parse(extractJsonObject(output)) as Record<string, unknown>;
  const complete = normalizeComplete(parsed.complete);
  const reason = normalizeReason(
    parsed.reason,
    complete ? 'Task appears complete' : 'Task appears incomplete',
  );
  const confidence = normalizeConfidence(parsed.confidence);
  return { complete, reason, confidence };
}

export interface VerificationResult {
  verification: InteractionCompletionVerification;
  rawOutput: string | null;
}

export async function verifyTaskCompletion(params: {
  task: string;
  pageUrl: string;
  pageTitle: string;
  history: InteractionExecutionResult[];
  plannerFinalAnswer: string | null;
  signal?: AbortSignal;
}): Promise<VerificationResult> {
  const prompt = buildVerifierPrompt(params);
  const response = await runTextPromptWithConstraint(
    prompt,
    COMPLETION_VERIFICATION_SCHEMA,
    params.signal,
  );
  return { verification: parseVerifierOutput(response.output), rawOutput: response.output };
}

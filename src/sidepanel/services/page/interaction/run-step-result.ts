import type { InteractionExecutionResult, InteractionRunStatus } from '@shared/types';
import type { ParsedInteractionDecision } from './parser';

export function resolveCompletion(
  status: InteractionRunStatus,
  decision: ParsedInteractionDecision,
  executions: InteractionExecutionResult[],
  fallbackFinalAnswer: string | null,
): { status: InteractionRunStatus; finalAnswer: string | null } {
  const lastExecution = executions[executions.length - 1];

  if (status === 'done') {
    return {
      status,
      finalAnswer: decision.finalAnswer ?? decision.reason ?? 'Task completed',
    };
  }

  if (status === 'fail') {
    return {
      status,
      finalAnswer:
        decision.finalAnswer ?? decision.reason ?? lastExecution?.message ?? 'Task failed',
    };
  }

  if (status === 'max-steps') {
    return {
      status,
      finalAnswer:
        decision.finalAnswer ??
        decision.reason ??
        lastExecution?.message ??
        'Maximum agent steps reached',
    };
  }

  return { status, finalAnswer: fallbackFinalAnswer };
}

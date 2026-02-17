import type {
  InteractionActionPlan,
  InteractionExecutionResult,
  InteractiveElementSnapshotItem,
} from '@shared/types';
import type { ParsedInteractionCurrentState, ParsedInteractionDecision } from './parser';

export interface PromptDecisionResult {
  decision: ParsedInteractionDecision;
  rawResponse: string;
  prompt: string;
  promptElements: InteractiveElementSnapshotItem[];
  retryCount: number;
  measuredInputTokens: number | null;
  sessionInputUsageBefore: number | null;
  sessionInputUsageAfter: number | null;
  sessionInputQuota: number | null;
  sessionInputQuotaRemaining: number | null;
  screenshotDataUrl: string;
  imageWidth: number;
  imageHeight: number;
}

export interface InteractionProgressLineEvent {
  type: 'line';
  line: string;
}

export interface InteractionProgressScreenshotEvent {
  type: 'screenshot';
  stepNumber: number;
  imageDataUrl: string;
  width: number;
  height: number;
}

export type InteractionProgressEvent =
  | InteractionProgressLineEvent
  | InteractionProgressScreenshotEvent;

export interface InteractionRunOptions {
  onProgress?: (event: InteractionProgressEvent) => void;
  signal?: AbortSignal;
}

export interface PlannerRequestParams {
  task: string;
  stepNumber: number;
  maxSteps: number;
  pageUrl: string;
  pageTitle: string;
  scrollY: number;
  viewportHeight: number;
  history: InteractionExecutionResult[];
  elements: InteractiveElementSnapshotItem[];
  modelMemoryState: ParsedInteractionCurrentState | null;
  modelMemoryTimeline: string[];
  strategyHints?: PlannerStrategyHints;
  baseCanvas: HTMLCanvasElement;
  viewport: { width: number; height: number };
  onProgress?: InteractionRunOptions['onProgress'];
  signal?: AbortSignal;
}

export type PlannerModelMemorySnapshot = ParsedInteractionCurrentState;

export interface PlannerStrategyHints {
  evaluationPreviousGoal: string;
  memory: string;
  nextGoal: string;
  constraints: string[];
}

export interface ScrollContext {
  scrollY: number;
  viewportHeight: number;
}

export type VerificationCache = Map<
  string,
  { complete: boolean; reason: string; confidence: 'high' | 'medium' | 'low' }
>;

export type RecoveryPlanBuilderParams = {
  currentUrl: string;
  decision: ParsedInteractionDecision;
};

export type DoneLoopKeyParams = {
  task: string;
  pageUrl: string;
  meaningfulExecutionCount: number;
};

export type VerificationCacheKeyParams = {
  task: string;
  pageUrl: string;
  pageTitle: string;
  plannerFinalAnswer: string | null;
  plannerReason: string | null;
  meaningfulExecutionCount: number;
};

export type RejectedDoneExplorationParams = {
  task: string;
  currentUrl: string;
  elements: InteractiveElementSnapshotItem[];
  attemptedClickKeys: Set<string>;
};

export type StuckDoneRecoveryParams = {
  task: string;
  currentUrl: string;
};

export type CompletionResolutionParams = {
  status: 'continue' | 'done' | 'fail' | 'max-steps';
  decision: ParsedInteractionDecision;
  executions: InteractionExecutionResult[];
  fallbackFinalAnswer: string | null;
};

export type ExecutableInteractionPlan = InteractionActionPlan & {
  action: 'click' | 'type';
  index: number;
};

export type InteractionActionType = 'click' | 'type' | 'openUrl' | 'scrollUp' | 'scrollDown' | 'done' | 'unknown';
export type ExecutableInteractionAction = Extract<InteractionActionType, 'click' | 'type'>;
export type InteractionConfidence = 'high' | 'medium' | 'low';
export type InteractionRunStatus = 'continue' | 'done' | 'fail' | 'max-steps';

export interface InteractionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface InteractiveElementSnapshotItem {
  index: number;
  tag: string;
  role: string | null;
  inputType: string | null;
  text: string | null;
  ariaLabel: string | null;
  placeholder: string | null;
  name: string | null;
  id: string | null;
  href: string | null;
  disabled: boolean;
  rect: InteractionRect;
}

export interface InteractionSnapshotPayload {
  pageUrl: string;
  pageTitle: string;
  scrollY: number;
  viewportWidth: number;
  viewportHeight: number;
  interactiveElements: InteractiveElementSnapshotItem[];
}

export interface ExecuteActionPayload {
  action: ExecutableInteractionAction;
  index: number;
  text?: string | null;
}

export interface ExecuteActionResponse {
  action: ExecutableInteractionAction;
  index: number;
  text: string | null;
  ok: boolean;
  message: string;
}

export interface InteractionActionPlan {
  action: InteractionActionType;
  index: number | null;
  text: string | null;
  url: string | null;
  reason: string | null;
  confidence: InteractionConfidence;
}

export interface InteractionExecutionResult {
  requestedAction: InteractionActionType;
  requestedIndex: number | null;
  requestedText: string | null;
  requestedUrl: string | null;
  executed: boolean;
  message: string;
}

export interface PageInteractionCaptureMeta {
  imageWidth: number;
  imageHeight: number;
  elementCount: number;
  promptElementCount: number;
  retryCount: number;
}

export interface PageInteractionDebugInput {
  pageUrl: string;
  pageTitle: string;
  instruction: string;
  prompt: string;
  promptTokens: number;
  measuredInputTokens: number | null;
  sessionInputUsageBefore: number | null;
  sessionInputUsageAfter: number | null;
  sessionInputQuota: number | null;
  sessionInputQuotaRemaining: number | null;
  interactiveElements: InteractiveElementSnapshotItem[];
}

export interface InteractionCompletionVerification {
  complete: boolean;
  reason: string;
  confidence: InteractionConfidence;
}

export interface PageInteractionStepResult {
  status: InteractionRunStatus;
  finalAnswer: string | null;
  verification: InteractionCompletionVerification | null;
  plans: InteractionActionPlan[];
  executions: InteractionExecutionResult[];
  rawResponse: string;
  screenshotDataUrl: string;
  debugInput: PageInteractionDebugInput;
  captureMeta: PageInteractionCaptureMeta;
}

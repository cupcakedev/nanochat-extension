export type { MessageType, ExtensionMessage, MessageResponseMap } from './messages';

export { MessageRole, SessionStatus } from './chat';
export type {
  ChatMessage,
  LoadingProgress,
  TokenStats,
  Chat,
  ChatSummary,
  PageSource,
} from './chat';

export type {
  InteractionActionType,
  ExecutableInteractionAction,
  InteractionConfidence,
  InteractionRunStatus,
  InteractionRect,
  InteractiveElementSnapshotItem,
  InteractionSnapshotPayload,
  ExecuteActionPayload,
  ExecuteActionResponse,
  InteractionActionPlan,
  InteractionExecutionResult,
  PageInteractionCaptureMeta,
  PageInteractionDebugInput,
  InteractionCompletionVerification,
  PageInteractionStepResult,
} from './interaction';

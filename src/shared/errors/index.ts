export enum AppErrorCode {
  Unknown = 'unknown',
  AgentContextUnavailable = 'agent_context_unavailable',
  LanguageModelNotDefined = 'language_model_not_defined',
  SessionNotInitialized = 'session_not_initialized',
  PromptApiMultimodalUnavailable = 'prompt_api_multimodal_unavailable',
  PromptRequestTimeout = 'prompt_request_timeout',
  PromptRequestAborted = 'prompt_request_aborted',
  PromptApiUnavailableProfile = 'prompt_api_unavailable_profile',
  PromptApiRequestFailed = 'prompt_api_request_failed',
  PromptApiNonJsonOutput = 'prompt_api_non_json_output',
  PromptApiIncompleteJsonOutput = 'prompt_api_incomplete_json_output',
  VerifierNonJsonOutput = 'verifier_non_json_output',
  VerifierIncompleteJsonOutput = 'verifier_incomplete_json_output',
  InstructionRequired = 'instruction_required',
  AgentRunAborted = 'agent_run_aborted',
  ActiveTabNotFound = 'active_tab_not_found',
  InteractionSnapshotMainFrameMissing = 'interaction_snapshot_main_frame_missing',
  OpenUrlEmpty = 'open_url_empty',
  TabLoadTimeout = 'tab_load_timeout',
  ActiveTabUrlUpdateFailed = 'active_tab_url_update_failed',
  ExtensionPagePathEmpty = 'extension_page_path_empty',
  ScreenshotDecodeFailed = 'screenshot_decode_failed',
  ScreenshotCanvasCreateFailed = 'screenshot_canvas_create_failed',
  StitchedScreenshotCanvasCreateFailed = 'stitched_screenshot_canvas_create_failed',
  ViewportCapturesMissing = 'viewport_captures_missing',
  InteractionOverlayDrawFailed = 'interaction_overlay_draw_failed',
  AgentPlanningResultMissing = 'agent_planning_result_missing',
  ChatContextProviderMissing = 'chat_context_provider_missing',
}

export const APP_ERROR_TEXT = {
  agentContextUnavailable: 'This feature requires a webpage. Open a website and try again.',
  languageModelNotDefined: 'LanguageModel is not defined',
  sessionNotInitialized: 'Session not initialized',
  failedToInitializeModel: 'Failed to initialize model',
  modelUnavailable: 'Gemini Nano is not available in this browser. Chrome 138+ required.',
  instructionRequired: 'Enter an instruction first',
  agentRunAborted: 'Agent run aborted',
  promptApiRequestFailed: 'Prompt API request failed',
  promptApiNonJsonOutput: 'Prompt API returned non-JSON output',
  promptApiIncompleteJsonOutput: 'Prompt API returned incomplete JSON output',
  verifierNonJsonOutput: 'Verifier returned non-JSON output',
  verifierIncompleteJsonOutput: 'Verifier returned incomplete JSON output',
  promptRequestAborted: 'Prompt request aborted',
  promptApiUnavailableProfile: 'Chrome Prompt API is unavailable in this browser profile',
  activeTabNotFound: 'No active tab found',
  interactionSnapshotMainFrameMissing: 'Failed to get interaction snapshot from main frame',
  openUrlEmpty: 'openUrl action received empty URL',
  activeTabUrlUpdateFailed: 'Failed to update active tab URL',
  extensionPagePathEmpty: 'openExtensionPageInTab received empty pagePath',
  screenshotDecodeFailed: 'Failed to decode captured screenshot',
  screenshotCanvasCreateFailed: 'Unable to create screenshot canvas',
  stitchedScreenshotCanvasCreateFailed: 'Unable to create stitched screenshot canvas',
  viewportCapturesMissing: 'No viewport captures available for stitching',
  interactionOverlayDrawFailed: 'Unable to draw interaction overlays',
  agentPlanningResultMissing: 'Agent did not produce any planning result',
  chatContextProviderMissing: 'useChatContext must be used within a <ChatProvider>',
} as const;

export interface AppErrorContext {
  detail?: string;
  scope?: string;
  timeoutMs?: number;
  contextLabel?: string;
}

function resolveMessage(code: AppErrorCode, context: AppErrorContext): string {
  switch (code) {
    case AppErrorCode.AgentContextUnavailable:
      return context.detail ?? APP_ERROR_TEXT.agentContextUnavailable;
    case AppErrorCode.LanguageModelNotDefined:
      return APP_ERROR_TEXT.languageModelNotDefined;
    case AppErrorCode.SessionNotInitialized:
      return APP_ERROR_TEXT.sessionNotInitialized;
    case AppErrorCode.PromptApiMultimodalUnavailable:
      return `Image input is currently unavailable in this Chrome profile (Prompt API multimodal session couldn't be created). ${context.detail ?? ''}`.trim();
    case AppErrorCode.PromptRequestTimeout:
      return `${context.scope ?? 'Request'} timed out after ${context.timeoutMs ?? 0}ms`;
    case AppErrorCode.PromptRequestAborted:
      return APP_ERROR_TEXT.promptRequestAborted;
    case AppErrorCode.PromptApiUnavailableProfile:
      return APP_ERROR_TEXT.promptApiUnavailableProfile;
    case AppErrorCode.PromptApiRequestFailed:
      return APP_ERROR_TEXT.promptApiRequestFailed;
    case AppErrorCode.PromptApiNonJsonOutput:
      return APP_ERROR_TEXT.promptApiNonJsonOutput;
    case AppErrorCode.PromptApiIncompleteJsonOutput:
      return APP_ERROR_TEXT.promptApiIncompleteJsonOutput;
    case AppErrorCode.VerifierNonJsonOutput:
      return APP_ERROR_TEXT.verifierNonJsonOutput;
    case AppErrorCode.VerifierIncompleteJsonOutput:
      return APP_ERROR_TEXT.verifierIncompleteJsonOutput;
    case AppErrorCode.InstructionRequired:
      return APP_ERROR_TEXT.instructionRequired;
    case AppErrorCode.AgentRunAborted:
      return APP_ERROR_TEXT.agentRunAborted;
    case AppErrorCode.ActiveTabNotFound:
      return APP_ERROR_TEXT.activeTabNotFound;
    case AppErrorCode.InteractionSnapshotMainFrameMissing:
      return APP_ERROR_TEXT.interactionSnapshotMainFrameMissing;
    case AppErrorCode.OpenUrlEmpty:
      return APP_ERROR_TEXT.openUrlEmpty;
    case AppErrorCode.TabLoadTimeout:
      return `Timed out waiting for page load after ${context.contextLabel ?? 'openUrl'}`;
    case AppErrorCode.ActiveTabUrlUpdateFailed:
      return APP_ERROR_TEXT.activeTabUrlUpdateFailed;
    case AppErrorCode.ExtensionPagePathEmpty:
      return APP_ERROR_TEXT.extensionPagePathEmpty;
    case AppErrorCode.ScreenshotDecodeFailed:
      return APP_ERROR_TEXT.screenshotDecodeFailed;
    case AppErrorCode.ScreenshotCanvasCreateFailed:
      return APP_ERROR_TEXT.screenshotCanvasCreateFailed;
    case AppErrorCode.StitchedScreenshotCanvasCreateFailed:
      return APP_ERROR_TEXT.stitchedScreenshotCanvasCreateFailed;
    case AppErrorCode.ViewportCapturesMissing:
      return APP_ERROR_TEXT.viewportCapturesMissing;
    case AppErrorCode.InteractionOverlayDrawFailed:
      return APP_ERROR_TEXT.interactionOverlayDrawFailed;
    case AppErrorCode.AgentPlanningResultMissing:
      return APP_ERROR_TEXT.agentPlanningResultMissing;
    case AppErrorCode.ChatContextProviderMissing:
      return APP_ERROR_TEXT.chatContextProviderMissing;
    case AppErrorCode.Unknown:
      return context.detail ?? 'Unknown error';
    default:
      return context.detail ?? 'Unknown error';
  }
}

interface AppErrorOptions {
  name?: string;
  cause?: unknown;
}

interface ErrorWithCause extends Error {
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly context: AppErrorContext;

  constructor(code: AppErrorCode, context: AppErrorContext = {}, options: AppErrorOptions = {}) {
    super(resolveMessage(code, context));
    this.name = options.name ?? 'AppError';
    this.code = code;
    this.context = context;
    if (options.cause !== undefined) {
      (this as ErrorWithCause).cause = options.cause;
    }
  }
}

export function createAppError(
  code: AppErrorCode,
  context: AppErrorContext = {},
  options: AppErrorOptions = {},
): AppError {
  return new AppError(code, context, options);
}

export function toError(error: unknown, fallbackCode = AppErrorCode.Unknown): Error {
  if (error instanceof Error) return error;
  return createAppError(fallbackCode, { detail: String(error) });
}

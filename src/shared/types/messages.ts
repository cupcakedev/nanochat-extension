import type {
  ExecuteActionPayload,
  ExecuteActionResponse,
  InteractionRect,
  InteractionSnapshotPayload,
} from './interaction';

export type MessageType =
  | 'PING'
  | 'GET_PAGE_CONTENT'
  | 'SET_AGENT_INDICATOR_POSITION'
  | 'GET_INTERACTION_SNAPSHOT'
  | 'SET_INTERACTION_SCROLL'
  | 'EXECUTE_INTERACTION_ACTION'
  | 'CLEAR_INTERACTION_HIGHLIGHTS'
  | 'GET_IFRAME_RECTS';

export interface BaseMessage<T extends MessageType> {
  type: T;
}

export type PingMessage = BaseMessage<'PING'>;
export interface GetPageContentMessage extends BaseMessage<'GET_PAGE_CONTENT'> {
  payload?: { indicatorBottomOffset?: number; showIndicator?: boolean };
}
export interface SetAgentIndicatorPositionMessage extends BaseMessage<'SET_AGENT_INDICATOR_POSITION'> {
  payload: { bottomOffset: number };
}

export interface GetInteractionSnapshotMessage extends BaseMessage<'GET_INTERACTION_SNAPSHOT'> {
  payload?: { maxElements?: number; viewportOnly?: boolean; viewportSegments?: number };
}

export interface SetInteractionScrollMessage extends BaseMessage<'SET_INTERACTION_SCROLL'> {
  payload: { top: number };
}

export interface ExecuteInteractionActionMessage extends BaseMessage<'EXECUTE_INTERACTION_ACTION'> {
  payload: ExecuteActionPayload;
}

export type ClearInteractionHighlightsMessage = BaseMessage<'CLEAR_INTERACTION_HIGHLIGHTS'>;
export type GetIframeRectsMessage = BaseMessage<'GET_IFRAME_RECTS'>;

export type ExtensionMessage =
  | PingMessage
  | GetPageContentMessage
  | SetAgentIndicatorPositionMessage
  | GetInteractionSnapshotMessage
  | SetInteractionScrollMessage
  | ExecuteInteractionActionMessage
  | ClearInteractionHighlightsMessage
  | GetIframeRectsMessage;

export interface MessageResponseMap {
  PING: { pong: boolean };
  GET_PAGE_CONTENT: { content: string };
  SET_AGENT_INDICATOR_POSITION: { ok: boolean };
  GET_INTERACTION_SNAPSHOT: InteractionSnapshotPayload;
  SET_INTERACTION_SCROLL: { top: number };
  EXECUTE_INTERACTION_ACTION: ExecuteActionResponse;
  CLEAR_INTERACTION_HIGHLIGHTS: { cleared: boolean };
  GET_IFRAME_RECTS: { iframes: Array<{ url: string; rect: InteractionRect }> };
}

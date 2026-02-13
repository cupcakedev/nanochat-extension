import type {
  ExecuteActionPayload,
  ExecuteActionResponse,
  InteractionSnapshotPayload,
} from './interaction';

export type MessageType =
  | 'PING'
  | 'GET_PAGE_CONTENT'
  | 'SET_AGENT_INDICATOR_POSITION'
  | 'GET_INTERACTION_SNAPSHOT'
  | 'EXECUTE_INTERACTION_ACTION'
  | 'CLEAR_INTERACTION_HIGHLIGHTS';

export interface BaseMessage<T extends MessageType> {
  type: T;
}

export type PingMessage = BaseMessage<'PING'>;
export type GetPageContentMessage = BaseMessage<'GET_PAGE_CONTENT'>;
export interface SetAgentIndicatorPositionMessage extends BaseMessage<'SET_AGENT_INDICATOR_POSITION'> {
  payload: { bottomOffset: number };
}

export interface GetInteractionSnapshotMessage extends BaseMessage<'GET_INTERACTION_SNAPSHOT'> {
  payload?: { maxElements?: number; viewportOnly?: boolean };
}

export interface ExecuteInteractionActionMessage extends BaseMessage<'EXECUTE_INTERACTION_ACTION'> {
  payload: ExecuteActionPayload;
}

export type ClearInteractionHighlightsMessage = BaseMessage<'CLEAR_INTERACTION_HIGHLIGHTS'>;

export type ExtensionMessage =
  | PingMessage
  | GetPageContentMessage
  | SetAgentIndicatorPositionMessage
  | GetInteractionSnapshotMessage
  | ExecuteInteractionActionMessage
  | ClearInteractionHighlightsMessage;

export interface MessageResponseMap {
  PING: { pong: boolean };
  GET_PAGE_CONTENT: { content: string };
  SET_AGENT_INDICATOR_POSITION: { ok: boolean };
  GET_INTERACTION_SNAPSHOT: InteractionSnapshotPayload;
  EXECUTE_INTERACTION_ACTION: ExecuteActionResponse;
  CLEAR_INTERACTION_HIGHLIGHTS: { cleared: boolean };
}

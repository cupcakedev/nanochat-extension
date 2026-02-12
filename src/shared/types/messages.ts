export type MessageType = 'PING' | 'GET_PAGE_CONTENT';

export interface BaseMessage<T extends MessageType> {
  type: T;
}

export type PingMessage = BaseMessage<'PING'>;

export type GetPageContentMessage = BaseMessage<'GET_PAGE_CONTENT'>;

export type ExtensionMessage = PingMessage | GetPageContentMessage;

export interface MessageResponseMap {
  PING: { pong: boolean };
  GET_PAGE_CONTENT: { content: string };
}

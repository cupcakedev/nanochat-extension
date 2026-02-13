export type InteractionActionType = 'click' | 'type';

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
  interactiveElements: InteractiveElementSnapshotItem[];
}

export interface ExecuteActionPayload {
  action: InteractionActionType;
  index: number;
  text?: string | null;
}

export interface ExecuteActionResponse {
  action: InteractionActionType;
  index: number;
  text: string | null;
  ok: boolean;
  message: string;
}

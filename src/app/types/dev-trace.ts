export enum DevTraceKind {
  Line = 'line',
  Screenshot = 'screenshot',
}

export interface DevTraceLineItem {
  id: string;
  kind: DevTraceKind.Line;
  line: string;
}

export interface DevTraceScreenshotItem {
  id: string;
  kind: DevTraceKind.Screenshot;
  stepNumber: number;
  imageDataUrl: string;
  width: number;
  height: number;
}

export type DevTraceItem = DevTraceLineItem | DevTraceScreenshotItem;

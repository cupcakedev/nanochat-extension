export interface DevTraceLineItem {
  id: string;
  kind: 'line';
  line: string;
}

export interface DevTraceScreenshotItem {
  id: string;
  kind: 'screenshot';
  stepNumber: number;
  imageDataUrl: string;
  width: number;
  height: number;
}

export type DevTraceItem = DevTraceLineItem | DevTraceScreenshotItem;

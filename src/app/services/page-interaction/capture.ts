import { captureScreenshot, setInteractionScroll } from '@app/services/tab-bridge';

export interface ViewportCaptureResult {
  canvas: HTMLCanvasElement;
  dataUrl: string;
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function decodeImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to decode captured screenshot'));
    image.src = dataUrl;
  });
}

function drawImageToCanvas(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to create screenshot canvas');
  context.drawImage(image, 0, 0);
  return canvas;
}

export async function captureVisibleViewport(
  windowId: number,
  settleMs: number,
): Promise<ViewportCaptureResult> {
  if (settleMs > 0) await pause(settleMs);
  const dataUrl = await captureScreenshot(windowId);
  const image = await decodeImage(dataUrl);
  return { dataUrl, canvas: drawImageToCanvas(image) };
}

function stitchVerticalCanvases(canvases: HTMLCanvasElement[]): HTMLCanvasElement {
  if (!canvases.length) throw new Error('No viewport captures available for stitching');

  const width = Math.max(...canvases.map((canvas) => canvas.width));
  const height = canvases.reduce((sum, canvas) => sum + canvas.height, 0);
  const stitched = document.createElement('canvas');
  stitched.width = width;
  stitched.height = height;

  const context = stitched.getContext('2d');
  if (!context) throw new Error('Unable to create stitched screenshot canvas');

  let offsetY = 0;
  canvases.forEach((canvas) => {
    context.drawImage(canvas, 0, offsetY);
    offsetY += canvas.height;
  });
  return stitched;
}

export async function captureStackedViewport(params: {
  windowId: number;
  tabId: number;
  baseScrollY: number;
  viewportHeight: number;
  viewportSegments: number;
  settleMs: number;
}): Promise<ViewportCaptureResult> {
  const segments = Math.max(1, Math.floor(params.viewportSegments));
  if (segments <= 1) {
    return captureVisibleViewport(params.windowId, params.settleMs);
  }

  const canvases: HTMLCanvasElement[] = [];
  try {
    for (let segment = 0; segment < segments; segment += 1) {
      await setInteractionScroll(params.tabId, params.baseScrollY + params.viewportHeight * segment);
      if (params.settleMs > 0) await pause(params.settleMs);
      const dataUrl = await captureScreenshot(params.windowId);
      const image = await decodeImage(dataUrl);
      canvases.push(drawImageToCanvas(image));
    }
  } finally {
    await setInteractionScroll(params.tabId, params.baseScrollY).catch(() => undefined);
  }

  const stitchedCanvas = stitchVerticalCanvases(canvases);
  return {
    canvas: stitchedCanvas,
    dataUrl: stitchedCanvas.toDataURL('image/png'),
  };
}

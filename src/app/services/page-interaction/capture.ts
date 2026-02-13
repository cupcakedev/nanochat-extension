import { captureScreenshot } from '@app/services/tab-bridge';

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

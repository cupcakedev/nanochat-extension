import type { InteractiveElementSnapshotItem } from '@shared/types';

const HIGHLIGHT_COLORS = [
  '#ef4444',
  '#22c55e',
  '#3b82f6',
  '#f59e0b',
  '#14b8a6',
  '#f97316',
  '#e11d48',
  '#06b6d4',
  '#84cc16',
  '#a855f7',
  '#0ea5e9',
  '#10b981',
];

interface ViewportSize {
  width: number;
  height: number;
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function cloneBaseCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = createCanvas(source.width, source.height);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to create screenshot canvas');
  context.drawImage(source, 0, 0);
  return canvas;
}

function resolveScale(imageSize: number, viewportSize: number): number {
  if (viewportSize <= 0) return 1;
  return imageSize / viewportSize;
}

function drawLabel(
  context: CanvasRenderingContext2D,
  index: number,
  x: number,
  y: number,
  color: string,
): void {
  const text = String(index);
  context.font = 'bold 16px ui-sans-serif, system-ui, -apple-system, sans-serif';
  const metrics = context.measureText(text);
  const width = Math.ceil(metrics.width + 14);
  const height = 22;
  context.fillStyle = color;
  context.fillRect(x, y, width, height);
  context.fillStyle = '#ffffff';
  context.fillText(text, x + 7, y + 16);
}

function drawElementOverlay(
  context: CanvasRenderingContext2D,
  element: InteractiveElementSnapshotItem,
  scaleX: number,
  scaleY: number,
  color: string,
): { labelX: number; labelY: number } {
  const x = Math.round(element.rect.x * scaleX);
  const y = Math.round(element.rect.y * scaleY);
  const width = Math.max(1, Math.round(element.rect.width * scaleX));
  const height = Math.max(1, Math.round(element.rect.height * scaleY));

  context.strokeStyle = color;
  context.fillStyle = `${color}33`;
  context.lineWidth = Math.max(1, Math.round((scaleX + scaleY) * 0.8));
  context.fillRect(x, y, width, height);
  context.strokeRect(x, y, width, height);

  const labelX = Math.max(0, x + Math.max(0, width - 36));
  const labelY = Math.max(0, y - 22);
  return { labelX, labelY };
}

export function annotateInteractionCanvas(
  baseCanvas: HTMLCanvasElement,
  elements: InteractiveElementSnapshotItem[],
  viewport: ViewportSize,
): HTMLCanvasElement {
  const canvas = cloneBaseCanvas(baseCanvas);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to draw interaction overlays');

  const scaleX = resolveScale(canvas.width, viewport.width);
  const scaleY = resolveScale(canvas.height, viewport.height);
  const labels: Array<{ index: number; x: number; y: number; color: string }> = [];

  elements.forEach((element, position) => {
    const color = HIGHLIGHT_COLORS[position % HIGHLIGHT_COLORS.length];
    const { labelX, labelY } = drawElementOverlay(context, element, scaleX, scaleY, color);
    labels.push({ index: element.index, x: labelX, y: labelY, color });
  });

  labels.forEach((label) => {
    drawLabel(context, label.index, label.x, label.y, label.color);
  });

  return canvas;
}

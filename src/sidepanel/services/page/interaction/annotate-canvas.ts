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

const LABEL_FONT = 'bold 14px ui-sans-serif, system-ui, -apple-system, sans-serif';
const LABEL_HEIGHT = 20;
const LABEL_PAD_X = 6;
const LABEL_PAD_Y = 14;

interface ViewportSize {
  width: number;
  height: number;
}

interface LabelRect {
  x: number;
  y: number;
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

function rectsOverlap(a: LabelRect, b: LabelRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function nudgeLabel(rect: LabelRect, placed: LabelRect[], canvasHeight: number): LabelRect {
  let current = rect;
  const maxAttempts = 6;
  for (let i = 0; i < maxAttempts; i++) {
    if (!placed.some((p) => rectsOverlap(current, p))) return current;
    const nextY = current.y + LABEL_HEIGHT;
    if (nextY + LABEL_HEIGHT > canvasHeight) return current;
    current = { ...current, y: nextY };
  }
  return current;
}

function measureLabelWidth(context: CanvasRenderingContext2D, index: number): number {
  context.font = LABEL_FONT;
  return Math.ceil(context.measureText(String(index)).width + LABEL_PAD_X * 2);
}

function drawLabel(
  context: CanvasRenderingContext2D,
  index: number,
  x: number,
  y: number,
  width: number,
  color: string,
): void {
  context.font = LABEL_FONT;
  context.fillStyle = color;
  context.fillRect(x, y, width, LABEL_HEIGHT);
  context.fillStyle = '#ffffff';
  context.fillText(String(index), x + LABEL_PAD_X, y + LABEL_PAD_Y);
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
  context.fillStyle = `${color}18`;
  context.lineWidth = Math.max(1, Math.round((scaleX + scaleY) * 0.8));
  context.fillRect(x, y, width, height);
  context.strokeRect(x, y, width, height);

  const labelX = Math.max(0, x + Math.max(0, width - 36));
  const labelY = Math.max(0, y - LABEL_HEIGHT);
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
  const pending: Array<{ index: number; x: number; y: number; color: string }> = [];

  elements.forEach((element, position) => {
    const color = HIGHLIGHT_COLORS[position % HIGHLIGHT_COLORS.length];
    const { labelX, labelY } = drawElementOverlay(context, element, scaleX, scaleY, color);
    pending.push({ index: element.index, x: labelX, y: labelY, color });
  });

  const placed: LabelRect[] = [];
  for (const label of pending) {
    const w = measureLabelWidth(context, label.index);
    const rect = nudgeLabel(
      { x: label.x, y: label.y, width: w, height: LABEL_HEIGHT },
      placed,
      canvas.height,
    );
    drawLabel(context, label.index, rect.x, rect.y, w, label.color);
    placed.push(rect);
  }

  return canvas;
}

let indexedElements: HTMLElement[] = [];

export function setIndexedElements(elements: HTMLElement[]): void {
  indexedElements = [...elements];
}

export function clearIndexedElements(): void {
  indexedElements = [];
}

export function getIndexedElement(index: number): HTMLElement | null {
  if (!Number.isFinite(index) || index <= 0) return null;
  const element = indexedElements[Math.floor(index) - 1];
  if (!element || !element.isConnected) return null;
  return element;
}

import { clearIndexedElements, setIndexedElements } from './indexed-elements';

export function clearInteractionHighlights(): void {
  clearIndexedElements();
}

export function applyInteractionHighlights(elements: HTMLElement[]): void {
  setIndexedElements(elements);
}

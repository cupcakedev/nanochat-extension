import type { InteractiveElementSnapshotItem } from '@shared/types';

function compact(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : null;
}

function truncate(value: string | null | undefined, max: number): string | null {
  const normalized = compact(value);
  if (!normalized) return null;
  return normalized.length <= max ? normalized : normalized.slice(0, max);
}

function createElementLine(element: InteractiveElementSnapshotItem): string {
  const parts: string[] = [`[${element.index}] <${element.tag}>`];
  if (element.role) parts.push(`role=${truncate(element.role, 32)}`);
  if (element.inputType) parts.push(`type=${truncate(element.inputType, 32)}`);
  if (element.text) parts.push(`text="${truncate(element.text, 100)}"`);
  if (element.ariaLabel) parts.push(`aria="${truncate(element.ariaLabel, 100)}"`);
  if (element.placeholder) parts.push(`placeholder="${truncate(element.placeholder, 80)}"`);
  if (element.name) parts.push(`name="${truncate(element.name, 80)}"`);
  if (element.id) parts.push(`id="${truncate(element.id, 80)}"`);
  if (element.href) parts.push(`href="${truncate(element.href, 180)}"`);
  parts.push(`disabled=${element.disabled ? 'true' : 'false'}`);
  parts.push(`rect=${element.rect.x},${element.rect.y},${element.rect.width},${element.rect.height}`);
  return parts.join(' | ');
}

export function buildInteractionPrompt(params: {
  pageUrl: string;
  pageTitle: string;
  instruction: string;
  elements: InteractiveElementSnapshotItem[];
}): string {
  const elementLines = params.elements.map(createElementLine);

  return [
    'You are a browser interaction planner for sequential UI actions.',
    'Return only minified JSON and nothing else.',
    '{"actions":[{"action":"click|type|done|unknown","index":number|null,"text":string|null,"reason":string|null,"confidence":"high|medium|low"}]}.',
    'Choose 1 to 6 consecutive actions for the current page state and screenshot.',
    'Map each explicit user intent to an action step; do not collapse multiple intents into one step.',
    'If instruction includes sequence connectors (then, and then, after that, потом, а потом, затем, после этого), return multiple actions in that order.',
    'You can only use indices from the provided indexed interactive elements list.',
    'Actions are executed in listed order.',
    'Use action=click for pressing links/buttons/tabs/controls.',
    'Use action=type for entering text into a field; provide the exact text in text.',
    'If instruction asks to type text and also click/press/search/submit, return at least two actions: type first, click second.',
    'Search flow rule: after typing a query, include a click on the search control (button/icon with text or aria like Search/Поиск).',
    'Do not stop after typing when the instruction explicitly asks for a follow-up click.',
    'If the instruction includes explicit text/code to enter, prioritize action=type first on the relevant input.',
    'Do not click Apply/Add/Submit/Continue before entering requested text into the matching field.',
    'Coupon/promo/discount flows must be two-step: type first, click apply second.',
    'If user asks only click/press and does not ask type/fill/enter, choose action=click.',
    'Never choose disabled=true targets.',
    'If task is already completed, return done with index=null.',
    'If uncertain, return unknown with index=null.',
    'Output must be English.',
    `User instruction: ${params.instruction}`,
    `Page URL: ${params.pageUrl}`,
    `Page title: ${params.pageTitle}`,
    'Indexed interactive elements:',
    elementLines.join('\n'),
  ].join('\n\n');
}

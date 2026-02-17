type ValueTarget = HTMLInputElement | HTMLTextAreaElement;

function setNativeInputValue(element: ValueTarget, value: string): void {
  const descriptor =
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value') ??
    Object.getOwnPropertyDescriptor(element.constructor.prototype, 'value');
  if (descriptor?.set) {
    descriptor.set.call(element, value);
    return;
  }
  element.value = value;
}

function dispatchTextEvents(target: HTMLElement, previousValue: string, nextValue: string): void {
  const tracker = (target as { _valueTracker?: { setValue: (v: string) => void } })._valueTracker;
  if (tracker && typeof tracker.setValue === 'function') {
    tracker.setValue(previousValue);
  }

  try {
    target.dispatchEvent(
      new InputEvent('beforeinput', {
        bubbles: true,
        composed: true,
        data: nextValue,
        inputType: 'insertText',
      }),
    );
  } catch {
    /* noop */
  }

  try {
    target.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        composed: true,
        data: nextValue,
        inputType: 'insertText',
      }),
    );
  } catch {
    target.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }

  target.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
}

const NON_TEXT_EDITABLE_INPUT_TYPES = new Set([
  'checkbox',
  'radio',
  'file',
  'button',
  'submit',
  'reset',
  'image',
  'range',
  'color',
]);

export function executeInputType(
  target: ValueTarget,
  text: string,
): { ok: boolean; message: string } {
  if (target instanceof HTMLInputElement && NON_TEXT_EDITABLE_INPUT_TYPES.has(target.type)) {
    return { ok: false, message: 'Target input type is not text-editable' };
  }
  target.scrollIntoView({ block: 'center', inline: 'center' });
  target.focus();
  const prev = target.value;
  setNativeInputValue(target, text);
  if (target.value !== text) target.value = text;
  try {
    target.setSelectionRange(target.value.length, target.value.length);
  } catch {
    /* noop */
  }
  dispatchTextEvents(target, prev, target.value);
  return { ok: true, message: `Input value updated "${prev}" -> "${target.value}"` };
}

export function executeSelectType(
  target: HTMLSelectElement,
  text: string,
): { ok: boolean; message: string } {
  const normalized = text.trim().toLowerCase();
  const match = Array.from(target.options).find((o) => {
    const label = o.text.trim().toLowerCase();
    const value = o.value.trim().toLowerCase();
    return label === normalized || value === normalized || label.includes(normalized);
  });
  if (!match) return { ok: false, message: 'No matching option in select' };
  target.scrollIntoView({ block: 'center', inline: 'center' });
  target.focus();
  const prev = target.value;
  target.value = match.value;
  dispatchTextEvents(target, prev, target.value);
  return { ok: true, message: `Select value updated "${prev}" -> "${target.value}"` };
}

export function executeContentEditableType(
  target: HTMLElement,
  text: string,
): { ok: boolean; message: string } {
  target.scrollIntoView({ block: 'center', inline: 'center' });
  target.focus();
  const prev = target.textContent ?? '';
  target.textContent = text;
  dispatchTextEvents(target, prev, target.textContent ?? '');
  return { ok: true, message: 'Content editable value updated' };
}

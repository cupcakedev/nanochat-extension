const HOST_ID = 'nanochat-selection-host';
const POPUP_GAP = 8;
const POPUP_HEIGHT = 36;

const STYLES = `
  .popup {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 6px;
    background: #ffffff;
    border-radius: 20px;
    padding: 5px 12px 5px 8px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.07);
    cursor: pointer;
    user-select: none;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    font-weight: 500;
    color: #1a1a1a;
    white-space: nowrap;
    pointer-events: auto;
    transform: translateX(-50%);
    animation: nc-pop 0.12s ease-out;
  }
  @keyframes nc-pop {
    from { opacity: 0; transform: translateX(-50%) scale(0.92); }
    to   { opacity: 1; transform: translateX(-50%) scale(1); }
  }
  .popup:hover {
    box-shadow: 0 4px 16px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.09);
  }
  .popup.hidden { display: none !important; }
  .popup img {
    width: 20px;
    height: 20px;
    border-radius: 5px;
    flex-shrink: 0;
  }
`;

let popupEl: HTMLElement | null = null;
let pendingText = '';

function ensurePopup(): void {
  if (document.getElementById(HOST_ID)) {
    if (!popupEl) {
      const host = document.getElementById(HOST_ID)!;
      popupEl = host.shadowRoot?.querySelector('.popup') as HTMLElement | null;
    }
    return;
  }

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483647;pointer-events:none;';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = STYLES;
  shadow.appendChild(style);

  const el = document.createElement('div');
  el.className = 'popup hidden';
  shadow.appendChild(el);

  const img = document.createElement('img');
  img.src = chrome.runtime.getURL('icons/icon-48.png');
  img.alt = '';
  el.appendChild(img);

  const label = document.createElement('span');
  label.textContent = 'Ask NanoChat';
  el.appendChild(label);

  el.addEventListener('mousedown', (e) => e.preventDefault());
  el.addEventListener('click', () => {
    const text = pendingText;
    hide();
    chrome.runtime.sendMessage({ type: 'OPEN_WITH_SELECTION', text });
  });

  popupEl = el;
}

function show(centerX: number, topY: number, text: string): void {
  ensurePopup();
  if (!popupEl) return;
  pendingText = text;
  popupEl.style.left = `${centerX}px`;
  popupEl.style.top = `${Math.max(4, topY - POPUP_HEIGHT - POPUP_GAP)}px`;
  popupEl.classList.remove('hidden');
}

function hide(): void {
  popupEl?.classList.add('hidden');
  pendingText = '';
}

export function initSelectionPopup(): void {
  document.addEventListener('mouseup', (e) => {
    if (e.button !== 0) return;

    requestAnimationFrame(() => {
      const selection = window.getSelection();
      const text = selection?.toString().trim() ?? '';

      if (text.length < 2 || !selection || selection.rangeCount === 0) {
        hide();
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      if (!rect.width && !rect.height) {
        hide();
        return;
      }

      show(rect.left + rect.width / 2, rect.top, text);
    });
  });

  document.addEventListener('mousedown', (e) => {
    const host = document.getElementById(HOST_ID);
    if (host && e.composedPath().includes(host)) return;
    hide();
  });

  document.addEventListener('keydown', () => hide());
  document.addEventListener('scroll', () => hide(), { capture: true });
}

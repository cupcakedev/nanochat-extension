const HOST_ID = 'nanochat-sel-host';

interface Language {
  name: string;
  native: string;
}

const LANGUAGES: Language[] = [
  { name: 'English', native: 'English' },
  { name: 'Spanish', native: 'Español' },
  { name: 'French', native: 'Français' },
  { name: 'German', native: 'Deutsch' },
  { name: 'Italian', native: 'Italiano' },
  { name: 'Portuguese', native: 'Português' },
  { name: 'Russian', native: 'Русский' },
  { name: 'Chinese', native: '中文' },
  { name: 'Japanese', native: '日本語' },
  { name: 'Korean', native: '한국어' },
  { name: 'Arabic', native: 'العربية' },
  { name: 'Hindi', native: 'हिन्दी' },
  { name: 'Dutch', native: 'Nederlands' },
  { name: 'Polish', native: 'Polski' },
  { name: 'Turkish', native: 'Türkçe' },
];

const ICON_GLOBE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
const ICON_LIST = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>`;
const ICON_PENCIL = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`;
const ICON_ARROW = `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;

const STYLES = `
  .toolbar {
    position: absolute;
    display: flex;
    align-items: center;
    background: #ffffff;
    border-radius: 22px;
    padding: 4px;
    box-shadow: 0 2px 14px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.06);
    gap: 1px;
    transform: translateX(-50%);
    pointer-events: auto;
    animation: nc-pop 0.15s ease-out;
    user-select: none;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  .toolbar.hidden, .lang-panel.hidden { display: none !important; }
  @keyframes nc-pop {
    from { opacity: 0; transform: translateX(-50%) scale(0.9); }
    to   { opacity: 1; transform: translateX(-50%) scale(1); }
  }
  .tool-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    height: 32px;
    border-radius: 16px;
    cursor: pointer;
    color: #555;
    position: relative;
    transition: background 0.1s, color 0.1s;
    padding: 0 7px;
    gap: 4px;
  }
  .tool-btn:hover { background: #f0f0f0; color: #111; }
  .tool-btn.active { color: #1a73e8; background: #e8f0fe; }
  .tool-btn.active:hover { background: #dce8fd; }
  .trans-label {
    font-size: 13px;
    font-weight: 500;
    letter-spacing: -0.01em;
  }
  .text-icon {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.02em;
  }
  .arrow-icon { display: flex; opacity: 0.55; }
  .tool-btn img {
    width: 20px;
    height: 20px;
    border-radius: 5px;
    display: block;
  }
  .divider {
    width: 1px;
    height: 18px;
    background: #e5e5e5;
    margin: 0 2px;
    flex-shrink: 0;
  }
  .tooltip {
    display: none;
    position: absolute;
    top: calc(100% + 7px);
    left: 50%;
    transform: translateX(-50%);
    background: rgba(25,25,25,0.82);
    color: #fff;
    font-size: 11px;
    font-weight: 500;
    padding: 3px 8px;
    border-radius: 5px;
    white-space: nowrap;
    pointer-events: none;
    z-index: 10;
  }
  .tool-btn:hover .tooltip { display: block; }
  .lang-panel {
    position: absolute;
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.06);
    padding: 5px 0;
    width: 190px;
    max-height: 272px;
    overflow-y: auto;
    pointer-events: auto;
    transform: translateX(-50%);
    animation: nc-fade 0.12s ease-out;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  @keyframes nc-fade {
    from { opacity: 0; transform: translateX(-50%) translateY(4px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  .lang-panel::-webkit-scrollbar { width: 4px; }
  .lang-panel::-webkit-scrollbar-thumb { background: #d0d0d0; border-radius: 2px; }
  .lang-item {
    display: flex;
    align-items: center;
    padding: 7px 14px;
    cursor: pointer;
    transition: background 0.08s;
  }
  .lang-item:hover { background: #f5f5f5; }
  .lang-item.active { color: #1a73e8; }
  .lang-info { display: flex; flex-direction: column; flex: 1; }
  .lang-name { font-size: 13px; font-weight: 500; color: inherit; }
  .lang-native { font-size: 11px; color: #999; margin-top: 1px; }
  .lang-item.active .lang-native { color: #90bef5; }
  .lang-check { font-size: 13px; color: #1a73e8; font-weight: 700; margin-left: 6px; flex-shrink: 0; }
`;

let toolbarEl: HTMLElement | null = null;
let langPanelEl: HTMLElement | null = null;
let currentText = '';
let selectedLang = 'English';
let langPanelOpen = false;
let tbCenterX = 0;
let tbTop = 0;

// Set by shadow root's mousedown — prevents document mousedown from calling hide()
let _blockNextDocMousedown = false;

const TOOLBAR_H = 40;
const TOOLBAR_GAP = 8;
const LANG_PANEL_H = 272;
const LANG_PANEL_GAP = 6;

function sendAction(action: string, text: string, targetLang?: string): void {
  try {
    chrome.runtime.sendMessage({ type: 'OPEN_WITH_SELECTION', text, action, targetLang });
  } catch {
    /* extension context invalidated */
  }
}

function setActiveLang(name: string): void {
  selectedLang = name;
  if (!langPanelEl) return;
  langPanelEl.querySelectorAll('.lang-item').forEach((el) => {
    const item = el as HTMLElement;
    const active = item.dataset.lang === name;
    item.classList.toggle('active', active);
    const check = item.querySelector('.lang-check') as HTMLElement | null;
    if (check) check.style.display = active ? '' : 'none';
  });
}

function positionLangPanel(): void {
  if (!langPanelEl) return;
  const spaceAbove = tbTop - TOOLBAR_GAP;
  if (spaceAbove >= LANG_PANEL_H + LANG_PANEL_GAP) {
    langPanelEl.style.top = `${tbTop - LANG_PANEL_H - LANG_PANEL_GAP}px`;
  } else {
    langPanelEl.style.top = `${tbTop + TOOLBAR_H + LANG_PANEL_GAP}px`;
  }
  langPanelEl.style.left = `${tbCenterX}px`;
}

function openLangPanel(): void {
  langPanelOpen = true;
  langPanelEl?.classList.remove('hidden');
  toolbarEl?.querySelector('[data-action="translate"]')?.classList.add('active');
  positionLangPanel();
}

function closeLangPanel(): void {
  langPanelOpen = false;
  langPanelEl?.classList.add('hidden');
  toolbarEl?.querySelector('[data-action="translate"]')?.classList.remove('active');
}

function makeBtn(inner: string, tooltip: string, action: string): HTMLElement {
  const btn = document.createElement('div');
  btn.className = 'tool-btn';
  btn.dataset.action = action;
  btn.innerHTML = inner;
  const tip = document.createElement('div');
  tip.className = 'tooltip';
  tip.textContent = tooltip;
  btn.appendChild(tip);
  return btn;
}

function makeDivider(): HTMLElement {
  const d = document.createElement('div');
  d.className = 'divider';
  return d;
}

function buildToolbar(): HTMLElement {
  const tb = document.createElement('div');
  tb.className = 'toolbar hidden';

  tb.appendChild(
    makeBtn(
      `${ICON_GLOBE}<span class="trans-label">Translate</span><span class="arrow-icon">${ICON_ARROW}</span>`,
      'Translate',
      'translate',
    ),
  );
  tb.appendChild(makeDivider());
  tb.appendChild(makeBtn(ICON_LIST, 'Summarize', 'summarize'));
  tb.appendChild(makeBtn(ICON_PENCIL, 'Rewrite', 'rewrite'));
  tb.appendChild(makeBtn('<span class="text-icon">Aa</span>', 'Spell check', 'spellcheck'));
  tb.appendChild(
    makeBtn(
      '<span class="text-icon" style="font-size:15px;font-weight:700">?</span>',
      'Explain',
      'explain',
    ),
  );
  tb.appendChild(makeDivider());

  const iconUrl = chrome.runtime.getURL('icons/icon-48.png');
  tb.appendChild(makeBtn(`<img src="${iconUrl}" alt="">`, 'Ask NanoChat', 'ask'));

  tb.addEventListener('click', (e) => {
    const btn = (e.target as Element).closest('[data-action]') as HTMLElement | null;
    if (!btn) return;
    const action = btn.dataset.action!;

    if (action === 'translate') {
      langPanelOpen ? closeLangPanel() : openLangPanel();
      return;
    }

    // Capture text BEFORE hide() clears it
    const text = currentText;
    hide();
    window.getSelection()?.removeAllRanges();
    sendAction(action, text);
  });

  return tb;
}

function buildLangPanel(): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'lang-panel hidden';

  LANGUAGES.forEach(({ name, native }) => {
    const item = document.createElement('div');
    item.className = 'lang-item' + (name === selectedLang ? ' active' : '');
    item.dataset.lang = name;

    const info = document.createElement('div');
    info.className = 'lang-info';

    const nameEl = document.createElement('span');
    nameEl.className = 'lang-name';
    nameEl.textContent = name;

    const nativeEl = document.createElement('span');
    nativeEl.className = 'lang-native';
    nativeEl.textContent = native;

    info.appendChild(nameEl);
    info.appendChild(nativeEl);

    const check = document.createElement('span');
    check.className = 'lang-check';
    check.textContent = '✓';
    check.style.display = name === selectedLang ? '' : 'none';

    item.appendChild(info);
    item.appendChild(check);

    item.addEventListener('click', () => {
      const text = currentText;
      setActiveLang(name);
      hide();
      window.getSelection()?.removeAllRanges();
      sendAction('translate', text, name);
    });

    panel.appendChild(item);
  });

  return panel;
}

function ensureHost(): void {
  if (document.getElementById(HOST_ID)) return;

  const hostEl = document.createElement('div');
  hostEl.id = HOST_ID;
  hostEl.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483647;pointer-events:none;';
  document.body.appendChild(hostEl);

  const shadow = hostEl.attachShadow({ mode: 'open' });

  // Fires before document's mousedown — prevents document from calling hide()
  shadow.addEventListener('mousedown', (e) => {
    e.preventDefault(); // prevent text deselection
    _blockNextDocMousedown = true;
  });

  const style = document.createElement('style');
  style.textContent = STYLES;
  shadow.appendChild(style);

  toolbarEl = buildToolbar();
  langPanelEl = buildLangPanel();

  shadow.appendChild(toolbarEl);
  shadow.appendChild(langPanelEl);
}

function show(centerX: number, selectionTop: number, text: string): void {
  ensureHost();
  if (!toolbarEl) return;

  currentText = text;
  tbCenterX = centerX;
  tbTop = selectionTop - TOOLBAR_H - TOOLBAR_GAP;

  if (langPanelOpen) closeLangPanel();

  toolbarEl.style.left = `${tbCenterX}px`;
  toolbarEl.style.top = `${tbTop}px`;
  toolbarEl.classList.remove('hidden');
}

function hide(): void {
  toolbarEl?.classList.add('hidden');
  closeLangPanel();
  currentText = '';
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

      const rect = selection.getRangeAt(0).getBoundingClientRect();
      if (!rect.width && !rect.height) {
        hide();
        return;
      }

      show(rect.left + rect.width / 2, rect.top, text);
    });
  });

  document.addEventListener('mousedown', () => {
    if (_blockNextDocMousedown) {
      _blockNextDocMousedown = false;
      return;
    }
    hide();
  });

  document.addEventListener('keydown', () => hide());
  document.addEventListener('scroll', () => hide(), { capture: true });
}

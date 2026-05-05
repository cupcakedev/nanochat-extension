const HOST_ID = 'nanochat-sel-host';

interface Language { name: string; native: string }

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

const ACTION_LABELS: Record<string, string> = {
  translate: 'Translate',
  summarize: 'Summarize',
  rewrite: 'Rewrite',
  spellcheck: 'Spell check',
  explain: 'Explain',
};

const ICON_GLOBE = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
const ICON_LIST = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>`;
const ICON_PENCIL = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`;
const ICON_ARROW_DOWN = `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
const ICON_CLOSE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const ICON_SPARKLE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.6H22l-6.2 4.5 2.4 7.6L12 17.2l-6.2 4.5 2.4-7.6L2 9.6h7.6z"/></svg>`;

const STYLES = `
  /* ─── TOOLBAR ─── */
  .toolbar {
    position: absolute;
    display: flex;
    align-items: center;
    background: #fff;
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
  .toolbar.hidden, .lang-panel.hidden, .rcard.hidden { display: none !important; }
  @keyframes nc-pop {
    from { opacity: 0; transform: translateX(-50%) scale(0.9); }
    to   { opacity: 1; transform: translateX(-50%) scale(1); }
  }
  .tool-btn {
    display: flex; align-items: center; justify-content: center;
    min-width: 32px; height: 32px; border-radius: 16px;
    cursor: pointer; color: #555; position: relative;
    transition: background 0.1s, color 0.1s; padding: 0 7px; gap: 4px;
  }
  .tool-btn:hover { background: #f0f0f0; color: #111; }
  .tool-btn.active { color: #1a73e8; background: #e8f0fe; }
  .trans-label { font-size: 13px; font-weight: 500; letter-spacing: -0.01em; }
  .text-icon { font-size: 13px; font-weight: 600; letter-spacing: -0.02em; }
  .arrow-icon { display: flex; opacity: 0.55; }
  .tool-btn img { width: 20px; height: 20px; border-radius: 5px; display: block; }
  .divider { width: 1px; height: 18px; background: #e5e5e5; margin: 0 2px; flex-shrink: 0; }
  .tooltip {
    display: none; position: absolute; top: calc(100% + 7px); left: 50%;
    transform: translateX(-50%); background: rgba(25,25,25,0.82);
    color: #fff; font-size: 11px; font-weight: 500; padding: 3px 8px;
    border-radius: 5px; white-space: nowrap; pointer-events: none; z-index: 10;
  }
  .tool-btn:hover .tooltip { display: block; }

  /* ─── LANG PANEL ─── */
  .lang-panel {
    position: absolute; background: #fff; border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.06);
    padding: 5px 0; width: 190px; max-height: 272px; overflow-y: auto;
    pointer-events: auto; transform: translateX(-50%);
    animation: nc-fade 0.12s ease-out;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  @keyframes nc-fade {
    from { opacity: 0; transform: translateX(-50%) translateY(4px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  .lang-panel::-webkit-scrollbar { width: 4px; }
  .lang-panel::-webkit-scrollbar-thumb { background: #d0d0d0; border-radius: 2px; }
  .lang-item { display: flex; align-items: center; padding: 7px 14px; cursor: pointer; transition: background 0.08s; }
  .lang-item:hover { background: #f5f5f5; }
  .lang-item.active { color: #1a73e8; }
  .lang-info { display: flex; flex-direction: column; flex: 1; }
  .lang-name { font-size: 13px; font-weight: 500; color: inherit; }
  .lang-native { font-size: 11px; color: #999; margin-top: 1px; }
  .lang-item.active .lang-native { color: #90bef5; }
  .lang-check { font-size: 13px; color: #1a73e8; font-weight: 700; margin-left: 6px; flex-shrink: 0; }

  /* ─── RESULT CARD ─── */
  .rcard {
    position: absolute; background: #fff; border-radius: 16px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06);
    width: 380px; max-width: calc(100vw - 24px); max-height: 50vh;
    display: flex; flex-direction: column;
    pointer-events: auto; overflow: hidden;
    animation: nc-pop 0.16s ease-out;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  .rcard-hdr {
    display: flex; align-items: center; gap: 7px;
    padding: 10px 12px; border-bottom: 1px solid #f0f0f0;
  }
  .rcard-logo { width: 22px; height: 22px; border-radius: 5px; display: block; flex-shrink: 0; }
  .rcard-action {
    display: flex; align-items: center; gap: 3px;
    font-size: 14px; font-weight: 600; color: #1a1a1a; cursor: pointer;
  }
  .rcard-action:hover { color: #1a73e8; }
  .rcard-spacer { flex: 1; }
  .rcard-lang-wrap {
    display: flex; align-items: center; gap: 3px;
    font-size: 13px; color: #555; cursor: pointer; padding: 3px 6px;
    border-radius: 8px; transition: background 0.1s;
  }
  .rcard-lang-wrap:hover { background: #f0f0f0; color: #111; }
  .rcard-hdr-btn {
    display: flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; border-radius: 50%; cursor: pointer;
    color: #888; transition: background 0.1s, color 0.1s; flex-shrink: 0;
  }
  .rcard-hdr-btn:hover { background: #f0f0f0; color: #333; }
  .rcard-source {
    padding: 8px 14px 0;
    font-size: 12px; color: #999; line-height: 1.5;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .rcard-body { padding: 8px 14px 12px; min-height: 44px; flex: 1 1 auto; overflow-y: auto; }
  .rcard-body::-webkit-scrollbar { width: 4px; }
  .rcard-body::-webkit-scrollbar-thumb { background: #d0d0d0; border-radius: 2px; }
  .rcard-text { font-size: 14px; line-height: 1.65; color: #1a1a1a; white-space: pre-wrap; word-break: break-word; }
  .rcard-error { font-size: 13px; color: #d93025; line-height: 1.5; }
  .rcard-dots { display: flex; gap: 4px; padding: 4px 0; }
  .rcard-dot {
    width: 6px; height: 6px; border-radius: 50%; background: #c0c0c0;
    animation: nc-blink 1.2s infinite; flex-shrink: 0;
  }
  .rcard-dot:nth-child(2) { animation-delay: 0.2s; }
  .rcard-dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes nc-blink { 0%,80%,100% { opacity: 0.3; } 40% { opacity: 1; } }
  .rcard-footer {
    padding: 8px 14px 12px; display: flex; justify-content: center;
    border-top: 1px solid #f0f0f0;
  }
  .rcard-continue {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 22px; background: #eef2ff;
    border: none; border-radius: 20px; cursor: pointer;
    font-size: 13px; font-weight: 500; color: #3b6ef8;
    transition: background 0.1s; font-family: inherit;
  }
  .rcard-continue:hover { background: #e0e8ff; }
  .rcard-continue img { width: 18px; height: 18px; border-radius: 4px; }
`;

// ── Module state ──────────────────────────────────────────────────────────────
let toolbarEl: HTMLElement | null = null;
let langPanelEl: HTMLElement | null = null;
let rcardEl: HTMLElement | null = null;
let rcardTextEl: HTMLElement | null = null;
let rcardErrorEl: HTMLElement | null = null;
let rcardDotsEl: HTMLElement | null = null;
let rcardFooterEl: HTMLElement | null = null;
let rcardLangWrapEl: HTMLElement | null = null;
let rcardActionLabelEl: HTMLElement | null = null;

let currentText = '';
let selectedLang = 'English';
let langPanelOpen = false;
let langPanelCaller: 'toolbar' | 'rcard' = 'toolbar';
let tbCenterX = 0;
let tbTop = 0;

let abortInference: (() => void) | null = null;
let rcardAction = '';
let rcardOriginalText = '';

let _blockNextDocMousedown = false;

const TOOLBAR_H = 40;
const TOOLBAR_GAP = 8;
const LANG_PANEL_H = 272;
const LANG_PANEL_GAP = 6;

// ── Prompt builder ────────────────────────────────────────────────────────────
function buildPrompt(action: string, text: string, targetLang?: string): string {
  const q = `"${text}"`;
  switch (action) {
    case 'translate':
      return `Translate the following text to ${targetLang ?? 'English'}. Output only the translated text, no explanations:\n\n${q}`;
    case 'summarize':
      return `Summarize the following text concisely:\n\n${q}`;
    case 'rewrite':
      return `Rewrite the following text to improve clarity and flow while keeping the same meaning. Output only the rewritten text:\n\n${q}`;
    case 'spellcheck':
      return `Check the spelling and grammar in the following text. List any errors and provide the corrected version:\n\n${q}`;
    case 'explain':
      return `Explain the following text in simple, clear terms:\n\n${q}`;
    default:
      return text;
  }
}

// ── Inference via background port ─────────────────────────────────────────────
function startInference(
  prompt: string,
  onToken: (chunk: string) => void,
  onDone: () => void,
  onError: (msg: string) => void,
): () => void {
  let port: chrome.runtime.Port | null = null;
  let done = false;

  try {
    port = chrome.runtime.connect({ name: 'inference' });

    port.onMessage.addListener((msg: { type: string; chunk?: string; message?: string }) => {
      if (done) return;
      if (msg.type === 'TOKEN' && msg.chunk) {
        onToken(msg.chunk);
      } else if (msg.type === 'DONE') {
        done = true;
        onDone();
        port?.disconnect();
      } else if (msg.type === 'UNAVAILABLE') {
        done = true;
        onError('AI model unavailable. Open NanoChat to download it first.');
        port?.disconnect();
      } else if (msg.type === 'ERROR') {
        done = true;
        onError(msg.message ?? 'Inference failed');
        port?.disconnect();
      }
    });

    port.onDisconnect.addListener(() => {
      if (!done) {
        done = true;
        onError('Connection lost');
      }
    });

    port.postMessage({ type: 'START', prompt });
  } catch (e) {
    onError(String(e));
  }

  return () => {
    done = true;
    port?.disconnect();
    port = null;
  };
}

// ── Lang panel helpers ────────────────────────────────────────────────────────
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
  const spaceAbove = tbTop;
  if (spaceAbove >= LANG_PANEL_H + LANG_PANEL_GAP) {
    langPanelEl.style.top = `${tbTop - LANG_PANEL_H - LANG_PANEL_GAP}px`;
  } else {
    langPanelEl.style.top = `${tbTop + TOOLBAR_H + LANG_PANEL_GAP}px`;
  }
  langPanelEl.style.left = `${tbCenterX}px`;
}

function openLangPanel(caller: 'toolbar' | 'rcard'): void {
  langPanelOpen = true;
  langPanelCaller = caller;
  langPanelEl?.classList.remove('hidden');
  if (caller === 'toolbar') {
    toolbarEl?.querySelector('[data-action="translate"]')?.classList.add('active');
  }
  positionLangPanel();
}

function closeLangPanel(): void {
  langPanelOpen = false;
  langPanelEl?.classList.add('hidden');
  toolbarEl?.querySelector('[data-action="translate"]')?.classList.remove('active');
}

// ── Result card ───────────────────────────────────────────────────────────────
function showResultCard(action: string, text: string, targetLang?: string): void {
  if (!rcardEl || !rcardTextEl || !rcardErrorEl || !rcardDotsEl || !rcardFooterEl) return;

  rcardAction = action;
  rcardOriginalText = text;

  // Header: action label
  if (rcardActionLabelEl) rcardActionLabelEl.textContent = ACTION_LABELS[action] ?? action;

  // Header: lang selector visibility (translate only)
  if (rcardLangWrapEl) {
    rcardLangWrapEl.style.display = action === 'translate' ? 'flex' : 'none';
    rcardLangWrapEl.querySelector('.rcard-lang-name')!.textContent =
      targetLang ?? selectedLang;
  }

  // Source preview
  const sourceEl = rcardEl.querySelector('.rcard-source') as HTMLElement;
  if (sourceEl) sourceEl.textContent = text.length > 80 ? text.slice(0, 80) + '…' : text;

  // Reset body
  rcardTextEl.textContent = '';
  rcardErrorEl.textContent = '';
  rcardErrorEl.style.display = 'none';
  rcardDotsEl.style.display = 'flex';
  rcardFooterEl.style.display = 'none';

  // Position card: prefer opening above toolbar, but if there is not enough
  // space (e.g. near top of page), open below so it can grow up to 50vh.
  const cardBottomY = tbTop + TOOLBAR_H;
  const viewportHalf = Math.floor(window.innerHeight * 0.5);
  const margin = 12;
  const spaceAbove = Math.max(0, tbTop - margin);
  const spaceBelow = Math.max(0, window.innerHeight - cardBottomY - margin);
  const openBelow = spaceAbove < viewportHalf && spaceBelow > spaceAbove;
  const RCARD_W = 380;
  const left = Math.max(8, Math.min(tbCenterX - RCARD_W / 2, window.innerWidth - RCARD_W - 8));
  rcardEl.style.left = `${left}px`;
  if (openBelow) {
    rcardEl.style.top = `${cardBottomY}px`;
    rcardEl.style.bottom = 'auto';
    rcardEl.style.maxHeight = `${Math.max(180, Math.min(viewportHalf, spaceBelow))}px`;
  } else {
    rcardEl.style.bottom = `${window.innerHeight - cardBottomY}px`;
    rcardEl.style.top = 'auto';
    rcardEl.style.maxHeight = `${Math.max(180, Math.min(viewportHalf, spaceAbove))}px`;
  }

  rcardEl.classList.remove('hidden');

  // Start inference
  abortInference?.();
  const prompt = buildPrompt(action, text, targetLang ?? selectedLang);
  abortInference = startInference(
    prompt,
    (chunk) => {
      if (!rcardTextEl) return;
      rcardDotsEl!.style.display = 'none';
      rcardTextEl.textContent += chunk;
    },
    () => {
      if (!rcardDotsEl || !rcardFooterEl) return;
      rcardDotsEl.style.display = 'none';
      rcardFooterEl.style.display = 'flex';
    },
    (msg) => {
      if (!rcardErrorEl || !rcardDotsEl) return;
      rcardDotsEl.style.display = 'none';
      rcardErrorEl.textContent = msg;
      rcardErrorEl.style.display = 'block';
      rcardFooterEl!.style.display = 'flex';
    },
  );
}

function hideResultCard(): void {
  abortInference?.();
  abortInference = null;
  rcardEl?.classList.add('hidden');
}

// ── Toolbar & lang panel builders ─────────────────────────────────────────────
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
      `${ICON_GLOBE}<span class="trans-label">Translate</span><span class="arrow-icon">${ICON_ARROW_DOWN}</span>`,
      'Translate',
      'translate',
    ),
  );
  tb.appendChild(makeDivider());
  tb.appendChild(makeBtn(ICON_LIST, 'Summarize', 'summarize'));
  tb.appendChild(makeBtn(ICON_PENCIL, 'Rewrite', 'rewrite'));
  tb.appendChild(makeBtn('<span class="text-icon">Aa</span>', 'Spell check', 'spellcheck'));
  tb.appendChild(
    makeBtn('<span class="text-icon" style="font-size:15px;font-weight:700">?</span>', 'Explain', 'explain'),
  );
  tb.appendChild(makeDivider());

  const iconUrl = chrome.runtime.getURL('icons/icon-48.png');
  tb.appendChild(makeBtn(`<img src="${iconUrl}" alt="">`, 'Ask NanoChat', 'ask'));

  tb.addEventListener('click', (e) => {
    const btn = (e.target as Element).closest('[data-action]') as HTMLElement | null;
    if (!btn) return;
    const action = btn.dataset.action!;

    if (action === 'translate') {
      langPanelOpen ? closeLangPanel() : openLangPanel('toolbar');
      return;
    }

    if (action === 'ask') {
      const text = currentText;
      hide();
      window.getSelection()?.removeAllRanges();
      // Open sidepanel with pre-filled input
      chrome.runtime.sendMessage({ type: 'OPEN_WITH_SELECTION', text, action: 'ask' });
      return;
    }

    const text = currentText;
    toolbarEl?.classList.add('hidden');
    window.getSelection()?.removeAllRanges();
    showResultCard(action, text);
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
      setActiveLang(name);
      const caller = langPanelCaller;
      closeLangPanel();

      if (caller === 'rcard') {
        // Re-run translation with new language
        if (rcardLangWrapEl) rcardLangWrapEl.querySelector('.rcard-lang-name')!.textContent = name;
        showResultCard('translate', rcardOriginalText, name);
      } else {
        const text = currentText;
        toolbarEl?.classList.add('hidden');
        window.getSelection()?.removeAllRanges();
        showResultCard('translate', text, name);
      }
    });

    panel.appendChild(item);
  });

  return panel;
}

function buildResultCard(): HTMLElement {
  const iconUrl = chrome.runtime.getURL('icons/icon-48.png');
  const card = document.createElement('div');
  card.className = 'rcard hidden';

  // Header
  const hdr = document.createElement('div');
  hdr.className = 'rcard-hdr';

  const logo = document.createElement('img');
  logo.className = 'rcard-logo';
  logo.src = iconUrl;
  logo.alt = '';

  const actionLabel = document.createElement('div');
  actionLabel.className = 'rcard-action';
  rcardActionLabelEl = actionLabel;
  const actionText = document.createElement('span');
  actionText.textContent = 'Summarize';
  const actionArrow = document.createElement('span');
  actionArrow.innerHTML = ICON_ARROW_DOWN;
  actionArrow.style.opacity = '0.5';
  actionLabel.appendChild(actionText);
  rcardActionLabelEl = actionText as HTMLElement;
  actionLabel.appendChild(actionArrow);

  actionLabel.addEventListener('click', () => {
    if (rcardAction === 'translate') openLangPanel('rcard');
  });

  const spacer = document.createElement('div');
  spacer.className = 'rcard-spacer';

  // Language selector (translate only)
  const langWrap = document.createElement('div');
  langWrap.className = 'rcard-lang-wrap';
  langWrap.style.display = 'none';
  const langName = document.createElement('span');
  langName.className = 'rcard-lang-name';
  langName.textContent = 'English';
  const langArrow = document.createElement('span');
  langArrow.innerHTML = ICON_ARROW_DOWN;
  langArrow.style.opacity = '0.55';
  langWrap.appendChild(langName);
  langWrap.appendChild(langArrow);
  langWrap.addEventListener('click', () => openLangPanel('rcard'));
  rcardLangWrapEl = langWrap;

  // Sparkle button (visual only)
  const sparkleBtn = document.createElement('div');
  sparkleBtn.className = 'rcard-hdr-btn';
  sparkleBtn.innerHTML = ICON_SPARKLE;
  sparkleBtn.style.color = '#aaa';

  // Close button
  const closeBtn = document.createElement('div');
  closeBtn.className = 'rcard-hdr-btn';
  closeBtn.innerHTML = ICON_CLOSE;
  closeBtn.addEventListener('click', () => {
    hideResultCard();
    currentText = '';
  });

  hdr.appendChild(logo);
  hdr.appendChild(actionLabel);
  hdr.appendChild(spacer);
  hdr.appendChild(langWrap);
  hdr.appendChild(sparkleBtn);
  hdr.appendChild(closeBtn);

  // Source preview
  const source = document.createElement('div');
  source.className = 'rcard-source';

  // Body
  const body = document.createElement('div');
  body.className = 'rcard-body';

  const dots = document.createElement('div');
  dots.className = 'rcard-dots';
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('div');
    dot.className = 'rcard-dot';
    dots.appendChild(dot);
  }
  rcardDotsEl = dots;

  const text = document.createElement('div');
  text.className = 'rcard-text';
  rcardTextEl = text;

  const error = document.createElement('div');
  error.className = 'rcard-error';
  error.style.display = 'none';
  rcardErrorEl = error;

  body.appendChild(dots);
  body.appendChild(text);
  body.appendChild(error);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'rcard-footer';
  footer.style.display = 'none';
  rcardFooterEl = footer;

  const continueBtn = document.createElement('button');
  continueBtn.className = 'rcard-continue';
  const contIcon = document.createElement('img');
  contIcon.src = iconUrl;
  contIcon.alt = '';
  const contLabel = document.createElement('span');
  contLabel.textContent = 'Continue in Chat';
  continueBtn.appendChild(contIcon);
  continueBtn.appendChild(contLabel);
  continueBtn.addEventListener('click', () => {
    const text = rcardOriginalText;
    hideResultCard();
    currentText = '';
    chrome.runtime.sendMessage({ type: 'OPEN_WITH_SELECTION', text, action: 'ask' });
  });
  footer.appendChild(continueBtn);

  card.appendChild(hdr);
  card.appendChild(source);
  card.appendChild(body);
  card.appendChild(footer);

  return card;
}

// ── Host & shadow DOM setup ───────────────────────────────────────────────────
function ensureHost(): void {
  if (document.getElementById(HOST_ID)) return;

  const hostEl = document.createElement('div');
  hostEl.id = HOST_ID;
  hostEl.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483647;pointer-events:none;';
  document.body.appendChild(hostEl);

  const shadow = hostEl.attachShadow({ mode: 'open' });

  shadow.addEventListener('mousedown', (e) => {
    e.preventDefault();
    _blockNextDocMousedown = true;
  });

  const style = document.createElement('style');
  style.textContent = STYLES;
  shadow.appendChild(style);

  toolbarEl = buildToolbar();
  langPanelEl = buildLangPanel();
  rcardEl = buildResultCard();

  shadow.appendChild(toolbarEl);
  shadow.appendChild(langPanelEl);
  shadow.appendChild(rcardEl);
}

function show(centerX: number, selectionTop: number, text: string): void {
  ensureHost();
  if (!toolbarEl) return;

  const isNewSelection = text !== currentText;

  currentText = text;
  tbCenterX = centerX;
  tbTop = selectionTop - TOOLBAR_H - TOOLBAR_GAP;

  // Close lang panel only on new selection (not on re-show from same selection)
  if (isNewSelection && langPanelOpen) closeLangPanel();

  toolbarEl.style.left = `${tbCenterX}px`;
  toolbarEl.style.top = `${tbTop}px`;
  toolbarEl.classList.remove('hidden');
}

function hide(): void {
  toolbarEl?.classList.add('hidden');
  closeLangPanel();
  hideResultCard();
  currentText = '';
}

export function initSelectionPopup(): void {
  document.addEventListener('mouseup', (e) => {
    if (e.button !== 0) return;

    requestAnimationFrame(() => {
      const selection = window.getSelection();
      const text = selection?.toString().trim() ?? '';

      if (text.length < 2 || !selection || selection.rangeCount === 0) {
        // Don't hide if result card is visible (user clicking inside it)
        if (!rcardEl || rcardEl.classList.contains('hidden')) hide();
        return;
      }

      const rect = selection.getRangeAt(0).getBoundingClientRect();
      if (!rect.width && !rect.height) {
        if (!rcardEl || rcardEl.classList.contains('hidden')) hide();
        return;
      }

      // Only show toolbar if result card is not visible
      if (!rcardEl || rcardEl.classList.contains('hidden')) {
        show(rect.left + rect.width / 2, rect.top, text);
      }
    });
  });

  document.addEventListener('mousedown', () => {
    if (_blockNextDocMousedown) {
      _blockNextDocMousedown = false;
      return;
    }
    hide();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hide();
  });
  document.addEventListener('scroll', () => hide(), { capture: true });
}

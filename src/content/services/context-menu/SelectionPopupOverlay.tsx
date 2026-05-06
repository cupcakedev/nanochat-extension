import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ACTION_LABELS, getLangCode, HOST_ID, LANGUAGES, LANG_PANEL_GAP, LANG_PANEL_H, TOOLBAR_GAP, TOOLBAR_H } from './constants';
import { ICON_ARROW_DOWN, ICON_CLOSE, ICON_GLOBE, ICON_LIST, ICON_PENCIL } from './icons';
import { startInference } from './inference';
import { buildPrompt } from './prompt';
import { POPUP_STYLES } from './styles';
import type { PopupAction } from './types';

interface Anchor { centerX: number; top: number }
const STORAGE_KEY_SELECTED_LANG = 'contextMenuSelectedLanguage';

function findSelectionFromComposedPath(path: EventTarget[]): Selection | null {
  for (const node of path) {
    if (!(node instanceof Node)) continue;
    const root = node.getRootNode();
    const shadowRoot = root as ShadowRoot & { getSelection?: () => Selection | null };
    if (root instanceof ShadowRoot && typeof shadowRoot.getSelection === 'function') {
      const selection = shadowRoot.getSelection();
      if (selection?.rangeCount) return selection;
    }
  }
  const docSelection = window.getSelection();
  if (docSelection?.rangeCount) return docSelection;
  return null;
}

function parseRgbColor(value: string): [number, number, number] | null {
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function resolveSurfaceColor(): [number, number, number] {
  const candidates = [document.body, document.documentElement].filter(Boolean) as HTMLElement[];
  for (const el of candidates) {
    const rgb = parseRgbColor(getComputedStyle(el).backgroundColor);
    if (!rgb) continue;
    if (rgb[0] === 0 && rgb[1] === 0 && rgb[2] === 0 && getComputedStyle(el).backgroundColor.includes('0)')) {
      continue;
    }
    return rgb;
  }
  return [255, 255, 255];
}

function isDarkSurface(): boolean {
  const [r, g, b] = resolveSurfaceColor();
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance < 0.5;
}

function useShadowHost(): ShadowRoot | null {
  const [shadow, setShadow] = useState<ShadowRoot | null>(null);
  useEffect(() => {
    let host = document.getElementById(HOST_ID) as HTMLDivElement | null;
    if (!host) {
      host = document.createElement('div');
      host.id = HOST_ID;
      host.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483647;pointer-events:none;';
      document.body.appendChild(host);
    }
    const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    if (!root.querySelector('style[data-nc-popup]')) {
      const style = document.createElement('style');
      style.dataset.ncPopup = 'true';
      style.textContent = POPUP_STYLES;
      root.appendChild(style);
    }
    setShadow(root);
    return () => {
      host?.remove();
    };
  }, []);
  return shadow;
}

export function SelectionPopupOverlay() {
  const shadow = useShadowHost();
  const [currentText, setCurrentText] = useState('');
  const [selectedLang, setSelectedLang] = useState('English');
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);
  const [langPanelOpen, setLangPanelOpen] = useState(false);
  const [langCaller, setLangCaller] = useState<'toolbar' | 'rcard'>('toolbar');
  const [anchor, setAnchor] = useState<Anchor>({ centerX: 0, top: 0 });
  const [action, setAction] = useState<PopupAction>('summarize');
  const [sourceText, setSourceText] = useState('');
  const [resultText, setResultText] = useState('');
  const [errorText, setErrorText] = useState('');
  const [loading, setLoading] = useState(false);
  const [darkTheme, setDarkTheme] = useState(false);
  const abortRef = useRef<(() => void) | null>(null);

  const iconUrl = useMemo(() => chrome.runtime.getURL('icons/icon-48.png'), []);
  const toolbarTop = anchor.top - TOOLBAR_H - TOOLBAR_GAP;
  const toolbarLayerVisible = toolbarVisible && !cardVisible;

  useEffect(() => {
    void chrome.storage.local
      .get(STORAGE_KEY_SELECTED_LANG)
      .then((result) => {
        const value = result[STORAGE_KEY_SELECTED_LANG];
        if (typeof value === 'string' && value.trim()) {
          setSelectedLang(value);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void chrome.storage.local
      .set({ [STORAGE_KEY_SELECTED_LANG]: selectedLang })
      .catch(() => undefined);
  }, [selectedLang]);

  const hideAll = useCallback(() => {
    setToolbarVisible(false);
    setLangPanelOpen(false);
    setCardVisible(false);
    setCurrentText('');
    abortRef.current?.();
    abortRef.current = null;
  }, []);

  const runAction = useCallback((nextAction: PopupAction, text: string, lang?: string) => {
    setAction(nextAction);
    setSourceText(text);
    setResultText('');
    setErrorText('');
    setLoading(true);
    setToolbarVisible(false);
    setCardVisible(true);
    abortRef.current?.();
    abortRef.current = startInference(
      buildPrompt(nextAction, text, lang ?? selectedLang),
      (chunk) => {
        setLoading(false);
        setResultText((prev) => prev + chunk);
      },
      () => {
        setLoading(false);
      },
      (msg) => {
        setLoading(false);
        setErrorText(msg);
      },
    );
  }, [selectedLang]);

  useEffect(() => {
    const onMouseUp = (e: MouseEvent) => {
      if (e.button !== 0) return;
      requestAnimationFrame(() => {
        const selection = findSelectionFromComposedPath(e.composedPath());
        const text = selection?.toString().trim() ?? '';
        if (text.length < 2 || !selection || selection.rangeCount === 0) return;
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        if (!rect.width && !rect.height) return;
        if (cardVisible) return;
        setCurrentText(text);
        setAnchor({ centerX: rect.left + rect.width / 2, top: rect.top });
        setDarkTheme(isDarkSurface());
        setToolbarVisible(true);
      });
    };

    const onMouseDown = (e: MouseEvent) => {
      const path = e.composedPath() as EventTarget[];
      const clickedInside = path.some((node) => node instanceof HTMLElement && (node.classList?.contains('toolbar') || node.classList?.contains('lang-panel') || node.classList?.contains('rcard')));
      if (!clickedInside) hideAll();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideAll();
    };

    const onScroll = () => {
      if (langPanelOpen) setLangPanelOpen(false);
      if (!toolbarVisible && !cardVisible) return;
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      if (rect.width || rect.height) {
        setAnchor({ centerX: rect.left + rect.width / 2, top: rect.top });
      }
    };

    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('scroll', onScroll, { capture: true });
    return () => {
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('scroll', onScroll, { capture: true });
    };
  }, [cardVisible, hideAll, langPanelOpen, toolbarVisible]);

  useEffect(() => () => abortRef.current?.(), []);

  if (!shadow) return null;

  const langTop = toolbarTop >= LANG_PANEL_H + LANG_PANEL_GAP
    ? toolbarTop - LANG_PANEL_H - LANG_PANEL_GAP
    : toolbarTop + TOOLBAR_H + LANG_PANEL_GAP;

  const cardBottomY = toolbarTop + TOOLBAR_H;
  const viewportHalf = Math.floor(window.innerHeight * 0.5);
  const margin = 12;
  const spaceAbove = Math.max(0, toolbarTop - margin);
  const spaceBelow = Math.max(0, window.innerHeight - cardBottomY - margin);
  const openBelow = spaceAbove < viewportHalf && spaceBelow > spaceAbove;
  const left = Math.max(8, Math.min(anchor.centerX - 190, window.innerWidth - 388));
  const cardStyle: React.CSSProperties = openBelow
    ? { left, top: cardBottomY, maxHeight: Math.max(180, Math.min(viewportHalf, spaceBelow)) }
    : { left, bottom: window.innerHeight - cardBottomY, maxHeight: Math.max(180, Math.min(viewportHalf, spaceAbove)) };

  return createPortal(
    <>
      <style>
        {darkTheme
          ? `
          .toolbar{background:#16181d;box-shadow:0 6px 26px rgba(0,0,0,.42),0 0 0 1px rgba(255,255,255,.08);}
          .tool-btn{color:#c8cdd8;}
          .tool-btn:hover{background:#252a33;color:#f3f5f9;}
          .tool-btn.active{color:#8ab4ff;background:#1d2a43;}
          .divider{background:#313845;}
          .lang-panel,.rcard{background:#16181d;box-shadow:0 8px 30px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.08);}
          .lang-item:hover,.rcard-lang-wrap:hover,.rcard-hdr-btn:hover{background:#252a33;}
          .lang-item.active{color:#8ab4ff;}
          .lang-native,.rcard-source{color:#95a0b1;}
          .rcard-hdr{border-bottom-color:#2a303c;}
          .rcard-action,.rcard-text{color:#e8ecf3;}
          .rcard-footer{border-top-color:#2a303c;}
          .rcard-continue{background:#1f3a65;color:#b8d0ff;}
        `
          : ''}
      </style>
      <div
        className={`toolbar ${toolbarLayerVisible ? '' : 'hidden'}`}
        style={{ left: anchor.centerX, top: toolbarTop }}
      >
        <button className="tool-btn" onClick={() => runAction('translate', currentText, selectedLang)}>
          <span dangerouslySetInnerHTML={{ __html: ICON_GLOBE }} />
          <span className="trans-label">Translate</span>
        </button>
        <button className={`tool-btn ${langPanelOpen ? 'active' : ''}`} onClick={() => { setLangCaller('toolbar'); setLangPanelOpen((v) => !v); }}>
          <span className="trans-label">{getLangCode(selectedLang)}</span>
          <span className="arrow-icon" dangerouslySetInnerHTML={{ __html: ICON_ARROW_DOWN }} />
        </button>
        <div className="divider" />
        <button className="tool-btn" onClick={() => runAction('summarize', currentText)}><span dangerouslySetInnerHTML={{ __html: ICON_LIST }} /></button>
        <button className="tool-btn" onClick={() => runAction('rewrite', currentText)}><span dangerouslySetInnerHTML={{ __html: ICON_PENCIL }} /></button>
        <button className="tool-btn" onClick={() => runAction('spellcheck', currentText)}><span className="text-icon">Aa</span></button>
        <button className="tool-btn" onClick={() => runAction('explain', currentText)}><span className="text-icon">?</span></button>
        <div className="divider" />
        <button className="tool-btn" onClick={() => { hideAll(); window.getSelection()?.removeAllRanges(); chrome.runtime.sendMessage({ type: 'OPEN_WITH_SELECTION', text: currentText, action: 'ask' }); }}>
          <img src={iconUrl} alt="" />
        </button>
      </div>

      <div
        className={`lang-panel ${langPanelOpen && toolbarLayerVisible ? '' : 'hidden'}`}
        style={{ left: anchor.centerX, top: langTop }}
      >
        {LANGUAGES.map((lang) => (
          <div
            key={lang.name}
            className={`lang-item ${selectedLang === lang.name ? 'active' : ''}`}
            onClick={() => {
              setSelectedLang(lang.name);
              setLangPanelOpen(false);
              if (langCaller === 'rcard') runAction('translate', sourceText, lang.name);
            }}
          >
            <div className="lang-info"><span className="lang-name">{lang.name}</span><span className="lang-native">{lang.native}</span></div>
            <span className="lang-check" style={{ display: selectedLang === lang.name ? '' : 'none' }}>✓</span>
          </div>
        ))}
      </div>

      <div className={`rcard ${cardVisible ? '' : 'hidden'}`} style={cardStyle}>
        <div className="rcard-hdr">
          <img className="rcard-logo" src={iconUrl} alt="" />
          <div className="rcard-action">{ACTION_LABELS[action]}</div>
          <div className="rcard-spacer" />
          {action === 'translate' && (
            <div className="rcard-lang-wrap" onClick={() => { setLangCaller('rcard'); setLangPanelOpen((v) => !v); }}>
              <span>{selectedLang}</span><span className="arrow-icon" dangerouslySetInnerHTML={{ __html: ICON_ARROW_DOWN }} />
            </div>
          )}
          <button className="rcard-hdr-btn" onClick={hideAll}><span dangerouslySetInnerHTML={{ __html: ICON_CLOSE }} /></button>
        </div>
        <div className="rcard-source">{sourceText.length > 80 ? `${sourceText.slice(0, 80)}…` : sourceText}</div>
        <div className="rcard-body">
          {loading && !resultText ? <div className="rcard-text">Generating...</div> : null}
          {resultText ? <div className="rcard-text">{resultText}</div> : null}
          {errorText ? <div className="rcard-error">{errorText}</div> : null}
        </div>
        <div className="rcard-footer">
          <button
            className="rcard-continue"
            onClick={() => {
              if (!resultText.trim()) return;
              chrome.runtime.sendMessage({
                type: 'OPEN_WITH_CHAT_SEED',
                userMessage: buildPrompt(action, sourceText, selectedLang),
                assistantMessage: resultText.trim(),
              });
              hideAll();
            }}
          >
            <img src={iconUrl} alt="" />
            <span>Continue in Chat</span>
          </button>
        </div>
      </div>
    </>,
    shadow,
  );
}

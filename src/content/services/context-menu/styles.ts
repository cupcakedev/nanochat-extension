export const POPUP_STYLES = `
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
  .hidden { display: none !important; }
  @keyframes nc-pop {
    from { opacity: 0; transform: translateX(-50%) scale(0.9); }
    to   { opacity: 1; transform: translateX(-50%) scale(1); }
  }
  .tool-btn {
    display: flex; align-items: center; justify-content: center;
    min-width: 32px; height: 32px; border-radius: 16px;
    cursor: pointer; color: #555; position: relative;
    transition: background 0.1s, color 0.1s; padding: 0 7px; gap: 4px;
    border: none; background: transparent;
  }
  .tool-btn:hover { background: #f0f0f0; color: #111; }
  .tool-btn.active { color: #1a73e8; background: #e8f0fe; }
  .trans-label { font-size: 13px; font-weight: 500; letter-spacing: -0.01em; }
  .text-icon { font-size: 13px; font-weight: 600; letter-spacing: -0.02em; }
  .arrow-icon { display: flex; opacity: 0.55; }
  .tool-btn img { width: 20px; height: 20px; border-radius: 5px; display: block; }
  .divider { width: 1px; height: 18px; background: #e5e5e5; margin: 0 2px; flex-shrink: 0; }

  .lang-panel {
    position: absolute; background: #fff; border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.06);
    padding: 5px 0; width: 190px; max-height: 272px; overflow-y: auto;
    pointer-events: auto; transform: translateX(-50%);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  .lang-item { display: flex; align-items: center; padding: 7px 14px; cursor: pointer; }
  .lang-item:hover { background: #f5f5f5; }
  .lang-item.active { color: #1a73e8; }
  .lang-info { display: flex; flex-direction: column; flex: 1; }
  .lang-name { font-size: 13px; font-weight: 500; }
  .lang-native { font-size: 11px; color: #999; margin-top: 1px; }
  .lang-check { font-size: 13px; color: #1a73e8; font-weight: 700; margin-left: 6px; }

  .rcard {
    position: absolute; background: #fff; border-radius: 16px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06);
    width: 380px; max-width: calc(100vw - 24px); max-height: 50vh;
    display: flex; flex-direction: column;
    pointer-events: auto; overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  .rcard-hdr { display:flex; align-items:center; gap:7px; padding:10px 12px; border-bottom:1px solid #f0f0f0; }
  .rcard-logo { width:22px; height:22px; border-radius:5px; }
  .rcard-action { display:flex; align-items:center; gap:3px; font-size:14px; font-weight:600; }
  .rcard-spacer { flex:1; }
  .rcard-lang-wrap { display:flex; align-items:center; gap:3px; font-size:13px; color:#555; cursor:pointer; padding:3px 6px; border-radius:8px; }
  .rcard-lang-wrap:hover { background:#f0f0f0; }
  .rcard-hdr-btn { display:flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:50%; border:none; background:transparent; color:#888; cursor:pointer; }
  .rcard-source { padding: 8px 14px 0; font-size:12px; color:#999; line-height:1.5; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .rcard-body { padding:8px 14px 12px; min-height:44px; flex:1 1 auto; overflow-y:auto; }
  .rcard-text { font-size:14px; line-height:1.65; color:#1a1a1a; white-space:pre-wrap; word-break:break-word; }
  .rcard-error { font-size:13px; color:#d93025; line-height:1.5; }
  .rcard-footer { padding:8px 14px 12px; display:flex; justify-content:center; border-top:1px solid #f0f0f0; }
  .rcard-continue { display:flex; align-items:center; gap:8px; padding:8px 22px; background:#eef2ff; border:none; border-radius:20px; cursor:pointer; font-size:13px; font-weight:500; color:#3b6ef8; }
  .rcard-continue img { width:18px; height:18px; border-radius:4px; }
`;

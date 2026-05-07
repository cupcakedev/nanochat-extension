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

  .tool-btn[data-tooltip]::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: calc(100% + 7px);
    left: 50%;
    transform: translateX(-50%);
    background: rgba(20,20,24,0.88);
    color: #fff;
    font-size: 11px;
    font-weight: 500;
    line-height: 1;
    padding: 5px 8px;
    border-radius: 6px;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.1s;
    z-index: 1;
  }
  .tool-btn[data-tooltip]:hover::after {
    opacity: 1;
    transition-delay: 0.5s;
  }

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
  .rcard-text { font-size:14px; line-height:1.65; color:#1a1a1a; word-break:break-word; }
  .rcard-text p { margin:0 0 8px; }
  .rcard-text p:last-child { margin-bottom:0; }
  .rcard-text h1,.rcard-text h2,.rcard-text h3,.rcard-text h4 { font-weight:600; margin:12px 0 4px; }
  .rcard-text h1:first-child,.rcard-text h2:first-child,.rcard-text h3:first-child,.rcard-text h4:first-child { margin-top:0; }
  .rcard-text h1 { font-size:15px; }
  .rcard-text h2 { font-size:14px; }
  .rcard-text h3,.rcard-text h4 { font-size:13px; }
  .rcard-text ul,.rcard-text ol { margin:0 0 8px; padding-left:20px; }
  .rcard-text ul { list-style:disc; }
  .rcard-text ol { list-style:decimal; }
  .rcard-text li { margin:2px 0; }
  .rcard-text code { background:rgba(0,0,0,0.07); border-radius:4px; padding:1px 5px; font-size:12px; font-family:'SF Mono',Consolas,monospace; }
  .rcard-text pre { background:rgba(0,0,0,0.06); border-radius:8px; padding:10px 12px; margin:8px 0; overflow-x:auto; }
  .rcard-text pre code { background:transparent; padding:0; }
  .rcard-text blockquote { border-left:2px solid #d0d0d0; padding-left:10px; margin:8px 0; opacity:0.75; }
  .rcard-text a { text-decoration:underline; color:#1a73e8; }
  .rcard-text strong { font-weight:600; }
  .rcard-text em { font-style:italic; }
  .rcard-text hr { border:none; border-top:1px solid #e0e0e0; margin:8px 0; }
  .rcard-text table { width:100%; font-size:12px; border-collapse:collapse; margin:8px 0; }
  .rcard-text th,.rcard-text td { padding:4px 8px; border:1px solid #e0e0e0; text-align:left; }
  .rcard-text th { font-weight:600; background:rgba(0,0,0,0.04); }
  .rcard-error { font-size:13px; color:#d93025; line-height:1.5; }
  .rcard-footer { padding:8px 14px 12px; display:flex; justify-content:center; border-top:1px solid #f0f0f0; }
  .rcard-continue { display:flex; align-items:center; gap:8px; padding:8px 22px; background:#eef2ff; border:none; border-radius:20px; cursor:pointer; font-size:13px; font-weight:500; color:#3b6ef8; }
  .rcard-continue img { width:18px; height:18px; border-radius:4px; }
`;

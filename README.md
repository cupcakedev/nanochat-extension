# NanoChat Extension

NanoChat is an on-device Chrome extension with a sidepanel chat UI and an interactive browser-agent mode.

> Available on Chrome Web Store:  
> [Install NanoChat](https://chromewebstore.google.com/detail/nanochat/blpleeefgeopjgdgjelpldcabhipkjbd)

## Highlights

- On-device LLM chat using Chrome Prompt API
- Sidepanel React UI for chat and context controls
- Content script bridge for page context, interaction snapshots, and action execution
- Agent mode with screenshot + indexed element planning
- Local storage chat history sync across extension contexts

## Tech Stack

- TypeScript
- React + Vite
- Tailwind CSS
- Chrome Extension Manifest V3

## Project Structure

```text
src/
  sidepanel/   # Sidepanel UI, hooks, sidepanel services
  background/  # Service worker listeners
  content/     # Content script and page interaction runtime
  shared/      # Cross-context types, messaging, reusable services/constants
```

## Architecture Rules

- `shared` must not depend on `sidepanel`, `content`, or `background`
- `sidepanel` must not import from `content` or `background` directly
- `content` must not import from `sidepanel` or `background`
- `background` must not import from `sidepanel` or `content`

These boundaries are enforced in ESLint.

## Development

### Prerequisites

- Node.js 20+
- npm 10+
- Chrome 138+ (Prompt API support)

### Install

```bash
npm ci
```

### Scripts

```bash
npm run dev           # watch build for extension development
npm run build         # typecheck + production build
npm run lint          # eslint
npm run lint:fix      # eslint --fix
npm run format        # prettier write
npm run format:check  # prettier check
```

### Load in Chrome

1. Run `npm run dev` or `npm run build`.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Click **Load unpacked** and select the `dist/` directory.

## Open Source

- License: [MIT](./LICENSE)
- Contributing guide: [CONTRIBUTING.md](./CONTRIBUTING.md)

## Roadmap Gaps

Current known gap for OSS maturity: automated tests are not yet present. Contributions adding unit/integration tests are welcome.

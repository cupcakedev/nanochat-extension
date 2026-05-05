import { TEXT_LANGUAGE_MODEL_OPTIONS } from '@shared/constants';

export const onInferenceConnect = (port: chrome.runtime.Port) => {
  if (port.name !== 'inference') return;

  let reader: ReadableStreamDefaultReader<string> | null = null;
  let session: LanguageModel | null = null;

  const cleanup = () => {
    reader?.cancel().catch(() => {});
    reader = null;
    session?.destroy();
    session = null;
  };

  port.onDisconnect.addListener(cleanup);

  port.onMessage.addListener(async (msg: { type: string; prompt?: string }) => {
    if (msg.type !== 'START' || !msg.prompt) return;

    cleanup();

    if (typeof LanguageModel === 'undefined') {
      port.postMessage({ type: 'UNAVAILABLE' });
      return;
    }

    try {
      session = await LanguageModel.create(TEXT_LANGUAGE_MODEL_OPTIONS);
      const stream = session.promptStreaming(msg.prompt);
      reader = stream.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) port.postMessage({ type: 'TOKEN', chunk: value });
      }

      port.postMessage({ type: 'DONE' });
    } catch (err) {
      try {
        port.postMessage({ type: 'ERROR', message: err instanceof Error ? err.message : String(err) });
      } catch {
        /* port may be disconnected */
      }
    } finally {
      cleanup();
    }
  });
};

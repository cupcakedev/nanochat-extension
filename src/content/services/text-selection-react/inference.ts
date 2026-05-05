export function startInference(
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

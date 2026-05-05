import { SelectionPopupOverlay } from '@content/services/context-menu/SelectionPopupOverlay';
import { useRuntimeMessageBridge } from './useRuntimeMessageBridge';

export function ContentApp() {
  useRuntimeMessageBridge();
  return <SelectionPopupOverlay />;
}

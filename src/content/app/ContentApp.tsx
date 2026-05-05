import { SelectionPopupOverlay } from '@content/services/text-selection-react/SelectionPopupOverlay';
import { useRuntimeMessageBridge } from './useRuntimeMessageBridge';

export function ContentApp() {
  useRuntimeMessageBridge();
  return <SelectionPopupOverlay />;
}

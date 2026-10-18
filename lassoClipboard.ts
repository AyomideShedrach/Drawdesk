export interface LassoClipboardData {
  dataUrl: string;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
}

let clipboard: LassoClipboardData | null = null;
const clipboardListeners = new Set<(hasContent: boolean) => void>();

let activeSelection = false;
const selectionListeners = new Set<(hasSelection: boolean) => void>();

export const getLassoClipboard = (): LassoClipboardData | null => clipboard;

export const setLassoClipboard = (data: LassoClipboardData | null) => {
  clipboard = data;
  clipboardListeners.forEach((fn) => fn(!!clipboard));
};

export const subscribeLassoClipboard = (fn: (hasContent: boolean) => void) => {
  clipboardListeners.add(fn);
  fn(!!clipboard);
  return () => {
    clipboardListeners.delete(fn);
  };
};

export const getHasActiveSelection = (): boolean => activeSelection;

export const setHasActiveSelection = (has: boolean) => {
  activeSelection = has;
  selectionListeners.forEach((fn) => fn(has));
};

export const subscribeActiveSelection = (fn: (has: boolean) => void) => {
  selectionListeners.add(fn);
  fn(activeSelection);
  return () => {
    selectionListeners.delete(fn);
  };
};

// Custom events to trigger actions from outside (e.g. ToolDock, keyboard, floating bars)
export const triggerLassoPaste = () => {
  window.dispatchEvent(new CustomEvent('storyboard:lasso-paste'));
};

export const triggerLassoApply = () => {
  window.dispatchEvent(new CustomEvent('storyboard:lasso-apply'));
};

export const triggerLassoCancel = () => {
  window.dispatchEvent(new CustomEvent('storyboard:lasso-cancel'));
};

export const triggerLassoDuplicate = () => {
  window.dispatchEvent(new CustomEvent('storyboard:lasso-duplicate'));
};

export const triggerLassoFlipH = () => {
  window.dispatchEvent(new CustomEvent('storyboard:lasso-fliph'));
};

export const triggerLassoFlipV = () => {
  window.dispatchEvent(new CustomEvent('storyboard:lasso-flipv'));
};

export const triggerLassoDelete = () => {
  window.dispatchEvent(new CustomEvent('storyboard:lasso-delete'));
};

export const triggerLassoCopy = () => {
  window.dispatchEvent(new CustomEvent('storyboard:lasso-copy'));
};

export const triggerLassoCut = () => {
  window.dispatchEvent(new CustomEvent('storyboard:lasso-cut'));
};

export const triggerZoomIn = () => {
  window.dispatchEvent(new CustomEvent('storyboard:zoom-in'));
};

export const triggerZoomOut = () => {
  window.dispatchEvent(new CustomEvent('storyboard:zoom-out'));
};

export const triggerZoomReset = () => {
  window.dispatchEvent(new CustomEvent('storyboard:zoom-reset'));
};

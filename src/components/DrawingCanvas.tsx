import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Frame, ToolSettings, OnionSkinSettings, PerspectiveConfig } from '../types/storyboard';
import { PerspectiveGridOverlay } from './PerspectiveGridOverlay';
import {
  RotateCw,
  Check,
  X,
  FlipHorizontal,
  FlipVertical,
  Trash2,
  Copy,
  Scissors,
  CopyPlus,
  ZoomIn,
  ZoomOut,
  Hand,
  RotateCcw,
  LassoSelect,
} from 'lucide-react';
import {
  getLassoClipboard,
  setLassoClipboard,
  LassoClipboardData,
  setHasActiveSelection,
} from '../utils/lassoClipboard';

interface DrawingCanvasProps {
  currentFrame: Frame;
  allFrames: Frame[];
  currentFrameIndex: number;
  toolSettings: ToolSettings;
  onionSettings: OnionSkinSettings;
  showFieldGrid: boolean;
  pegPosition: 'top' | 'bottom';
  onUpdateCanvas: (dataUrl: string) => void;
  undoTrigger: number;
  redoTrigger: number;
  clearTrigger?: number;
  canUndoChange: (can: boolean) => void;
  canRedoChange: (can: boolean) => void;
  perspectiveConfig: PerspectiveConfig;
  onUpdatePerspectiveConfig: (newConfig: Partial<PerspectiveConfig>) => void;
  theme: 'light' | 'dark';
}

interface Point {
  x: number;
  y: number;
  pressure?: number;
}

interface SelectionTransform {
  sourceCanvas: HTMLCanvasElement;
  dataUrl: string;
  originX: number;
  originY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
}

interface DragState {
  isDragging: boolean;
  mode: 'move' | 'rotate' | 'scale';
  handle?: string;
  startPointer: Point;
  startCenter: Point;
  startScale: Point;
  startRotation: number;
  startAngle: number;
  width: number;
  height: number;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  currentFrame,
  allFrames,
  currentFrameIndex,
  toolSettings,
  onionSettings,
  showFieldGrid,
  pegPosition,
  onUpdateCanvas,
  undoTrigger,
  redoTrigger,
  clearTrigger,
  canUndoChange,
  canRedoChange,
  perspectiveConfig,
  onUpdatePerspectiveConfig,
  theme,
}) => {
  const isDark = theme === 'dark';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const pointsRef = useRef<Point[]>([]);

  // History stack for Undo/Redo per frame - supports at least 50 redos and undos (up to 80 states)
  const MAX_HISTORY = 80;
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef<number>(-1);
  // Per-frame history cache so flipping frames never loses undo/redo history
  const frameHistoryMapRef = useRef<Map<string, { history: ImageData[]; index: number }>>(
    new Map()
  );

  // Logical canvas dimensions (16:9 standard high-def storyboard field)
  const logicalWidth = 960;
  const logicalHeight = 540;

  // Zoom & Pan states
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanToolActive, setIsPanToolActive] = useState<boolean>(false);
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ clientX: number; clientY: number; startPanX: number; startPanY: number }>({
    clientX: 0,
    clientY: 0,
    startPanX: 0,
    startPanY: 0,
  });

  const zoomLevels = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0];

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => {
      const next = zoomLevels.find((lvl) => lvl > prev + 0.05) ?? Math.min(4.0, prev + 0.25);
      return Math.round(next * 100) / 100;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => {
      const reversed = [...zoomLevels].reverse();
      const next = reversed.find((lvl) => lvl < prev - 0.05) ?? Math.max(0.5, prev - 0.25);
      return Math.round(next * 100) / 100;
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setIsPanToolActive(false);
  }, []);

  // Lasso selection & transform states
  const [lassoPoints, setLassoPoints] = useState<Point[]>([]);
  const isLassoDrawingRef = useRef(false);
  const [selection, setSelection] = useState<SelectionTransform | null>(null);
  const selectionRef = useRef<SelectionTransform | null>(null);
  selectionRef.current = selection;

  // Synchronize active selection state globally for UI & docks
  useEffect(() => {
    setHasActiveSelection(!!selection);
    return () => {
      setHasActiveSelection(false);
    };
  }, [selection]);

  const dragStateRef = useRef<DragState>({
    isDragging: false,
    mode: 'move',
    startPointer: { x: 0, y: 0 },
    startCenter: { x: 0, y: 0 },
    startScale: { x: 1, y: 1 },
    startRotation: 0,
    startAngle: 0,
    width: 0,
    height: 0,
  });

  // Track previous frame ID and canvas data
  const prevFrameIdRef = useRef<string | null>(null);
  const prevCanvasDataRef = useRef<string | null>(null);

  // Save current canvas state to history
  const pushHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // Slice off redo branches
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(imageData);
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    }
    historyIndexRef.current = historyRef.current.length - 1;

    // Cache per frame so switching frames never loses undo/redo history
    frameHistoryMapRef.current.set(currentFrame.id, {
      history: [...historyRef.current],
      index: historyIndexRef.current,
    });

    canUndoChange(historyIndexRef.current > 0);
    canRedoChange(false);

    // Notify parent
    const dataUrl = canvas.toDataURL('image/png');
    prevCanvasDataRef.current = dataUrl;
    onUpdateCanvas(dataUrl);
    window.dispatchEvent(new CustomEvent('storyboard:canvas-stroke-end'));
  }, [canUndoChange, canRedoChange, onUpdateCanvas, currentFrame.id]);

  // Load frame image onto active canvas
  const loadFrameImage = useCallback(
    (dataUrl: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      historyRef.current = [];
      historyIndexRef.current = -1;

      if (!dataUrl) {
        // Store initial blank state
        const blankData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        historyRef.current = [blankData];
        historyIndexRef.current = 0;
        frameHistoryMapRef.current.set(currentFrame.id, {
          history: [blankData],
          index: 0,
        });
        canUndoChange(false);
        canRedoChange(false);
        return;
      }

      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        historyRef.current = [initialData];
        historyIndexRef.current = 0;
        frameHistoryMapRef.current.set(currentFrame.id, {
          history: [initialData],
          index: 0,
        });
        canUndoChange(false);
        canRedoChange(false);
      };
      img.src = dataUrl;
    },
    [canUndoChange, canRedoChange, currentFrame.id]
  );

  // Commit any active transform back onto the main canvas
  const commitSelection = useCallback(() => {
    const active = selectionRef.current;
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.translate(active.centerX, active.centerY);
    ctx.rotate(active.rotation);
    ctx.scale(active.scaleX, active.scaleY);
    ctx.drawImage(
      active.sourceCanvas,
      -active.width / 2,
      -active.height / 2,
      active.width,
      active.height
    );
    ctx.restore();

    setSelection(null);
    pushHistory();
  }, [pushHistory]);

  useEffect(() => {
    const win = window as unknown as {
      __storyboard_drawing_canvas?: HTMLCanvasElement | null;
      __storyboard_flush_canvas?: () => string;
    };
    win.__storyboard_drawing_canvas = canvasRef.current;
    win.__storyboard_flush_canvas = () => {
      if (selectionRef.current) {
        commitSelection();
      }
      return canvasRef.current ? canvasRef.current.toDataURL('image/png') : '';
    };
    return () => {
      win.__storyboard_drawing_canvas = null;
      delete win.__storyboard_flush_canvas;
    };
  }, [commitSelection]);

  // Cancel transform & restore original cut pixels
  const cancelSelection = useCallback(() => {
    const active = selectionRef.current;
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.drawImage(active.sourceCanvas, active.originX, active.originY);
    ctx.restore();

    setSelection(null);
    onUpdateCanvas(canvas.toDataURL('image/png'));
  }, [onUpdateCanvas]);

  // Delete selection entirely without restoring
  const deleteSelection = useCallback(() => {
    const active = selectionRef.current;
    if (!active) return;
    setSelection(null);
    pushHistory();
  }, [pushHistory]);

  // Copy selection to clipboard
  const copySelection = useCallback(() => {
    const active = selectionRef.current;
    if (!active) return;
    setLassoClipboard({
      dataUrl: active.dataUrl,
      width: active.width,
      height: active.height,
      scaleX: active.scaleX,
      scaleY: active.scaleY,
      rotation: active.rotation,
    });
  }, []);

  // Cut selection to clipboard
  const cutSelection = useCallback(() => {
    const active = selectionRef.current;
    if (!active) return;
    copySelection();
    deleteSelection();
  }, [copySelection, deleteSelection]);

  // Duplicate selection
  const duplicateSelection = useCallback(() => {
    const active = selectionRef.current;
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Stamp current selection in place
    ctx.save();
    ctx.translate(active.centerX, active.centerY);
    ctx.rotate(active.rotation);
    ctx.scale(active.scaleX, active.scaleY);
    ctx.drawImage(
      active.sourceCanvas,
      -active.width / 2,
      -active.height / 2,
      active.width,
      active.height
    );
    ctx.restore();

    // Spawn duplicate offset slightly
    const offset = 24;
    setSelection({
      ...active,
      centerX: Math.min(logicalWidth - 60, active.centerX + offset),
      centerY: Math.min(logicalHeight - 60, active.centerY + offset),
    });
    pushHistory();
  }, [logicalWidth, logicalHeight, pushHistory]);

  // Paste from clipboard
  const pasteSelection = useCallback((clip?: LassoClipboardData) => {
    const dataToPaste = clip || getLassoClipboard();
    if (!dataToPaste) return;

    if (selectionRef.current) {
      commitSelection();
    }

    const img = new Image();
    img.onload = () => {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = dataToPaste.width;
      offCanvas.height = dataToPaste.height;
      const offCtx = offCanvas.getContext('2d');
      if (!offCtx) return;
      offCtx.drawImage(img, 0, 0);

      const centerX = logicalWidth / 2;
      const centerY = logicalHeight / 2;

      setSelection({
        sourceCanvas: offCanvas,
        dataUrl: dataToPaste.dataUrl,
        originX: centerX - dataToPaste.width / 2,
        originY: centerY - dataToPaste.height / 2,
        width: dataToPaste.width,
        height: dataToPaste.height,
        centerX,
        centerY,
        scaleX: dataToPaste.scaleX,
        scaleY: dataToPaste.scaleY,
        rotation: dataToPaste.rotation,
      });
    };
    img.src = dataToPaste.dataUrl;
  }, [commitSelection, logicalWidth, logicalHeight]);

  // Flip horizontal
  const flipHorizontal = useCallback(() => {
    setSelection((prev) => (prev ? { ...prev, scaleX: -prev.scaleX } : null));
  }, []);

  // Flip vertical
  const flipVertical = useCallback(() => {
    setSelection((prev) => (prev ? { ...prev, scaleY: -prev.scaleY } : null));
  }, []);

  // When frame changes or external canvas data updates, commit pending transform and load new image
  useEffect(() => {
    const isDifferentFrame = currentFrame.id !== prevFrameIdRef.current;

    if (isDifferentFrame) {
      if (selectionRef.current) {
        commitSelection();
      }
      prevFrameIdRef.current = currentFrame.id;
      prevCanvasDataRef.current = currentFrame.canvasData;

      // Check if we have cached history for this frame!
      const cached = frameHistoryMapRef.current.get(currentFrame.id);
      if (cached && cached.history.length > 0) {
        historyRef.current = [...cached.history];
        historyIndexRef.current = cached.index;
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx && historyRef.current[historyIndexRef.current]) {
            ctx.putImageData(historyRef.current[historyIndexRef.current], 0, 0);
          }
        }
        canUndoChange(historyIndexRef.current > 0);
        canRedoChange(historyIndexRef.current < historyRef.current.length - 1);
        return;
      }

      loadFrameImage(currentFrame.canvasData);
    } else {
      // Same frame: ONLY reload if external change happened that differs from our last generated canvas
      // and we have minimal history (e.g. project opened, pdf page imported)
      if (
        !isDrawingRef.current &&
        currentFrame.canvasData !== prevCanvasDataRef.current &&
        historyRef.current.length <= 1
      ) {
        prevCanvasDataRef.current = currentFrame.canvasData;
        loadFrameImage(currentFrame.canvasData);
      }
    }
  }, [
    currentFrame.id,
    currentFrame.canvasData,
    loadFrameImage,
    commitSelection,
    canUndoChange,
    canRedoChange,
  ]);

  // Auto-commit when switching tool away from lasso
  useEffect(() => {
    if (toolSettings.tool !== 'lasso' && selectionRef.current) {
      commitSelection();
    }
  }, [toolSettings.tool, commitSelection]);

  // Handle undo/redo triggers from parent
  const lastUndoRef = useRef(undoTrigger);
  useEffect(() => {
    if (undoTrigger !== lastUndoRef.current) {
      lastUndoRef.current = undoTrigger;
      if (selectionRef.current) {
        cancelSelection();
        return;
      }
      if (historyIndexRef.current > 0) {
        historyIndexRef.current -= 1;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const data = historyRef.current[historyIndexRef.current];
        ctx.putImageData(data, 0, 0);

        // Update per-frame cache
        frameHistoryMapRef.current.set(currentFrame.id, {
          history: [...historyRef.current],
          index: historyIndexRef.current,
        });

        canUndoChange(historyIndexRef.current > 0);
        canRedoChange(historyIndexRef.current < historyRef.current.length - 1);

        const dataUrl = canvas.toDataURL('image/png');
        prevCanvasDataRef.current = dataUrl;
        onUpdateCanvas(dataUrl);
      }
    }
  }, [undoTrigger, canUndoChange, canRedoChange, onUpdateCanvas, cancelSelection, currentFrame.id]);

  const lastRedoRef = useRef(redoTrigger);
  useEffect(() => {
    if (redoTrigger !== lastRedoRef.current) {
      lastRedoRef.current = redoTrigger;
      if (selectionRef.current) {
        return;
      }
      if (historyIndexRef.current < historyRef.current.length - 1) {
        historyIndexRef.current += 1;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const data = historyRef.current[historyIndexRef.current];
        ctx.putImageData(data, 0, 0);

        // Update per-frame cache
        frameHistoryMapRef.current.set(currentFrame.id, {
          history: [...historyRef.current],
          index: historyIndexRef.current,
        });

        canUndoChange(historyIndexRef.current > 0);
        canRedoChange(historyIndexRef.current < historyRef.current.length - 1);

        const dataUrl = canvas.toDataURL('image/png');
        prevCanvasDataRef.current = dataUrl;
        onUpdateCanvas(dataUrl);
      }
    }
  }, [redoTrigger, canUndoChange, canRedoChange, onUpdateCanvas, currentFrame.id]);

  // Handle clear trigger from parent
  const lastClearRef = useRef(clearTrigger || 0);
  useEffect(() => {
    if (clearTrigger && clearTrigger !== lastClearRef.current) {
      lastClearRef.current = clearTrigger;
      if (selectionRef.current) {
        cancelSelection();
      }
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pushHistory();
    }
  }, [clearTrigger, cancelSelection, pushHistory]);

  // Global keyboard shortcuts for transform, clipboard, zoom & pan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      // Spacebar for canvas panning
      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
      }

      // Zoom shortcuts (Ctrl/Cmd +, Ctrl/Cmd -, Ctrl/Cmd 0)
      if (cmdKey && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoomIn();
        return;
      }
      if (cmdKey && e.key === '-') {
        e.preventDefault();
        handleZoomOut();
        return;
      }
      if (cmdKey && e.key === '0') {
        e.preventDefault();
        handleResetZoom();
        return;
      }

      // Clipboard shortcuts
      if (cmdKey && e.key.toLowerCase() === 'c') {
        if (selectionRef.current) {
          e.preventDefault();
          copySelection();
          return;
        }
      }
      if (cmdKey && e.key.toLowerCase() === 'x') {
        if (selectionRef.current) {
          e.preventDefault();
          cutSelection();
          return;
        }
      }
      if (cmdKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        pasteSelection();
        return;
      }
      if (cmdKey && e.key.toLowerCase() === 'd') {
        if (selectionRef.current) {
          e.preventDefault();
          duplicateSelection();
          return;
        }
      }

      if (!selectionRef.current) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        commitSelection();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelSelection();
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        deleteSelection();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        setSelection((prev) => (prev ? { ...prev, centerX: prev.centerX - step } : null));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        setSelection((prev) => (prev ? { ...prev, centerX: prev.centerX + step } : null));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        setSelection((prev) => (prev ? { ...prev, centerY: prev.centerY - step } : null));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        setSelection((prev) => (prev ? { ...prev, centerY: prev.centerY + step } : null));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    const handleWindowPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;

      if (e.clipboardData && e.clipboardData.items) {
        for (const item of Array.from(e.clipboardData.items)) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                if (dataUrl) {
                  const img = new Image();
                  img.onload = () => {
                    const offCanvas = document.createElement('canvas');
                    let w = img.width;
                    let h = img.height;
                    if (w > logicalWidth * 0.85 || h > logicalHeight * 0.85) {
                      const scale = Math.min((logicalWidth * 0.85) / w, (logicalHeight * 0.85) / h);
                      w = Math.round(w * scale);
                      h = Math.round(h * scale);
                    }
                    offCanvas.width = w;
                    offCanvas.height = h;
                    const offCtx = offCanvas.getContext('2d');
                    if (!offCtx) return;
                    offCtx.drawImage(img, 0, 0, w, h);

                    if (selectionRef.current) {
                      commitSelection();
                    }

                    const centerX = logicalWidth / 2;
                    const centerY = logicalHeight / 2;
                    setSelection({
                      sourceCanvas: offCanvas,
                      dataUrl: offCanvas.toDataURL('image/png'),
                      originX: centerX - w / 2,
                      originY: centerY - h / 2,
                      width: w,
                      height: h,
                      centerX,
                      centerY,
                      scaleX: 1,
                      scaleY: 1,
                      rotation: 0,
                    });
                  };
                  img.src = dataUrl;
                }
              };
              reader.readAsDataURL(file);
              e.preventDefault();
              return;
            }
          }
        }
      }

      if (getLassoClipboard()) {
        e.preventDefault();
        pasteSelection();
      }
    };

    const handleCustomPaste = () => {
      pasteSelection();
    };

    // Outside tool events
    const onZoomIn = () => handleZoomIn();
    const onZoomOut = () => handleZoomOut();
    const onZoomReset = () => handleResetZoom();
    const onApply = () => { if (selectionRef.current) commitSelection(); };
    const onCancel = () => { if (selectionRef.current) cancelSelection(); };
    const onDuplicate = () => { if (selectionRef.current) duplicateSelection(); };
    const onFlipH = () => { if (selectionRef.current) flipHorizontal(); };
    const onFlipV = () => { if (selectionRef.current) flipVertical(); };
    const onDelete = () => { if (selectionRef.current) deleteSelection(); };
    const onCopy = () => { if (selectionRef.current) copySelection(); };
    const onCut = () => { if (selectionRef.current) cutSelection(); };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('paste', handleWindowPaste);
    window.addEventListener('storyboard:lasso-paste', handleCustomPaste);
    window.addEventListener('storyboard:zoom-in', onZoomIn);
    window.addEventListener('storyboard:zoom-out', onZoomOut);
    window.addEventListener('storyboard:zoom-reset', onZoomReset);
    window.addEventListener('storyboard:lasso-apply', onApply);
    window.addEventListener('storyboard:lasso-cancel', onCancel);
    window.addEventListener('storyboard:lasso-duplicate', onDuplicate);
    window.addEventListener('storyboard:lasso-fliph', onFlipH);
    window.addEventListener('storyboard:lasso-flipv', onFlipV);
    window.addEventListener('storyboard:lasso-delete', onDelete);
    window.addEventListener('storyboard:lasso-copy', onCopy);
    window.addEventListener('storyboard:lasso-cut', onCut);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('paste', handleWindowPaste);
      window.removeEventListener('storyboard:lasso-paste', handleCustomPaste);
      window.removeEventListener('storyboard:zoom-in', onZoomIn);
      window.removeEventListener('storyboard:zoom-out', onZoomOut);
      window.removeEventListener('storyboard:zoom-reset', onZoomReset);
      window.removeEventListener('storyboard:lasso-apply', onApply);
      window.removeEventListener('storyboard:lasso-cancel', onCancel);
      window.removeEventListener('storyboard:lasso-duplicate', onDuplicate);
      window.removeEventListener('storyboard:lasso-fliph', onFlipH);
      window.removeEventListener('storyboard:lasso-flipv', onFlipV);
      window.removeEventListener('storyboard:lasso-delete', onDelete);
      window.removeEventListener('storyboard:lasso-copy', onCopy);
      window.removeEventListener('storyboard:lasso-cut', onCut);
    };
  }, [
    commitSelection,
    cancelSelection,
    deleteSelection,
    copySelection,
    cutSelection,
    duplicateSelection,
    pasteSelection,
    flipHorizontal,
    flipVertical,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    logicalWidth,
    logicalHeight,
  ]);

  // Native wheel listener on canvas container to smoothly zoom with Ctrl/Alt/pinch without scrolling window
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.15 : 0.87;
        setZoom((prev) => {
          const next = Math.max(0.25, Math.min(5.0, prev * factor));
          return Math.round(next * 100) / 100;
        });
      } else if (zoom > 1.0) {
        e.preventDefault();
        setPan((prev) => ({
          x: Math.max(-1400, Math.min(1400, prev.x - e.deltaX * 0.9)),
          y: Math.max(-900, Math.min(900, prev.y - e.deltaY * 0.9)),
        }));
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, [zoom]);

  // Get pointer coordinates relative to logical canvas (960x540)
  const getCoordinates = (e: React.PointerEvent | PointerEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = logicalWidth / rect.width;
    const scaleY = logicalHeight / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      pressure: 'pressure' in e && e.pressure && e.pressure > 0 ? e.pressure : 0.5,
    };
  };

  const drawSegment = (p1: Point, p2: Point) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const pressure = p2.pressure ?? 0.5;

    if (toolSettings.tool === 'pencil') {
      // Traditional Pencil: Soft graphite texture or Col-Erase blue/red (always natural drafting colors on paper)
      let strokeColor = 'rgba(40, 40, 42, 0.48)';
      if (toolSettings.pencilType === 'col-erase-blue') {
        strokeColor = 'rgba(52, 120, 204, 0.55)';
      } else if (toolSettings.pencilType === 'carmine-red') {
        strokeColor = 'rgba(215, 55, 45, 0.55)';
      }

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = Math.max(1, toolSettings.size * (0.6 + pressure * 0.7));

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      if (Math.random() > 0.4) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = Math.max(0.6, ctx.lineWidth * 0.7);
        ctx.beginPath();
        const jx = (Math.random() - 0.5) * 0.6;
        const jy = (Math.random() - 0.5) * 0.6;
        ctx.moveTo(p1.x + jx, p1.y + jy);
        ctx.lineTo(p2.x + jx, p2.y + jy);
        ctx.stroke();
      }
    } else if (toolSettings.tool === 'pen') {
      // Pen: Always authentic ink color on default paper
      const penColor = toolSettings.penColor || '#161616';

      ctx.strokeStyle = penColor;
      ctx.fillStyle = penColor;
      ctx.lineWidth = Math.max(1, toolSettings.size * (0.7 + pressure * 0.6));

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    } else if (toolSettings.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = toolSettings.size * 2.5;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    ctx.restore();
  };

  // Extract selected lasso area from main canvas
  const extractLassoSelection = (polygon: Point[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const minX = Math.max(0, Math.floor(Math.min(...polygon.map((p) => p.x))));
    const minY = Math.max(0, Math.floor(Math.min(...polygon.map((p) => p.y))));
    const maxX = Math.min(logicalWidth, Math.ceil(Math.max(...polygon.map((p) => p.x))));
    const maxY = Math.min(logicalHeight, Math.ceil(Math.max(...polygon.map((p) => p.y))));

    const w = maxX - minX;
    const h = maxY - minY;

    if (w < 6 || h < 6) return;

    // Offscreen canvas for extracted selection
    const offCanvas = document.createElement('canvas');
    offCanvas.width = w;
    offCanvas.height = h;
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) return;

    // Clip polygon on offscreen canvas
    offCtx.save();
    offCtx.beginPath();
    polygon.forEach((pt, i) => {
      const rx = pt.x - minX;
      const ry = pt.y - minY;
      if (i === 0) offCtx.moveTo(rx, ry);
      else offCtx.lineTo(rx, ry);
    });
    offCtx.closePath();
    offCtx.clip();

    // Draw slice of main canvas
    offCtx.drawImage(canvas, minX, minY, w, h, 0, 0, w, h);
    offCtx.restore();

    // Verify whether any pixels exist in the clipped region
    const imgData = offCtx.getImageData(0, 0, w, h);
    let hasPixels = false;
    for (let i = 3; i < imgData.data.length; i += 4) {
      if (imgData.data[i] > 10) {
        hasPixels = true;
        break;
      }
    }

    if (!hasPixels) return;

    // Erase clipped area from main canvas
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    polygon.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    const dataUrl = offCanvas.toDataURL('image/png');

    setSelection({
      sourceCanvas: offCanvas,
      dataUrl,
      originX: minX,
      originY: minY,
      width: w,
      height: h,
      centerX: minX + w / 2,
      centerY: minY + h / 2,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    });

    onUpdateCanvas(canvas.toDataURL('image/png'));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // If Spacebar is held, Pan Tool is active, or middle mouse clicked:
    if (isSpacePressed || isPanToolActive || e.button === 1) {
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
      isPanningRef.current = true;
      panStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
      };
      return;
    }

    // If we have an active transform selection and click outside, commit it
    if (selection) {
      commitSelection();
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getCoordinates(e);

    if (toolSettings.tool === 'lasso') {
      isLassoDrawingRef.current = true;
      setLassoPoints([pt]);
      return;
    }

    isDrawingRef.current = true;
    lastPointRef.current = pt;
    pointsRef.current = [pt];
    drawSegment(pt, { ...pt, x: pt.x + 0.1, y: pt.y + 0.1 });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.clientX;
      const dy = e.clientY - panStartRef.current.clientY;
      setPan({
        x: panStartRef.current.startPanX + dx,
        y: panStartRef.current.startPanY + dy,
      });
      return;
    }

    const pt = getCoordinates(e);

    if (toolSettings.tool === 'lasso') {
      if (!isLassoDrawingRef.current) return;
      setLassoPoints((prev) => [...prev, pt]);
      return;
    }

    if (!isDrawingRef.current || !lastPointRef.current) return;

    pointsRef.current.push(pt);
    if (pointsRef.current.length >= 3) {
      const p0 = pointsRef.current[pointsRef.current.length - 3];
      const p1 = pointsRef.current[pointsRef.current.length - 2];
      const p2 = pointsRef.current[pointsRef.current.length - 1];

      const mid1 = {
        x: (p0.x + p1.x) / 2,
        y: (p0.y + p1.y) / 2,
        pressure: (p0.pressure! + p1.pressure!) / 2,
      };
      const mid2 = {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
        pressure: (p1.pressure! + p2.pressure!) / 2,
      };

      drawSegment(mid1, p1);
      drawSegment(p1, mid2);
    } else {
      drawSegment(lastPointRef.current, pt);
    }

    lastPointRef.current = pt;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    if (toolSettings.tool === 'lasso' && isLassoDrawingRef.current) {
      isLassoDrawingRef.current = false;
      if (lassoPoints.length > 5) {
        extractLassoSelection(lassoPoints);
      }
      setLassoPoints([]);
      return;
    }

    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      lastPointRef.current = null;
      pointsRef.current = [];
      pushHistory();
    }
  };

  // Interactive Drag & Transform Handlers for active selection
  const handleTransformPointerDown = (
    e: React.PointerEvent,
    mode: 'move' | 'rotate' | 'scale',
    handle?: string
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (!selection) return;

    const target = e.currentTarget as HTMLElement;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const pt = getCoordinates(e);

    dragStateRef.current = {
      isDragging: true,
      mode,
      handle,
      startPointer: pt,
      startCenter: { x: selection.centerX, y: selection.centerY },
      startScale: { x: selection.scaleX, y: selection.scaleY },
      startRotation: selection.rotation,
      startAngle: Math.atan2(pt.y - selection.centerY, pt.x - selection.centerX),
      width: selection.width,
      height: selection.height,
    };
  };

  const handleTransformPointerMove = (e: React.PointerEvent) => {
    if (!dragStateRef.current.isDragging || !selection) return;
    e.stopPropagation();
    e.preventDefault();

    const pt = getCoordinates(e);
    const { mode, handle, startPointer, startCenter, startScale, startRotation, startAngle } =
      dragStateRef.current;

    if (mode === 'move') {
      const dx = pt.x - startPointer.x;
      const dy = pt.y - startPointer.y;
      setSelection((prev) =>
        prev
          ? {
              ...prev,
              centerX: startCenter.x + dx,
              centerY: startCenter.y + dy,
            }
          : null
      );
    } else if (mode === 'rotate') {
      const currentAngle = Math.atan2(pt.y - startCenter.y, pt.x - startCenter.x);
      const deltaAngle = currentAngle - startAngle;
      let newRot = startRotation + deltaAngle;
      if (e.shiftKey) {
        const snap = Math.PI / 12; // 15 degrees snap
        newRot = Math.round(newRot / snap) * snap;
      }
      setSelection((prev) => (prev ? { ...prev, rotation: newRot } : null));
    } else if (mode === 'scale') {
      const dx = pt.x - startCenter.x;
      const dy = pt.y - startCenter.y;
      const cos = Math.cos(-startRotation);
      const sin = Math.sin(-startRotation);
      const localX = dx * cos - dy * sin;
      const localY = dx * sin + dy * cos;

      const halfW = selection.width / 2;
      const halfH = selection.height / 2;
      let newScaleX = startScale.x;
      let newScaleY = startScale.y;

      if (handle === 'se') {
        newScaleX = localX / halfW;
        newScaleY = localY / halfH;
      } else if (handle === 'nw') {
        newScaleX = -localX / halfW;
        newScaleY = -localY / halfH;
      } else if (handle === 'ne') {
        newScaleX = localX / halfW;
        newScaleY = -localY / halfH;
      } else if (handle === 'sw') {
        newScaleX = -localX / halfW;
        newScaleY = localY / halfH;
      } else if (handle === 'e') {
        newScaleX = localX / halfW;
      } else if (handle === 'w') {
        newScaleX = -localX / halfW;
      } else if (handle === 's') {
        newScaleY = localY / halfH;
      } else if (handle === 'n') {
        newScaleY = -localY / halfH;
      }

      if (e.shiftKey && ['nw', 'ne', 'se', 'sw'].includes(handle || '')) {
        const signX = Math.sign(newScaleX) || 1;
        const signY = Math.sign(newScaleY) || 1;
        const uniform = Math.max(Math.abs(newScaleX), Math.abs(newScaleY));
        newScaleX = signX * uniform;
        newScaleY = signY * uniform;
      }

      if (Math.abs(newScaleX) < 0.05) newScaleX = Math.sign(newScaleX || 1) * 0.05;
      if (Math.abs(newScaleY) < 0.05) newScaleY = Math.sign(newScaleY || 1) * 0.05;

      setSelection((prev) =>
        prev
          ? {
              ...prev,
              scaleX: newScaleX,
              scaleY: newScaleY,
            }
          : null
      );
    }
  };

  const handleTransformPointerUp = (e: React.PointerEvent) => {
    dragStateRef.current.isDragging = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Onion skin frames calculation (up to 4 previous frames and next frames)
  const prevCount = Math.max(1, onionSettings.prevFramesCount || 2);
  const prevFrame1 =
    onionSettings.enabled && currentFrameIndex > 0 ? allFrames[currentFrameIndex - 1] : null;
  const prevFrame2 =
    onionSettings.enabled && prevCount >= 2 && currentFrameIndex > 1
      ? allFrames[currentFrameIndex - 2]
      : null;
  const prevFrame3 =
    onionSettings.enabled && prevCount >= 3 && currentFrameIndex > 2
      ? allFrames[currentFrameIndex - 3]
      : null;
  const prevFrame4 =
    onionSettings.enabled && prevCount >= 4 && currentFrameIndex > 3
      ? allFrames[currentFrameIndex - 4]
      : null;
  const nextFrame1 =
    onionSettings.enabled &&
    onionSettings.nextFramesCount > 0 &&
    currentFrameIndex < allFrames.length - 1
      ? allFrames[currentFrameIndex + 1]
      : null;

  return (
    <div
      ref={containerRef}
      className={`relative w-full aspect-[16/9] select-none rounded shadow-xs overflow-hidden border transition-colors bg-[#F4F0E8] border-zinc-400/80 dark:border-zinc-700 ${
        isPanToolActive || isSpacePressed
          ? isPanningRef.current
            ? 'cursor-grabbing'
            : 'cursor-grab'
          : ''
      }`}
    >
      {/* 1. HIGH-VISIBILITY PINNED SELECTION HEADER (Fixed to top of canvas viewport - impossible to hide) */}
      {selection && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950/95 text-white shadow-2xl border border-sky-500/80 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150 pointer-events-auto">
          <div className="flex items-center gap-1.5 pr-2.5 border-r border-zinc-700/80">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
            <span className="text-[11px] font-bold tracking-wide uppercase text-sky-400 whitespace-nowrap">
              Selection Active
            </span>
          </div>

          {/* Primary action: Apply */}
          <button
            onClick={commitSelection}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow-md transition-all active:scale-95"
            title="Apply Transform (Enter)"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Apply (Enter)</span>
          </button>

          {/* Cancel */}
          <button
            onClick={cancelSelection}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-medium text-xs transition-colors"
            title="Cancel Transform (Esc)"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel (Esc)</span>
          </button>

          <div className="w-[1px] h-4 bg-zinc-700 mx-1" />

          {/* Copy */}
          <button
            onClick={copySelection}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
            title="Copy Selected Artwork (Ctrl+C)"
          >
            <Copy className="w-4 h-4" />
          </button>

          {/* Cut */}
          <button
            onClick={cutSelection}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
            title="Cut Selected Artwork (Ctrl+X)"
          >
            <Scissors className="w-4 h-4" />
          </button>

          {/* Duplicate */}
          <button
            onClick={duplicateSelection}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-950/80 hover:bg-sky-900 border border-sky-700/60 text-sky-300 hover:text-sky-200 font-medium text-xs transition-colors"
            title="Duplicate Selection (Ctrl+D)"
          >
            <CopyPlus className="w-3.5 h-3.5" />
            <span>Duplicate</span>
          </button>

          <div className="w-[1px] h-4 bg-zinc-700 mx-1" />

          {/* Flip H */}
          <button
            onClick={flipHorizontal}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
            title="Flip Horizontal"
          >
            <FlipHorizontal className="w-4 h-4" />
          </button>

          {/* Flip V */}
          <button
            onClick={flipVertical}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
            title="Flip Vertical"
          >
            <FlipVertical className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-zinc-700 mx-1" />

          {/* Delete */}
          <button
            onClick={deleteSelection}
            className="p-1.5 rounded-lg hover:bg-rose-950 text-zinc-400 hover:text-rose-400 transition-colors"
            title="Delete Selected Artwork (Backspace / Del)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. FLOATING CANVAS ZOOM & PAN HUD (Bottom-right corner) */}
      <div className="absolute bottom-3 right-3 z-40 flex items-center gap-1 px-2 py-1.5 rounded-xl bg-zinc-950/85 dark:bg-zinc-900/90 text-white shadow-xl border border-zinc-700/80 backdrop-blur-md text-xs select-none pointer-events-auto">
        {/* Hand/Pan tool toggle button */}
        <button
          onClick={() => setIsPanToolActive((v) => !v)}
          className={`p-1.5 rounded-lg transition-colors ${
            isPanToolActive
              ? 'bg-sky-500 text-zinc-950 font-bold'
              : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
          }`}
          title="Hand / Pan Tool (or hold Space + Drag)"
        >
          <Hand className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-3.5 bg-zinc-700 mx-0.5" />

        {/* Zoom Out */}
        <button
          onClick={handleZoomOut}
          disabled={zoom <= 0.25}
          className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Zoom Out (Ctrl -)"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        {/* Clickable Zoom Percentage - click to reset */}
        <button
          onClick={handleResetZoom}
          className="px-2 py-1 rounded-md text-[11px] font-mono font-bold text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors"
          title="Click to Reset Zoom to 100% (Ctrl 0)"
        >
          {Math.round(zoom * 100)}%
        </button>

        {/* Zoom In */}
        <button
          onClick={handleZoomIn}
          disabled={zoom >= 5.0}
          className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Zoom In (Ctrl +)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        {(zoom !== 1.0 || pan.x !== 0 || pan.y !== 0) && (
          <>
            <div className="w-[1px] h-3.5 bg-zinc-700 mx-0.5" />
            <button
              onClick={handleResetZoom}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Reset View to 100% / Center"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </>
        )}
      </div>

      {/* 3. ZOOM & PAN INTERACTIVE TRANSFORM LAYER */}
      <div
        className="w-full h-full relative"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          willChange: 'transform',
          transition: isPanningRef.current ? 'none' : 'transform 0.08s ease-out',
        }}
      >
      {/* Precision SVG Color Matrix Filters for High-Contrast Onion Skinning */}
      <svg width="0" height="0" className="absolute pointer-events-none -z-50" aria-hidden="true">
        <defs>
          {/* Previous Frame 1: Vibrant Cyan (#0284c7 light / #38bdf8 dark) */}
          <filter id="onion-cyan-light" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.01
                      0 0 0 0 0.52
                      0 0 0 0 0.78
                      0 0 0 1 0"
            />
          </filter>
          <filter id="onion-cyan-dark" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.22
                      0 0 0 0 0.74
                      0 0 0 0 0.97
                      0 0 0 1 0"
            />
          </filter>

          {/* Previous Frame 2: Deep Sky Blue / Cobalt */}
          <filter id="onion-cobalt-light" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.06
                      0 0 0 0 0.65
                      0 0 0 0 0.91
                      0 0 0 1 0"
            />
          </filter>
          <filter id="onion-cobalt-dark" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.49
                      0 0 0 0 0.83
                      0 0 0 0 0.99
                      0 0 0 1 0"
            />
          </filter>

          {/* Previous Frame 3+: Violet / Indigo */}
          <filter id="onion-violet-light" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.49
                      0 0 0 0 0.23
                      0 0 0 0 0.93
                      0 0 0 1 0"
            />
          </filter>
          <filter id="onion-violet-dark" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.65
                      0 0 0 0 0.45
                      0 0 0 0 0.98
                      0 0 0 1 0"
            />
          </filter>

          {/* Next Frame: Radiant Coral / Orange (#ea580c / #f97316) */}
          <filter id="onion-orange-light" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.92
                      0 0 0 0 0.35
                      0 0 0 0 0.05
                      0 0 0 1 0"
            />
          </filter>
          <filter id="onion-orange-dark" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.98
                      0 0 0 0 0.57
                      0 0 0 0 0.24
                      0 0 0 1 0"
            />
          </filter>

          {/* Monochrome Graphite Filters */}
          <filter id="onion-graphite-light" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.12
                      0 0 0 0 0.12
                      0 0 0 0 0.16
                      0 0 0 1 0"
            />
          </filter>
          <filter id="onion-graphite-dark" colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.88
                      0 0 0 0 0.88
                      0 0 0 0 0.92
                      0 0 0 1 0"
            />
          </filter>
        </defs>
      </svg>

      {/* Light Table Backlight Glow Effect */}
      {onionSettings.lightTableBulb && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-0"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(255, 253, 245, 0.95) 0%, rgba(246, 242, 232, 0.85) 65%, rgba(235, 230, 218, 0.5) 100%)',
            boxShadow: 'inset 0 0 70px rgba(255, 255, 255, 0.85)',
          }}
        />
      )}

      {/* Die-Cut Acme Peg Holes at Top or Bottom of Paper Sheet */}
      <div
        className={`absolute ${
          pegPosition === 'top' ? 'top-2' : 'bottom-2'
        } left-0 right-0 flex items-center justify-center gap-16 pointer-events-none z-10`}
      >
        <div
          className="w-7 h-2 rounded-full border bg-zinc-300/70 border-zinc-400/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]"
          title="Acme Registration Slot Hole"
        />
        <div
          className="w-3.5 h-3.5 rounded-full border bg-zinc-300/70 border-zinc-400/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]"
          title="Acme Registration Round Hole (Center)"
        />
        <div
          className="w-7 h-2 rounded-full border bg-zinc-300/70 border-zinc-400/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]"
          title="Acme Registration Slot Hole"
        />
      </div>

      {/* Traditional Storyboard Framing & Safe Action Boundaries */}
      <div className="absolute inset-4 pointer-events-none border border-zinc-400/80 rounded-xs z-10">
        <div className="absolute inset-4 border border-dashed border-zinc-400/50 rounded-xs">
          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-zinc-600/70" />
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-zinc-600/70" />
          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-zinc-600/70" />
          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-zinc-600/70" />
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-40">
          <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-zinc-600" />
          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-zinc-600" />
        </div>
      </div>

      {/* Traditional 12-Field Animation Grid */}
      {showFieldGrid && (
        <div className="absolute inset-4 pointer-events-none z-10 grid grid-cols-12 grid-rows-8 border border-zinc-400/50">
          {Array.from({ length: 96 }).map((_, i) => (
            <div key={i} className="border border-zinc-300/40" />
          ))}
          <span className="absolute bottom-1 right-2 text-[10px] font-mono font-semibold tracking-tight text-zinc-600">
            12-FIELD CHART
          </span>
        </div>
      )}

      {/* ONION SKINNING LAYERS (Bold, High-Contrast Visibility on Canvas Paper) */}
      {onionSettings.enabled && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          {/* Previous Frame 4 */}
          {prevFrame4 && prevFrame4.canvasData && prevFrame4.canvasData.length > 50 && (
            <img
              src={prevFrame4.canvasData}
              alt="Onion skin 4 frames back"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              style={{
                opacity: Math.max(0.18, (onionSettings.opacity || 0.65) * 0.3),
                filter: onionSettings.colorCoded
                  ? 'url(#onion-violet-light)'
                  : 'url(#onion-graphite-light)',
              }}
            />
          )}

          {/* Previous Frame 3 */}
          {prevFrame3 && prevFrame3.canvasData && prevFrame3.canvasData.length > 50 && (
            <img
              src={prevFrame3.canvasData}
              alt="Onion skin 3 frames back"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              style={{
                opacity: Math.max(0.28, (onionSettings.opacity || 0.65) * 0.45),
                filter: onionSettings.colorCoded
                  ? 'url(#onion-violet-light)'
                  : 'url(#onion-graphite-light)',
              }}
            />
          )}

          {/* Previous Frame 2 */}
          {prevFrame2 && prevFrame2.canvasData && prevFrame2.canvasData.length > 50 && (
            <img
              src={prevFrame2.canvasData}
              alt="Onion skin 2 frames back"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              style={{
                opacity: Math.max(0.42, (onionSettings.opacity || 0.65) * 0.7),
                filter: onionSettings.colorCoded
                  ? 'url(#onion-cobalt-light)'
                  : 'url(#onion-graphite-light)',
              }}
            />
          )}

          {/* Previous Frame 1 (Immediate Prior Frame - High Contrast Cyan) */}
          {prevFrame1 && prevFrame1.canvasData && prevFrame1.canvasData.length > 50 && (
            <img
              src={prevFrame1.canvasData}
              alt="Onion skin previous frame"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity"
              style={{
                opacity: Math.max(0.65, onionSettings.opacity || 0.65),
                filter: onionSettings.colorCoded
                  ? 'url(#onion-cyan-light)'
                  : 'url(#onion-graphite-light)',
              }}
            />
          )}

          {/* Next Frame 1 (Upcoming Frame - Radiant Coral / Orange) */}
          {nextFrame1 && nextFrame1.canvasData && nextFrame1.canvasData.length > 50 && (
            <img
              src={nextFrame1.canvasData}
              alt="Onion skin next frame"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity"
              style={{
                opacity: Math.max(0.55, (onionSettings.opacity || 0.65) * 0.85),
                filter: onionSettings.colorCoded
                  ? 'url(#onion-orange-light)'
                  : 'url(#onion-graphite-light)',
              }}
            />
          )}
        </div>
      )}

      {/* MOVABLE PERSPECTIVE GRID & GROUND GRID OVERLAY */}
      <PerspectiveGridOverlay
        config={perspectiveConfig}
        onChangeConfig={onUpdatePerspectiveConfig}
        theme="light"
      />

      {/* ACTIVE DRAWING CANVAS */}
      <canvas
        ref={canvasRef}
        width={logicalWidth}
        height={logicalHeight}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className={`relative z-20 w-full h-full object-contain touch-none ${
          toolSettings.tool === 'lasso' ? 'cursor-crosshair' : 'cursor-crosshair'
        }`}
      />

      {/* REAL-TIME LASSO POLYLINE OVERLAY (When drawing selection loop) */}
      {lassoPoints.length > 1 && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-30"
          viewBox={`0 0 ${logicalWidth} ${logicalHeight}`}
        >
          <polygon
            points={lassoPoints.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="rgba(56, 189, 248, 0.18)"
            stroke="#38bdf8"
            strokeWidth="1.5"
            strokeDasharray="5 3"
          />
        </svg>
      )}

      {/* INTERACTIVE TRANSFORM BOUNDING BOX & HANDLES (Scale, Rotate, Move) */}
      {selection && (
        <div
          className="absolute z-40 pointer-events-none"
          style={{
            left: `${(selection.centerX / logicalWidth) * 100}%`,
            top: `${(selection.centerY / logicalHeight) * 100}%`,
            width: `${(selection.width / logicalWidth) * 100}%`,
            height: `${(selection.height / logicalHeight) * 100}%`,
            transform: `translate(-50%, -50%) rotate(${selection.rotation}rad) scale(${selection.scaleX}, ${selection.scaleY})`,
            transformOrigin: 'center center',
          }}
        >
          {/* Floating Transformed Drawing Preview Image */}
          <img
            src={selection.dataUrl}
            alt="Transformed drawing"
            className="w-full h-full block pointer-events-none select-none"
            draggable={false}
          />

          {/* Bounding Box Outline with Marching Ants */}
          <div
            className="absolute inset-0 border border-dashed border-sky-400 dark:border-sky-300 pointer-events-none"
            style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.3)' }}
          />

          {/* Move Area (Center Drag Zone) */}
          <div
            onPointerDown={(e) => handleTransformPointerDown(e, 'move')}
            onPointerMove={handleTransformPointerMove}
            onPointerUp={handleTransformPointerUp}
            className="absolute inset-0 cursor-move pointer-events-auto bg-sky-400/5 hover:bg-sky-400/15 transition-colors"
            title="Drag inside to Move (or Arrow Keys to nudge)"
          />

          {/* Rotation Handle Stem & Knob at Top */}
          <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center"
            style={{
              transform: `scale(${1 / Math.abs(selection.scaleX || 1)}, ${
                1 / Math.abs(selection.scaleY || 1)
              })`,
              transformOrigin: 'bottom center',
            }}
          >
            {/* Rotation Knob */}
            <div
              onPointerDown={(e) => handleTransformPointerDown(e, 'rotate')}
              onPointerMove={handleTransformPointerMove}
              onPointerUp={handleTransformPointerUp}
              className="w-5 h-5 rounded-full bg-white dark:bg-zinc-100 border-2 border-sky-500 shadow-md cursor-grab active:cursor-grabbing pointer-events-auto flex items-center justify-center hover:scale-125 transition-transform"
              title="Drag to Rotate (Hold Shift to snap 15°)"
            >
              <RotateCw className="w-2.5 h-2.5 text-sky-600 stroke-[2.5]" />
            </div>
            {/* Stem line connecting to top box */}
            <div className="w-[1.5px] h-5 bg-sky-500" />
          </div>

          {/* 4 Corner Scale Handles */}
          {[
            { id: 'nw', pos: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2', cursor: 'cursor-nwse-resize' },
            { id: 'ne', pos: 'top-0 right-0 translate-x-1/2 -translate-y-1/2', cursor: 'cursor-nesw-resize' },
            { id: 'se', pos: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2', cursor: 'cursor-nwse-resize' },
            { id: 'sw', pos: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2', cursor: 'cursor-nesw-resize' },
          ].map((h) => (
            <div
              key={h.id}
              onPointerDown={(e) => handleTransformPointerDown(e, 'scale', h.id)}
              onPointerMove={handleTransformPointerMove}
              onPointerUp={handleTransformPointerUp}
              className={`absolute ${h.pos} ${h.cursor} w-3 h-3 bg-white dark:bg-zinc-100 border-2 border-sky-600 dark:border-sky-400 rounded-xs shadow-xs pointer-events-auto hover:scale-125 transition-transform`}
              style={{
                transform: `scale(${1 / Math.abs(selection.scaleX || 1)}, ${
                  1 / Math.abs(selection.scaleY || 1)
                })`,
              }}
              title="Drag to Scale (Hold Shift for uniform scale)"
            />
          ))}

          {/* 4 Edge Scale Handles */}
          {[
            { id: 'n', pos: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2', cursor: 'cursor-ns-resize' },
            { id: 's', pos: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2', cursor: 'cursor-ns-resize' },
            { id: 'w', pos: 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2', cursor: 'cursor-ew-resize' },
            { id: 'e', pos: 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2', cursor: 'cursor-ew-resize' },
          ].map((h) => (
            <div
              key={h.id}
              onPointerDown={(e) => handleTransformPointerDown(e, 'scale', h.id)}
              onPointerMove={handleTransformPointerMove}
              onPointerUp={handleTransformPointerUp}
              className={`absolute ${h.pos} ${h.cursor} w-2.5 h-2.5 bg-white dark:bg-zinc-100 border-2 border-sky-600 dark:border-sky-400 rounded-xs shadow-xs pointer-events-auto hover:scale-125 transition-transform`}
              style={{
                transform: `scale(${1 / Math.abs(selection.scaleX || 1)}, ${
                  1 / Math.abs(selection.scaleY || 1)
                })`,
              }}
              title="Drag to Stretch/Scale Axis"
            />
          ))}

          {/* FLOATING ACTION TOOLBAR (Smartly flips above if selection is near bottom of canvas) */}
          <div
            className={`absolute ${
              selection.centerY > logicalHeight * 0.52
                ? 'bottom-[calc(100%+16px)]'
                : 'top-[calc(100%+16px)]'
            } left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 rounded-lg bg-zinc-950/95 text-white shadow-2xl border border-zinc-700/80 text-xs backdrop-blur-md select-none z-50 pointer-events-auto whitespace-nowrap`}
            style={{
              transform: `translate(-50%, 0) rotate(${-selection.rotation}rad) scale(${
                1 / Math.abs(selection.scaleX || 1)
              }, ${1 / Math.abs(selection.scaleY || 1)})`,
              transformOrigin:
                selection.centerY > logicalHeight * 0.52 ? 'bottom center' : 'top center',
            }}
          >
            {/* Apply Button */}
            <button
              onClick={commitSelection}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-[11px] shadow-xs transition-colors"
              title="Apply Transform (Enter)"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Apply</span>
            </button>

            <div className="w-[1px] h-4 bg-zinc-700 mx-0.5" />

            {/* Copy Button */}
            <button
              onClick={copySelection}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
              title="Copy Selected Artwork (Ctrl+C)"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>

            {/* Cut Button */}
            <button
              onClick={cutSelection}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
              title="Cut Selected Artwork (Ctrl+X)"
            >
              <Scissors className="w-3.5 h-3.5" />
            </button>

            {/* Duplicate Button */}
            <button
              onClick={duplicateSelection}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
              title="Duplicate Selection (Ctrl+D)"
            >
              <CopyPlus className="w-3.5 h-3.5" />
            </button>

            <div className="w-[1px] h-4 bg-zinc-700 mx-0.5" />

            {/* Flip Horizontal */}
            <button
              onClick={flipHorizontal}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
              title="Flip Horizontal"
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
            </button>

            {/* Flip Vertical */}
            <button
              onClick={flipVertical}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
              title="Flip Vertical"
            >
              <FlipVertical className="w-3.5 h-3.5" />
            </button>

            <div className="w-[1px] h-4 bg-zinc-700 mx-0.5" />

            {/* Cancel (Esc) */}
            <button
              onClick={cancelSelection}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              title="Cancel Transform (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Delete Selection (Cut) */}
            <button
              onClick={deleteSelection}
              className="p-1.5 rounded hover:bg-rose-950/80 text-zinc-400 hover:text-rose-400 transition-colors"
              title="Delete Selected Artwork (Backspace / Del)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

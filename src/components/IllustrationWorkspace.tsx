import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Pencil,
  PenTool,
  Eraser,
  LassoSelect,
  Undo2,
  Redo2,
  Trash2,
  ZoomIn,
  ZoomOut,
  Hand,
  RotateCcw,
  Check,
  X,
  Copy,
  Scissors,
  CopyPlus,
  FlipHorizontal,
  FlipVertical,
  Download,
  ArrowLeft,
  Grid3X3,
  Sliders,
  Palette,
  Image as ImageIcon,
  Layers,
  Sparkles,
  Maximize2,
  ChevronDown,
  GripVertical,
  Move,
  ChevronLeft,
  ChevronRight,
  PanelLeft,
  PanelRight,
  RefreshCw,
} from 'lucide-react';
import {
  LassoClipboardData,
  setLassoClipboard,
  getLassoClipboard,
} from '../utils/lassoClipboard';

export interface IllustrationWorkspaceProps {
  onBackToDesk: () => void;
  onSendToStoryboard?: (dataUrl: string) => void;
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

type AspectRatioMode = '16:9' | '4:3' | '1:1' | '9:16';
type PaperTone = 'cream' | 'white' | 'gray' | 'kraft' | 'dark';
type GuideType = 'none' | 'thirds' | 'crosshair' | 'grid' | 'perspective';

const PAPER_COLORS: Record<PaperTone, { name: string; bg: string; border: string }> = {
  cream: { name: 'Drafting Cream', bg: '#F4F0E8', border: '#DEDAD0' },
  white: { name: 'Studio White', bg: '#FFFFFF', border: '#E2E8F0' },
  gray: { name: 'Toned Slate', bg: '#E2E8F0', border: '#CBD5E1' },
  kraft: { name: 'Sepia Kraft', bg: '#EADBC8', border: '#D8C3A5' },
  dark: { name: 'Toned Charcoal', bg: '#222226', border: '#333338' },
};

const ASPECT_RATIOS: Record<AspectRatioMode, { label: string; width: number; height: number }> = {
  '16:9': { label: '16:9 Cinematic', width: 1280, height: 720 },
  '4:3': { label: '4:3 Classic', width: 1024, height: 768 },
  '1:1': { label: '1:1 Square', width: 900, height: 900 },
  '9:16': { label: '9:16 Portrait', width: 720, height: 1280 },
};

export const IllustrationWorkspace: React.FC<IllustrationWorkspaceProps> = ({
  onBackToDesk,
  onSendToStoryboard,
  theme,
}) => {
  const isDark = theme === 'dark';

  // Canvas format settings
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>('16:9');
  const [paperTone, setPaperTone] = useState<PaperTone>('cream');
  const [guideType, setGuideType] = useState<GuideType>('none');

  const { width: logicalWidth, height: logicalHeight } = ASPECT_RATIOS[aspectRatio];

  // Tool settings (arranged separately for rough illustration)
  const [activeTool, setActiveTool] = useState<'pencil' | 'pen' | 'eraser' | 'lasso'>('pencil');
  const [pencilType, setPencilType] = useState<'graphite' | 'soft-graphite' | 'col-erase-blue' | 'carmine-red'>('graphite');
  const [penColor, setPenColor] = useState<string>('#161616');
  const [brushSize, setBrushSize] = useState<number>(3);
  const [eraserSize, setEraserSize] = useState<number>(18);
  const [brushOpacity, setBrushOpacity] = useState<number>(1.0);

  // Movable & Adjustable Tool Dock Settings
  const [dockPosition, setDockPosition] = useState<'left' | 'right' | 'floating'>('left');
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [dockWidthMode, setDockWidthMode] = useState<'compact' | 'normal' | 'wide'>('normal');
  const [dockPos, setDockPos] = useState<{ x: number; y: number }>({ x: 24, y: 80 });

  // Floating dock drag interaction
  const isDraggingDockRef = useRef(false);
  const dockDragStartRef = useRef<{ pointerX: number; pointerY: number; startX: number; startY: number }>({
    pointerX: 0,
    pointerY: 0,
    startX: 0,
    startY: 0,
  });

  const handleDockPointerDown = (e: React.PointerEvent) => {
    // If not already floating, switch to floating on drag handle grab
    if (dockPosition !== 'floating') {
      setDockPosition('floating');
    }
    isDraggingDockRef.current = true;
    dockDragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      startX: dockPos.x,
      startY: dockPos.y,
    };
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleDockPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingDockRef.current) return;
    const dx = e.clientX - dockDragStartRef.current.pointerX;
    const dy = e.clientY - dockDragStartRef.current.pointerY;
    const maxX = Math.max(100, window.innerWidth - (dockCollapsed ? 65 : dockWidthMode === 'compact' ? 240 : dockWidthMode === 'wide' ? 360 : 300));
    const maxY = Math.max(100, window.innerHeight - 150);
    const newX = Math.max(10, Math.min(maxX, dockDragStartRef.current.startX + dx));
    const newY = Math.max(48, Math.min(maxY, dockDragStartRef.current.startY + dy));
    setDockPos({ x: newX, y: newY });
  };

  const handleDockPointerUp = (e: React.PointerEvent) => {
    if (isDraggingDockRef.current) {
      isDraggingDockRef.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Save / Export modal state
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Canvas element & history stack
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const pointsRef = useRef<Point[]>([]);

  // Deep Undo/Redo history (at least 50+ steps)
  const MAX_HISTORY = 80;
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

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
      const next = zoomLevels.find((lvl) => lvl > prev + 0.05) ?? Math.min(5.0, prev + 0.25);
      return Math.round(next * 100) / 100;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => {
      const reversed = [...zoomLevels].reverse();
      const next = reversed.find((lvl) => lvl < prev - 0.05) ?? Math.max(0.25, prev - 0.25);
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

  // Push to history stack
  const pushHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(imageData);
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    }
    historyIndexRef.current = historyRef.current.length - 1;

    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);

    // Auto-save rough sketch in localStorage
    try {
      const dataUrl = canvas.toDataURL('image/png');
      localStorage.setItem('drawdesk_rough_illustration_cache', dataUrl);
    } catch {}
  }, []);

  // Commit active transform back onto canvas
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

  // Cancel transform & restore pixels
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
  }, []);

  // Delete selection
  const deleteSelection = useCallback(() => {
    if (!selectionRef.current) return;
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
    showToast('Selection copied to clipboard');
  }, []);

  // Cut selection
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

    const offset = 24;
    setSelection({
      ...active,
      centerX: Math.min(logicalWidth - 60, active.centerX + offset),
      centerY: Math.min(logicalHeight - 60, active.centerY + offset),
    });
    pushHistory();
    showToast('Duplicated selection');
  }, [logicalWidth, logicalHeight, pushHistory]);

  // Flip horizontal
  const flipHorizontal = useCallback(() => {
    setSelection((prev) => (prev ? { ...prev, scaleX: -prev.scaleX } : null));
  }, []);

  // Flip vertical
  const flipVertical = useCallback(() => {
    setSelection((prev) => (prev ? { ...prev, scaleY: -prev.scaleY } : null));
  }, []);

  // Undo Handler
  const handleUndo = useCallback(() => {
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

      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(true);
    }
  }, [cancelSelection]);

  // Redo Handler
  const handleRedo = useCallback(() => {
    if (selectionRef.current) return;
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const data = historyRef.current[historyIndexRef.current];
      ctx.putImageData(data, 0, 0);

      setCanUndo(true);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    }
  }, []);

  // Clear Canvas Handler
  const handleClear = useCallback(() => {
    if (selectionRef.current) cancelSelection();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    try {
      localStorage.removeItem('drawdesk_rough_illustration_cache');
    } catch {}
    pushHistory();
    showToast('Canvas cleared & reset to paper');
  }, [cancelSelection, pushHistory]);

  // Initialize canvas on mount or aspect ratio change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = logicalWidth;
    canvas.height = logicalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, logicalWidth, logicalHeight);

    // Try restoring previous illustration from cache if exists
    const cached = localStorage.getItem('drawdesk_rough_illustration_cache');
    if (cached && cached.length > 50) {
      const img = new Image();
      img.onload = () => {
        // Quick verification: check if cached image was corrupted with solid opaque black
        const testCanvas = document.createElement('canvas');
        testCanvas.width = 16;
        testCanvas.height = 16;
        const testCtx = testCanvas.getContext('2d');
        if (testCtx) {
          testCtx.drawImage(img, 0, 0, 16, 16);
          const pixel = testCtx.getImageData(8, 8, 1, 1).data;
          // If solid opaque black, discard corrupted cache
          if (pixel[0] < 20 && pixel[1] < 20 && pixel[2] < 20 && pixel[3] > 240) {
            localStorage.removeItem('drawdesk_rough_illustration_cache');
            ctx.clearRect(0, 0, logicalWidth, logicalHeight);
            const blank = ctx.getImageData(0, 0, logicalWidth, logicalHeight);
            historyRef.current = [blank];
            historyIndexRef.current = 0;
            return;
          }
        }

        ctx.clearRect(0, 0, logicalWidth, logicalHeight);
        ctx.drawImage(img, 0, 0, logicalWidth, logicalHeight);
        const initial = ctx.getImageData(0, 0, logicalWidth, logicalHeight);
        historyRef.current = [initial];
        historyIndexRef.current = 0;
        setCanUndo(false);
        setCanRedo(false);
      };
      img.onerror = () => {
        localStorage.removeItem('drawdesk_rough_illustration_cache');
      };
      img.src = cached;
    } else {
      const blank = ctx.getImageData(0, 0, logicalWidth, logicalHeight);
      historyRef.current = [blank];
      historyIndexRef.current = 0;
      setCanUndo(false);
      setCanRedo(false);
    }
  }, [logicalWidth, logicalHeight]);

  // Native non-passive wheel listener for smooth zooming
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

  // Coordinate mapping from screen pointer to logical illustration canvas
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

  // Drawing segment routine for pencil & pen
  const drawSegment = (p1: Point, p2: Point) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const pressure = p2.pressure ?? 0.5;

    if (activeTool === 'pencil') {
      let strokeColor = 'rgba(40, 40, 42, 0.52)';
      if (pencilType === 'soft-graphite') {
        strokeColor = 'rgba(25, 25, 28, 0.72)';
      } else if (pencilType === 'col-erase-blue') {
        strokeColor = 'rgba(52, 120, 204, 0.60)';
      } else if (pencilType === 'carmine-red') {
        strokeColor = 'rgba(215, 55, 45, 0.60)';
      }

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = Math.max(1, brushSize * (0.6 + pressure * 0.7));

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Subtle graphite grain texture
      if (Math.random() > 0.35) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = Math.max(0.6, ctx.lineWidth * 0.65);
        ctx.beginPath();
        const jx = (Math.random() - 0.5) * 0.8;
        const jy = (Math.random() - 0.5) * 0.8;
        ctx.moveTo(p1.x + jx, p1.y + jy);
        ctx.lineTo(p2.x + jx, p2.y + jy);
        ctx.stroke();
      }
    } else if (activeTool === 'pen') {
      ctx.strokeStyle = penColor;
      ctx.fillStyle = penColor;
      ctx.lineWidth = Math.max(1, brushSize * (0.7 + pressure * 0.65));

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    } else if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = eraserSize * 2.5;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    ctx.restore();
  };

  // Lasso polygon extraction
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

    const offCanvas = document.createElement('canvas');
    offCanvas.width = w;
    offCanvas.height = h;
    const offCtx = offCanvas.getContext('2d');
    if (!offCtx) return;

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
    offCtx.drawImage(canvas, minX, minY, w, h, 0, 0, w, h);
    offCtx.restore();

    const imgData = offCtx.getImageData(0, 0, w, h);
    let hasPixels = false;
    for (let i = 3; i < imgData.data.length; i += 4) {
      if (imgData.data[i] > 10) {
        hasPixels = true;
        break;
      }
    }
    if (!hasPixels) return;

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
  };

  // Pointer event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
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

    if (selection) {
      commitSelection();
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getCoordinates(e);

    if (activeTool === 'lasso') {
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

    if (activeTool === 'lasso') {
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
    } catch {}

    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    if (activeTool === 'lasso' && isLassoDrawingRef.current) {
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

  // Drag & transform handles
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
    } catch {}

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
        const snap = Math.PI / 12;
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

  const handleTransformPointerUp = () => {
    dragStateRef.current.isDragging = false;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
      }

      if (cmdKey && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoomIn();
        return;
      }
      if (cmdKey && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        handleZoomOut();
        return;
      }
      if (cmdKey && e.key === '0') {
        e.preventDefault();
        handleResetZoom();
        return;
      }

      if (cmdKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if (cmdKey && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (cmdKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSavePng(true);
        return;
      }

      if (e.key.toLowerCase() === 'p') setActiveTool('pencil');
      else if (e.key.toLowerCase() === 'i') setActiveTool('pen');
      else if (e.key.toLowerCase() === 'e') setActiveTool('eraser');
      else if (e.key.toLowerCase() === 'l') setActiveTool('lasso');

      if (selectionRef.current) {
        if (e.key === 'Enter') {
          e.preventDefault();
          commitSelection();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelSelection();
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
          e.preventDefault();
          deleteSelection();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        isPanningRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleUndo,
    handleRedo,
    commitSelection,
    cancelSelection,
    deleteSelection,
  ]);

  // Export as PNG function
  const handleSavePng = (withBackground: boolean = true) => {
    if (selectionRef.current) {
      commitSelection();
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create high-resolution export canvas
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = logicalWidth;
    exportCanvas.height = logicalHeight;
    const expCtx = exportCanvas.getContext('2d');
    if (!expCtx) return;

    // Draw paper background if selected
    if (withBackground) {
      expCtx.fillStyle = PAPER_COLORS[paperTone].bg;
      expCtx.fillRect(0, 0, logicalWidth, logicalHeight);
    }

    // Draw artwork
    expCtx.drawImage(canvas, 0, 0);

    // Export to PNG blob download
    exportCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const now = new Date();
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
        now.getDate()
      ).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(
        now.getMinutes()
      ).padStart(2, '0')}`;
      a.href = url;
      a.download = `DrawDesk-Illustration-${timestamp}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(withBackground ? 'Saved Illustration as PNG' : 'Saved Transparent PNG');
      setShowExportMenu(false);
    }, 'image/png');
  };

  // Send current illustration to storyboard project as new frame
  const handleSendToStoryboard = () => {
    if (selectionRef.current) {
      commitSelection();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    if (onSendToStoryboard) {
      onSendToStoryboard(dataUrl);
      showToast('Sent illustration to Storyboard frame');
    }
  };

  return (
    <div
      className={`flex flex-col flex-1 w-full h-full overflow-hidden select-none transition-colors ${
        isDark ? 'bg-[#121214] text-zinc-100' : 'bg-[#E5E3DD] text-zinc-900'
      }`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-950/95 text-white border border-sky-500/80 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 text-xs font-semibold">
          <Sparkles className="w-4 h-4 text-sky-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Illustration Mode Navigation Bar */}
      <div
        className={`flex items-center justify-between px-3 sm:px-5 py-2 border-b shrink-0 z-30 transition-colors ${
          isDark ? 'bg-[#18181b] border-zinc-800' : 'bg-[#EDEAE3] border-zinc-300'
        }`}
      >
        {/* Left: Back button & Title */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            onClick={onBackToDesk}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              isDark
                ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-750'
                : 'bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-300'
            }`}
            title="Return to Storyboard Desk"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Storyboard Desk</span>
          </button>

          <div className="h-4 w-[1px] bg-zinc-300 dark:bg-zinc-700 mx-0.5" />

          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-sky-500/20 text-sky-500">
              <Palette className="w-3.5 h-3.5" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold tracking-tight">Illustration Mode</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-600 dark:text-sky-400 font-semibold uppercase">
                  Rough Sketch
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Canvas Format, Paper Tone, & Guides */}
        <div className="hidden md:flex items-center gap-2">
          {/* Paper Tone Selector */}
          <div className="flex items-center gap-1 p-1 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-200/50 dark:bg-zinc-900/50 text-[11px]">
            {(Object.keys(PAPER_COLORS) as PaperTone[]).map((tone) => (
              <button
                key={tone}
                onClick={() => setPaperTone(tone)}
                className={`px-2 py-0.5 rounded transition-all flex items-center gap-1.5 ${
                  paperTone === tone
                    ? 'bg-white dark:bg-zinc-800 font-bold shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200'
                }`}
                title={`Paper tone: ${PAPER_COLORS[tone].name}`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full border border-black/20"
                  style={{ backgroundColor: PAPER_COLORS[tone].bg }}
                />
                <span className="hidden lg:inline">{PAPER_COLORS[tone].name.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {/* Aspect Ratio Selector */}
          <div className="flex items-center gap-1 p-1 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-200/50 dark:bg-zinc-900/50 text-[11px]">
            {(Object.keys(ASPECT_RATIOS) as AspectRatioMode[]).map((ar) => (
              <button
                key={ar}
                onClick={() => setAspectRatio(ar)}
                className={`px-2 py-0.5 rounded transition-all font-mono font-semibold ${
                  aspectRatio === ar
                    ? 'bg-white dark:bg-zinc-800 text-sky-600 dark:text-sky-400 shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200'
                }`}
                title={`Aspect Ratio: ${ASPECT_RATIOS[ar].label}`}
              >
                {ar}
              </button>
            ))}
          </div>

          {/* Composition Guide Overlays */}
          <div className="flex items-center gap-1 p-1 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-200/50 dark:bg-zinc-900/50 text-[11px]">
            {[
              { id: 'none', label: 'No Guide' },
              { id: 'thirds', label: '1/3' },
              { id: 'crosshair', label: 'Cross' },
              { id: 'grid', label: 'Grid' },
            ].map((g) => (
              <button
                key={g.id}
                onClick={() => setGuideType(g.id as GuideType)}
                className={`px-1.5 py-0.5 rounded transition-all font-semibold ${
                  guideType === g.id
                    ? 'bg-white dark:bg-zinc-800 text-sky-600 dark:text-sky-400 shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200'
                }`}
                title={`Guide overlay: ${g.label}`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Save as PNG & Actions */}
        <div className="flex items-center gap-2">
          {/* Send to Storyboard Desk (if prop provided) */}
          {onSendToStoryboard && (
            <button
              onClick={handleSendToStoryboard}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-sky-400 border-zinc-700'
                  : 'bg-white hover:bg-zinc-50 text-sky-700 border-zinc-300'
              }`}
              title="Add this rough sketch as a storyboard frame"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Send to Desk</span>
            </button>
          )}

          {/* Primary Action: Save as PNG button */}
          <div className="relative">
            <div className="inline-flex rounded-lg shadow-sm">
              <button
                onClick={() => handleSavePng(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-l-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                title="Save Rough Illustration as PNG image"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Save as PNG</span>
              </button>

              <button
                onClick={() => setShowExportMenu((v) => !v)}
                className="px-1.5 py-1.5 rounded-r-lg bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white border-l border-emerald-600 transition-colors"
                title="More PNG Export Options"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Export Dropdown Menu */}
            {showExportMenu && (
              <div
                className={`absolute right-0 top-full mt-1.5 w-56 rounded-xl border p-1 shadow-2xl z-50 text-xs backdrop-blur-md animate-in fade-in duration-100 ${
                  isDark
                    ? 'bg-zinc-900/95 border-zinc-750 text-zinc-200'
                    : 'bg-white/95 border-zinc-300 text-zinc-800'
                }`}
              >
                <button
                  onClick={() => handleSavePng(true)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-sky-500/10 hover:text-sky-500 text-left font-medium transition-colors"
                >
                  <ImageIcon className="w-4 h-4 text-emerald-500" />
                  <div>
                    <div className="font-bold text-[11px]">Save as PNG (Paper)</div>
                    <div className="text-[10px] text-zinc-500">With {PAPER_COLORS[paperTone].name} tone</div>
                  </div>
                </button>

                <button
                  onClick={() => handleSavePng(false)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-sky-500/10 hover:text-sky-500 text-left font-medium transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-sky-500" />
                  <div>
                    <div className="font-bold text-[11px]">Save as Transparent PNG</div>
                    <div className="text-[10px] text-zinc-500">Linework only (No background)</div>
                  </div>
                </button>

                {onSendToStoryboard && (
                  <button
                    onClick={handleSendToStoryboard}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-sky-500/10 hover:text-sky-500 text-left font-medium border-t border-zinc-200 dark:border-zinc-800 transition-colors"
                  >
                    <Layers className="w-4 h-4 text-amber-500" />
                    <div>
                      <div className="font-bold text-[11px]">Add to Storyboard Project</div>
                      <div className="text-[10px] text-zinc-500">Insert as new storyboard frame</div>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Illustration Studio Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Separately Arranged Left Tool Palette Dock */}
        <aside
          className={`w-64 sm:w-72 border-r shrink-0 flex flex-col p-3 gap-3 overflow-y-auto select-none transition-colors z-20 ${
            isDark ? 'bg-[#18181b]/95 border-zinc-800' : 'bg-[#EFECE6]/95 border-zinc-300'
          }`}
        >
          {/* Quick Undo / Redo & Clear Row */}
          <div className="flex items-center justify-between pb-2 border-b border-zinc-300 dark:border-zinc-800">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-zinc-500">
              Drawing Tools
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={!canUndo}
                onClick={handleUndo}
                className={`p-1.5 rounded disabled:opacity-30 disabled:pointer-events-none transition-colors border shadow-2xs ${
                  isDark
                    ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                    : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300'
                }`}
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={!canRedo}
                onClick={handleRedo}
                className={`p-1.5 rounded disabled:opacity-30 disabled:pointer-events-none transition-colors border shadow-2xs ${
                  isDark
                    ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                    : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300'
                }`}
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleClear}
                className={`p-1.5 rounded transition-colors border shadow-2xs ${
                  isDark
                    ? 'bg-zinc-900 hover:bg-rose-950/70 text-zinc-400 hover:text-rose-300 border-zinc-800'
                    : 'bg-white hover:bg-rose-50 text-zinc-600 hover:text-rose-700 border-zinc-300'
                }`}
                title="Clear Drawing Canvas"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 1. Primary Drawing Utensil Selector */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
              Utensil
            </span>
            <div
              className={`grid grid-cols-4 gap-1 p-1 rounded-lg border ${
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-200/70 border-zinc-300'
              }`}
            >
              <button
                onClick={() => setActiveTool('pencil')}
                className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded text-xs font-semibold transition-all ${
                  activeTool === 'pencil'
                    ? isDark
                      ? 'bg-zinc-200 text-zinc-950 shadow-xs'
                      : 'bg-zinc-900 text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
                title="Pencil Tool: Graphite & Col-Erase (P)"
              >
                <Pencil className="w-4 h-4" />
                <span className="text-[10px]">Pencil</span>
              </button>

              <button
                onClick={() => setActiveTool('pen')}
                className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded text-xs font-semibold transition-all ${
                  activeTool === 'pen'
                    ? isDark
                      ? 'bg-zinc-200 text-zinc-950 shadow-xs'
                      : 'bg-zinc-900 text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
                title="Pen Tool: Fine Liner & Ink (I)"
              >
                <PenTool className="w-4 h-4" />
                <span className="text-[10px]">Pen</span>
              </button>

              <button
                onClick={() => setActiveTool('eraser')}
                className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded text-xs font-semibold transition-all ${
                  activeTool === 'eraser'
                    ? isDark
                      ? 'bg-zinc-200 text-zinc-950 shadow-xs'
                      : 'bg-zinc-900 text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
                title="Eraser (E)"
              >
                <Eraser className="w-4 h-4" />
                <span className="text-[10px]">Eraser</span>
              </button>

              <button
                onClick={() => setActiveTool('lasso')}
                className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded text-xs font-semibold transition-all ${
                  activeTool === 'lasso'
                    ? isDark
                      ? 'bg-zinc-200 text-zinc-950 shadow-xs'
                      : 'bg-zinc-900 text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
                title="Lasso Selection & Transform (L)"
              >
                <LassoSelect className="w-4 h-4" />
                <span className="text-[10px]">Lasso</span>
              </button>
            </div>
          </div>

          {/* 2. Tool Specific Variations */}
          {activeTool === 'pencil' && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                Pencil Lead Type
              </span>
              <div
                className={`grid grid-cols-2 gap-1 p-1 rounded-lg border text-xs ${
                  isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-200/70 border-zinc-300'
                }`}
              >
                {[
                  { id: 'graphite', label: '2B Graphite', color: '#52525b' },
                  { id: 'soft-graphite', label: '4B Dark', color: '#27272a' },
                  { id: 'col-erase-blue', label: 'Col-Erase Blue', color: '#2563eb' },
                  { id: 'carmine-red', label: 'Carmine Red', color: '#dc2626' },
                ].map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => setPencilType(lead.id as any)}
                    className={`py-1.5 px-2 rounded flex items-center gap-1.5 text-[11px] transition-colors ${
                      pencilType === lead.id
                        ? isDark
                          ? 'bg-zinc-800 text-zinc-100 font-bold border border-zinc-700 shadow-2xs'
                          : 'bg-white text-zinc-900 font-bold shadow-2xs border border-zinc-300'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                      style={{ backgroundColor: lead.color }}
                    />
                    <span className="truncate">{lead.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTool === 'pen' && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                Ink Color Swatches
              </span>
              <div
                className={`grid grid-cols-5 gap-1.5 p-2 rounded-lg border ${
                  isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-200/70 border-zinc-300'
                }`}
              >
                {[
                  { color: '#161616', name: 'India Black' },
                  { color: '#3d2516', name: 'Sepia Brown' },
                  { color: '#1e3a8a', name: 'Draft Navy' },
                  { color: '#14532d', name: 'Hunter Green' },
                  { color: '#7f1d1d', name: 'Crimson' },
                ].map((c) => (
                  <button
                    key={c.color}
                    onClick={() => setPenColor(c.color)}
                    className={`w-7 h-7 rounded-md border flex items-center justify-center transition-transform ${
                      penColor === c.color ? 'scale-115 ring-2 ring-sky-500 shadow-xs' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.color }}
                    title={c.name}
                  >
                    {penColor === c.color && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. Brush / Eraser Size Control */}
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                {activeTool === 'eraser' ? 'Eraser Size' : 'Stroke Size'}
              </span>
              <span className="font-bold text-sky-600 dark:text-sky-400">
                {activeTool === 'eraser' ? `${eraserSize}px` : `${brushSize}px`}
              </span>
            </div>

            {/* Quick Size Presets */}
            <div className="grid grid-cols-4 gap-1 text-[11px] font-mono">
              {[2, 4, 8, 16].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    if (activeTool === 'eraser') setEraserSize(s * 2);
                    else setBrushSize(s);
                  }}
                  className={`py-1 rounded border transition-colors ${
                    (activeTool === 'eraser' ? eraserSize === s * 2 : brushSize === s)
                      ? isDark
                        ? 'bg-zinc-800 text-sky-400 border-zinc-700 font-bold'
                        : 'bg-white text-sky-600 border-zinc-300 font-bold'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  {s}px
                </button>
              ))}
            </div>

            {/* Range Slider */}
            <input
              type="range"
              min={activeTool === 'eraser' ? 4 : 1}
              max={activeTool === 'eraser' ? 60 : 36}
              value={activeTool === 'eraser' ? eraserSize : brushSize}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (activeTool === 'eraser') setEraserSize(val);
                else setBrushSize(val);
              }}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>

          {/* 4. Canvas Quick Actions & Shortcuts Card */}
          <div className="mt-auto pt-3 border-t border-zinc-300 dark:border-zinc-800 flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
              <span>Hotkeys</span>
              <span>DrawDesk</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-zinc-500">
              <div>• <strong>P</strong> Pencil</div>
              <div>• <strong>I</strong> Pen</div>
              <div>• <strong>E</strong> Eraser</div>
              <div>• <strong>L</strong> Lasso</div>
              <div>• <strong>Space</strong> Pan</div>
              <div>• <strong>Ctrl+S</strong> Save</div>
            </div>
          </div>
        </aside>

        {/* Center: Rough Illustration Canvas Window */}
        <main
          ref={containerRef}
          className={`flex-1 relative overflow-hidden flex items-center justify-center p-4 sm:p-6 transition-colors ${
            isPanToolActive || isSpacePressed
              ? isPanningRef.current
                ? 'cursor-grabbing'
                : 'cursor-grab'
              : ''
          }`}
          style={{
            backgroundColor: isDark ? '#141417' : '#DEDAD2',
            backgroundImage: isDark
              ? `radial-gradient(#26262b 1px, transparent 1px)`
              : `radial-gradient(#c8c4bc 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        >
          {/* Pinned Selection Action Header (When Lasso active) */}
          {selection && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950/95 text-white shadow-2xl border border-sky-500/80 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150 pointer-events-auto text-xs">
              <div className="flex items-center gap-1.5 pr-2.5 border-r border-zinc-700/80">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
                <span className="text-[11px] font-bold tracking-wide uppercase text-sky-400 whitespace-nowrap">
                  Selection Active
                </span>
              </div>

              <button
                onClick={commitSelection}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow-md transition-all active:scale-95"
                title="Apply Transform (Enter)"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Apply (Enter)</span>
              </button>

              <button
                onClick={cancelSelection}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-medium text-xs transition-colors"
                title="Cancel Transform (Esc)"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>

              <div className="w-[1px] h-4 bg-zinc-700 mx-1" />

              <button
                onClick={duplicateSelection}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-sky-950/80 hover:bg-sky-900 border border-sky-700/60 text-sky-300 font-medium text-xs transition-colors"
                title="Duplicate Selection (Ctrl+D)"
              >
                <CopyPlus className="w-3.5 h-3.5" />
                <span>Duplicate</span>
              </button>

              <button
                onClick={flipHorizontal}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
                title="Flip Horizontal"
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>

              <button
                onClick={flipVertical}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
                title="Flip Vertical"
              >
                <FlipVertical className="w-4 h-4" />
              </button>

              <button
                onClick={deleteSelection}
                className="p-1.5 rounded-lg hover:bg-rose-950 text-zinc-400 hover:text-rose-400 transition-colors"
                title="Delete Selection (Del)"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Floating Canvas Zoom & Pan HUD */}
          <div className="absolute bottom-4 right-4 z-40 flex items-center gap-1 px-2 py-1.5 rounded-xl bg-zinc-950/85 text-white shadow-2xl border border-zinc-750 backdrop-blur-md text-xs select-none pointer-events-auto">
            <button
              onClick={() => setIsPanToolActive((v) => !v)}
              className={`p-1.5 rounded-lg transition-colors ${
                isPanToolActive ? 'bg-sky-500 text-zinc-950 font-bold' : 'text-zinc-300 hover:text-white hover:bg-zinc-800'
              }`}
              title="Hand / Pan Tool (or hold Space + Drag)"
            >
              <Hand className="w-3.5 h-3.5" />
            </button>

            <div className="w-[1px] h-3.5 bg-zinc-700 mx-0.5" />

            <button
              onClick={handleZoomOut}
              disabled={zoom <= 0.25}
              className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Zoom Out (Ctrl -)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleResetZoom}
              className="px-2 py-1 rounded-md text-[11px] font-mono font-bold text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Reset Zoom to 100% (Ctrl 0)"
            >
              {Math.round(zoom * 100)}%
            </button>

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
                  title="Reset View"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </>
            )}
          </div>

          {/* Interactive Zoom & Pan Drawing Window Frame */}
          <div
            className="relative transition-transform duration-75 ease-out shadow-2xl rounded-sm"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              width: `${logicalWidth}px`,
              height: `${logicalHeight}px`,
              maxWidth: '92vw',
              maxHeight: '85vh',
              aspectRatio: `${logicalWidth}/${logicalHeight}`,
            }}
          >
            {/* The Illustration Paper Sheet */}
            <div
              className="w-full h-full relative rounded-sm border shadow-xl overflow-hidden select-none"
              style={{
                backgroundColor: PAPER_COLORS[paperTone].bg,
                borderColor: PAPER_COLORS[paperTone].border,
              }}
            >
              {/* Composition Guides */}
              {guideType === 'thirds' && (
                <div className="absolute inset-0 pointer-events-none z-10 grid grid-cols-3 grid-rows-3 border border-sky-400/20">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="border border-sky-400/25 relative">
                      {/* Intersection cross tick */}
                      <div className="absolute top-0 left-0 w-2 h-2 -translate-x-1/2 -translate-y-1/2 border-t border-l border-sky-500/50" />
                    </div>
                  ))}
                </div>
              )}

              {guideType === 'crosshair' && (
                <div className="absolute inset-0 pointer-events-none z-10">
                  <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-sky-500/30" />
                  <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-sky-500/30" />
                  {/* Diagonal guides */}
                  <svg className="w-full h-full">
                    <line x1="0" y1="0" x2="100%" y2="100%" stroke="rgba(14, 165, 233, 0.15)" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1="100%" y1="0" x2="0" y2="100%" stroke="rgba(14, 165, 233, 0.15)" strokeWidth="1" strokeDasharray="4 4" />
                  </svg>
                </div>
              )}

              {guideType === 'grid' && (
                <div className="absolute inset-0 pointer-events-none z-10 grid grid-cols-12 grid-rows-8 border border-zinc-400/20">
                  {Array.from({ length: 96 }).map((_, i) => (
                    <div key={i} className="border border-zinc-400/15" />
                  ))}
                </div>
              )}

              {/* ACTIVE DRAWING CANVAS ELEMENT */}
              <canvas
                ref={canvasRef}
                width={logicalWidth}
                height={logicalHeight}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="relative z-20 w-full h-full object-contain touch-none cursor-crosshair"
              />

              {/* Real-time Lasso Loop Overlay */}
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

              {/* Interactive Transform Bounding Box */}
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
                  <img
                    src={selection.dataUrl}
                    alt="Transformed drawing"
                    className="w-full h-full block pointer-events-none select-none"
                    draggable={false}
                  />

                  {/* Bounding Box Outline */}
                  <div className="absolute inset-0 border border-dashed border-sky-400 pointer-events-none shadow-xs" />

                  {/* Move Zone */}
                  <div
                    onPointerDown={(e) => handleTransformPointerDown(e, 'move')}
                    onPointerMove={handleTransformPointerMove}
                    onPointerUp={handleTransformPointerUp}
                    className="absolute inset-0 cursor-move pointer-events-auto bg-sky-400/5 hover:bg-sky-400/15"
                    title="Drag to Move"
                  />

                  {/* Rotation Handle Knob */}
                  <div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center"
                    style={{
                      transform: `scale(${1 / Math.abs(selection.scaleX || 1)}, ${
                        1 / Math.abs(selection.scaleY || 1)
                      })`,
                      transformOrigin: 'bottom center',
                    }}
                  >
                    <div
                      onPointerDown={(e) => handleTransformPointerDown(e, 'rotate')}
                      onPointerMove={handleTransformPointerMove}
                      onPointerUp={handleTransformPointerUp}
                      className="w-5 h-5 rounded-full bg-white border-2 border-sky-500 shadow-md cursor-grab active:cursor-grabbing pointer-events-auto flex items-center justify-center hover:scale-125 transition-transform"
                      title="Drag to Rotate"
                    >
                      <RotateCcw className="w-2.5 h-2.5 text-sky-600 stroke-[2.5]" />
                    </div>
                    <div className="w-[1.5px] h-5 bg-sky-500" />
                  </div>

                  {/* Corner Scale Handles */}
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
                      className={`absolute ${h.pos} ${h.cursor} w-3 h-3 bg-white border-2 border-sky-600 rounded-xs shadow-xs pointer-events-auto hover:scale-125 transition-transform`}
                      style={{
                        transform: `scale(${1 / Math.abs(selection.scaleX || 1)}, ${
                          1 / Math.abs(selection.scaleY || 1)
                        })`,
                      }}
                      title="Drag to Scale"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

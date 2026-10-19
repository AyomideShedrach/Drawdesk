import React, { useState, useEffect } from 'react';
import {
  Pencil,
  PenTool,
  Eraser,
  LassoSelect,
  Undo2,
  Redo2,
  Trash2,
  Lightbulb,
  Play,
  Square,
  Volume2,
  VolumeX,
  Grid3X3,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Move,
  RotateCcw,
  Compass,
  Sliders,
  ClipboardPaste,
  ZoomIn,
  ZoomOut,
  Check,
  X,
  Copy,
  CopyPlus,
  Scissors,
  FlipHorizontal,
  FlipVertical,
  Palette,
} from 'lucide-react';
import { ToolSettings, OnionSkinSettings, PerspectiveConfig, PerspectiveMode } from '../types/storyboard';
import {
  subscribeLassoClipboard,
  triggerLassoPaste,
  subscribeActiveSelection,
  triggerLassoApply,
  triggerLassoCancel,
  triggerLassoDuplicate,
  triggerLassoFlipH,
  triggerLassoFlipV,
  triggerLassoDelete,
  triggerLassoCopy,
  triggerLassoCut,
  triggerZoomIn,
  triggerZoomOut,
  triggerZoomReset,
} from '../utils/lassoClipboard';

interface ToolDockProps {
  toolSettings: ToolSettings;
  onChangeToolSettings: (settings: Partial<ToolSettings>) => void;
  onionSettings: OnionSkinSettings;
  onChangeOnionSettings: (settings: Partial<OnionSkinSettings>) => void;
  showFieldGrid: boolean;
  onToggleFieldGrid: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClearCanvas: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackFps: number;
  onChangeFps: (fps: number) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onFlipForward: () => void;
  onFlipBackward: () => void;
  currentFrameIndex: number;
  totalFrames: number;
  perspectiveConfig: PerspectiveConfig;
  onChangePerspectiveConfig: (newConfig: Partial<PerspectiveConfig>) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenIllustrationMode?: () => void;
}

export const ToolDock: React.FC<ToolDockProps> = ({
  toolSettings,
  onChangeToolSettings,
  onionSettings,
  onChangeOnionSettings,
  showFieldGrid,
  onToggleFieldGrid,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClearCanvas,
  isPlaying,
  onTogglePlay,
  playbackFps,
  onChangeFps,
  soundEnabled,
  onToggleSound,
  onFlipForward,
  onFlipBackward,
  currentFrameIndex,
  totalFrames,
  perspectiveConfig,
  onChangePerspectiveConfig,
  theme,
  onToggleTheme,
  onOpenIllustrationMode,
}) => {
  const isDark = theme === 'dark';
  const [showPerspectiveMenu, setShowPerspectiveMenu] = useState(false);
  const [hasClipboard, setHasClipboard] = useState(false);
  const [hasActiveSelection, setHasActiveSelection] = useState(false);

  useEffect(() => {
    const unsubClip = subscribeLassoClipboard(setHasClipboard);
    const unsubSel = subscribeActiveSelection(setHasActiveSelection);
    return () => {
      unsubClip();
      unsubSel();
    };
  }, []);

  const resetPerspective = () => {
    onChangePerspectiveConfig({
      horizonY: 270,
      vp1: { x: 480, y: 270 },
      vp2: { x: 920, y: 270 },
      vp3: { x: 480, y: -100 },
      groundPlane: {
        originX: 480,
        originY: 460,
        width: 800,
        depth: 400,
        divisions: 12,
      },
    });
  };

  return (
    <div
      className={`w-full flex flex-col gap-3 rounded-xl p-3 sm:p-3.5 shadow-md backdrop-blur-xs select-none transition-colors border ${
        isDark
          ? 'bg-[#18181b]/95 border-zinc-800 text-zinc-200'
          : 'bg-[#EFECE6]/95 border-zinc-300 text-zinc-800'
      }`}
    >
      {/* Dock Header: Title & Quick Canvas Utilities */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-300/80 dark:border-zinc-800">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Desk Tools
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            P {currentFrameIndex + 1}/{totalFrames}
          </span>
        </div>

        {/* Quick Undo / Redo / Zoom / Field Grid / Clear / Theme Icons */}
        <div className="flex items-center gap-1">
          <button
            disabled={!canUndo}
            onClick={onUndo}
            className={`p-1.5 rounded disabled:opacity-30 disabled:pointer-events-none transition-colors border shadow-2xs ${
              isDark
                ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300'
            }`}
            title="Undo Stroke (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          <button
            disabled={!canRedo}
            onClick={onRedo}
            className={`p-1.5 rounded disabled:opacity-30 disabled:pointer-events-none transition-colors border shadow-2xs ${
              isDark
                ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300'
            }`}
            title="Redo Stroke (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-3.5 bg-zinc-300 dark:bg-zinc-800 mx-0.5" />

          {/* Canvas Zoom In & Out */}
          <button
            onClick={() => triggerZoomOut()}
            className={`p-1.5 rounded transition-colors border shadow-2xs ${
              isDark
                ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300'
            }`}
            title="Zoom Out Canvas (Ctrl -)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => triggerZoomIn()}
            className={`p-1.5 rounded transition-colors border shadow-2xs ${
              isDark
                ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300'
            }`}
            title="Zoom In Canvas (Ctrl +)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-3.5 bg-zinc-300 dark:bg-zinc-800 mx-0.5" />

          <button
            onClick={onToggleFieldGrid}
            className={`p-1.5 rounded transition-colors border shadow-2xs ${
              showFieldGrid
                ? isDark
                  ? 'bg-zinc-200 text-zinc-950 border-zinc-200 shadow-2xs'
                  : 'bg-zinc-900 text-white border-zinc-900 shadow-2xs'
                : isDark
                ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border-zinc-800'
                : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-300'
            }`}
            title="Toggle 12-Field Animation Chart Grid (G)"
          >
            <Grid3X3 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClearCanvas}
            className={`p-1.5 rounded transition-colors border shadow-2xs ${
              isDark
                ? 'bg-zinc-900 hover:bg-rose-950/70 text-zinc-400 hover:text-rose-300 border-zinc-800'
                : 'bg-white hover:bg-rose-50 text-zinc-600 hover:text-rose-700 border-zinc-300'
            }`}
            title="Clear Current Drawing"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onToggleTheme}
            className={`p-1.5 rounded transition-colors border shadow-2xs ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-amber-300 border-zinc-700'
                : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300'
            }`}
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5 text-zinc-700" />}
          </button>
        </div>
      </div>

      {/* Prominent Active Lasso Selection Options Card (Always Easily Seen) */}
      {hasActiveSelection && (
        <div className="flex flex-col gap-2 p-2.5 rounded-xl border border-sky-500 bg-sky-500/10 text-xs shadow-md animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-[11px] text-sky-600 dark:text-sky-400">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
              <span>Selection Active</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 font-semibold">
              Enter to Apply
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => triggerLassoApply()}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors"
              title="Apply Transform (Enter)"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Apply (Enter)</span>
            </button>
            <button
              onClick={() => triggerLassoCancel()}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
              title="Cancel Transform (Esc)"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel (Esc)</span>
            </button>
          </div>

          {/* Quick Selection Transform Actions */}
          <div className="grid grid-cols-5 gap-1 pt-1.5 border-t border-sky-400/20 text-center">
            <button
              onClick={() => triggerLassoDuplicate()}
              className="p-1.5 rounded hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 flex flex-col items-center gap-0.5 transition-colors"
              title="Duplicate Selection (Ctrl+D)"
            >
              <CopyPlus className="w-3.5 h-3.5" />
              <span className="text-[9px] font-medium">Dup</span>
            </button>
            <button
              onClick={() => triggerLassoCopy()}
              className="p-1.5 rounded hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 flex flex-col items-center gap-0.5 transition-colors"
              title="Copy Selection (Ctrl+C)"
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[9px] font-medium">Copy</span>
            </button>
            <button
              onClick={() => triggerLassoFlipH()}
              className="p-1.5 rounded hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 flex flex-col items-center gap-0.5 transition-colors"
              title="Flip Horizontal"
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
              <span className="text-[9px] font-medium">Flip H</span>
            </button>
            <button
              onClick={() => triggerLassoFlipV()}
              className="p-1.5 rounded hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 flex flex-col items-center gap-0.5 transition-colors"
              title="Flip Vertical"
            >
              <FlipVertical className="w-3.5 h-3.5" />
              <span className="text-[9px] font-medium">Flip V</span>
            </button>
            <button
              onClick={() => triggerLassoDelete()}
              className="p-1.5 rounded hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex flex-col items-center gap-0.5 transition-colors"
              title="Delete Selection (Del)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="text-[9px] font-medium">Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Dedicated Illustration Mode Button */}
      {onOpenIllustrationMode && (
        <button
          onClick={onOpenIllustrationMode}
          className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all shadow-xs group ${
            isDark
              ? 'bg-gradient-to-r from-sky-950/70 to-indigo-950/60 hover:from-sky-900/80 hover:to-indigo-900/70 border-sky-800/80 text-sky-200'
              : 'bg-gradient-to-r from-sky-50 to-indigo-50 hover:from-sky-100 hover:to-indigo-100 border-sky-300 text-sky-950'
          }`}
          title="Open rough illustration studio with separated drawing utensils and PNG export"
        >
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-sky-500/20 text-sky-500 group-hover:scale-105 transition-transform">
              <Palette className="w-4 h-4" />
            </span>
            <div className="text-left">
              <div className="text-xs font-bold flex items-center gap-1.5">
                <span>Illustration Mode</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-600 dark:text-sky-300 font-semibold uppercase">
                  Studio
                </span>
              </div>
              <div className="text-[10px] opacity-75 leading-tight">
                Rough sketching window &amp; PNG export
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
        </button>
      )}

      {/* 1. Drawing Utensil Selection: Pencil / Pen / Eraser / Lasso */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Utensil
        </span>
        <div
          className={`grid grid-cols-4 gap-1 p-1 rounded-lg border ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-200/70 border-zinc-300'
          }`}
        >
          {/* Pencil Tool */}
          <button
            onClick={() => onChangeToolSettings({ tool: 'pencil' })}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 px-1.5 rounded text-xs font-semibold transition-all ${
              toolSettings.tool === 'pencil'
                ? isDark
                  ? 'bg-zinc-200 text-zinc-950 shadow-xs'
                  : 'bg-zinc-900 text-white shadow-xs'
                : isDark
                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                : 'text-zinc-700 hover:text-zinc-950 hover:bg-zinc-300/80'
            }`}
            title="Pencil Tool: Graphite & Col-Erase (P)"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span className="text-[11px]">Pencil</span>
          </button>

          {/* Pen Tool */}
          <button
            onClick={() => onChangeToolSettings({ tool: 'pen' })}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 px-1.5 rounded text-xs font-semibold transition-all ${
              toolSettings.tool === 'pen'
                ? isDark
                  ? 'bg-zinc-200 text-zinc-950 shadow-xs'
                  : 'bg-zinc-900 text-white shadow-xs'
                : isDark
                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                : 'text-zinc-700 hover:text-zinc-950 hover:bg-zinc-300/80'
            }`}
            title="Pen Tool: India Ink Liner (I)"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span className="text-[11px]">Pen</span>
          </button>

          {/* Eraser */}
          <button
            onClick={() => onChangeToolSettings({ tool: 'eraser' })}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 px-1.5 rounded text-xs font-semibold transition-all ${
              toolSettings.tool === 'eraser'
                ? isDark
                  ? 'bg-zinc-200 text-zinc-950 shadow-xs'
                  : 'bg-zinc-900 text-white shadow-xs'
                : isDark
                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                : 'text-zinc-700 hover:text-zinc-950 hover:bg-zinc-300/80'
            }`}
            title="Eraser (E)"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span className="text-[11px]">Eraser</span>
          </button>

          {/* Lasso Transform Tool */}
          <button
            onClick={() => onChangeToolSettings({ tool: 'lasso' })}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 px-1.5 rounded text-xs font-semibold transition-all ${
              toolSettings.tool === 'lasso'
                ? isDark
                  ? 'bg-zinc-200 text-zinc-950 shadow-xs'
                  : 'bg-zinc-900 text-white shadow-xs'
                : isDark
                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                : 'text-zinc-700 hover:text-zinc-950 hover:bg-zinc-300/80'
            }`}
            title="Lasso Tool: Select to Move, Scale & Rotate (L)"
          >
            <LassoSelect className="w-3.5 h-3.5" />
            <span className="text-[11px]">Lasso</span>
          </button>
        </div>
      </div>

      {/* Lasso Transform Guidance Card */}
      {toolSettings.tool === 'lasso' && (
        <div className="flex flex-col gap-2 p-2.5 rounded-lg border border-sky-500/30 bg-sky-500/5 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-[11px] text-sky-600 dark:text-sky-400">
              <LassoSelect className="w-3.5 h-3.5" />
              <span>Lasso & Transform</span>
            </div>
            {hasClipboard && (
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-700 dark:text-sky-300 font-semibold">
                Copied
              </span>
            )}
          </div>

          <p className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
            Draw a loop around artwork to move, scale, rotate, copy, or cut.
          </p>

          {/* Paste Button */}
          <button
            onClick={() => triggerLassoPaste()}
            disabled={!hasClipboard}
            className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded text-xs font-semibold transition-all border shadow-2xs ${
              hasClipboard
                ? isDark
                  ? 'bg-sky-950 text-sky-200 border-sky-800 hover:bg-sky-900 shadow-xs'
                  : 'bg-white text-sky-900 border-sky-400 hover:bg-sky-50 shadow-xs'
                : 'opacity-40 pointer-events-none border-zinc-300 dark:border-zinc-800 text-zinc-500'
            }`}
            title={hasClipboard ? 'Paste Copied Artwork (Ctrl+V)' : 'Copy artwork first with Lasso'}
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>{hasClipboard ? 'Paste Artwork (Ctrl+V)' : 'Clipboard Empty'}</span>
          </button>

          <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-800/80 pt-1.5">
            <div>• <strong className="text-zinc-700 dark:text-zinc-300">Ctrl+C</strong> Copy</div>
            <div>• <strong className="text-zinc-700 dark:text-zinc-300">Ctrl+V</strong> Paste</div>
            <div>• <strong className="text-zinc-700 dark:text-zinc-300">Ctrl+X</strong> Cut</div>
            <div>• <strong className="text-zinc-700 dark:text-zinc-300">Ctrl+D</strong> Duplicate</div>
          </div>
        </div>
      )}

      {/* 2. Tool Variants (Pencil Leads or Pen Ink Colors) */}
      {toolSettings.tool === 'pencil' && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Lead Type
          </span>
          <div
            className={`grid grid-cols-3 gap-1 p-1 rounded-lg border text-xs ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-200/70 border-zinc-300'
            }`}
          >
            <button
              onClick={() => onChangeToolSettings({ pencilType: 'graphite' })}
              className={`py-1 px-1 rounded transition-colors flex items-center justify-center gap-1 text-[11px] ${
                toolSettings.pencilType === 'graphite'
                  ? isDark
                    ? 'bg-zinc-800 text-zinc-100 font-bold border border-zinc-700 shadow-2xs'
                    : 'bg-white text-zinc-900 font-bold shadow-2xs border border-zinc-300'
                  : isDark
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-zinc-700 hover:text-zinc-950'
              }`}
              title="2B Graphite Lead"
            >
              <span className="w-2 h-2 rounded-full bg-zinc-500 border border-zinc-400" />
              <span>2B Lead</span>
            </button>

            <button
              onClick={() => onChangeToolSettings({ pencilType: 'col-erase-blue' })}
              className={`py-1 px-1 rounded transition-colors flex items-center justify-center gap-1 text-[11px] ${
                toolSettings.pencilType === 'col-erase-blue'
                  ? isDark
                    ? 'bg-sky-950 text-sky-200 font-bold border border-sky-800 shadow-2xs'
                    : 'bg-white text-sky-800 font-bold shadow-2xs border border-sky-300'
                  : isDark
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-zinc-700 hover:text-zinc-950'
              }`}
              title="Col-Erase Blue"
            >
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              <span>Col-Erase</span>
            </button>

            <button
              onClick={() => onChangeToolSettings({ pencilType: 'carmine-red' })}
              className={`py-1 px-1 rounded transition-colors flex items-center justify-center gap-1 text-[11px] ${
                toolSettings.pencilType === 'carmine-red'
                  ? isDark
                    ? 'bg-rose-950 text-rose-200 font-bold border border-rose-800 shadow-2xs'
                    : 'bg-white text-rose-800 font-bold shadow-2xs border border-rose-300'
                  : isDark
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-zinc-700 hover:text-zinc-950'
              }`}
              title="Carmine Red"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Carmine</span>
            </button>
          </div>
        </div>
      )}

      {toolSettings.tool === 'pen' && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Ink Shade
          </span>
          <div
            className={`grid grid-cols-2 gap-1 p-1 rounded-lg border text-xs ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-200/70 border-zinc-300'
            }`}
          >
            <button
              onClick={() => onChangeToolSettings({ penColor: '#161616' })}
              className={`py-1 px-2 rounded transition-colors flex items-center justify-center gap-1.5 text-[11px] ${
                toolSettings.penColor === '#161616'
                  ? isDark
                    ? 'bg-zinc-800 text-zinc-100 font-bold border border-zinc-700 shadow-2xs'
                    : 'bg-white text-zinc-900 font-bold shadow-2xs border border-zinc-300'
                  : isDark
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-zinc-700 hover:text-zinc-950'
              }`}
              title="Black Ink"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-950 border border-zinc-700" />
              <span>Black</span>
            </button>

            <button
              onClick={() => onChangeToolSettings({ penColor: '#3d2516' })}
              className={`py-1 px-2 rounded transition-colors flex items-center justify-center gap-1.5 text-[11px] ${
                toolSettings.penColor === '#3d2516'
                  ? isDark
                    ? 'bg-amber-950 text-amber-200 font-bold border border-amber-800 shadow-2xs'
                    : 'bg-white text-amber-950 font-bold shadow-2xs border border-zinc-300'
                  : isDark
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-zinc-700 hover:text-zinc-950'
              }`}
              title="Sepia Ink"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#3d2516]" />
              <span>Sepia</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Stroke Width Selector */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Stroke Weight
        </span>
        <div
          className={`grid grid-cols-3 gap-1 p-1 rounded-lg border text-xs ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-200/70 border-zinc-300'
          }`}
        >
          {[
            { label: 'Fine', size: 1.8, sub: '1.8px' },
            { label: 'Med', size: 3.5, sub: '3.5px' },
            { label: 'Bold', size: 7.0, sub: '7.0px' },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => onChangeToolSettings({ size: item.size })}
              className={`py-1 px-1 rounded transition-colors flex flex-col items-center font-mono font-medium ${
                Math.abs(toolSettings.size - item.size) < 0.5
                  ? isDark
                    ? 'bg-zinc-200 text-zinc-950 font-bold shadow-2xs'
                    : 'bg-zinc-900 text-white font-bold shadow-2xs'
                  : isDark
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-zinc-700 hover:text-zinc-950'
              }`}
            >
              <span className="text-xs">{item.label}</span>
              <span className="text-[9px] opacity-75">{item.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Perspective & Ground Grid */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Perspective & Guide Grid
        </span>
        <div className="relative">
          <div
            className={`flex items-center justify-between gap-1 p-1 rounded-lg border text-xs ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-200/70 border-zinc-300'
            }`}
          >
            {/* Perspective Mode Button */}
            <button
              onClick={() => setShowPerspectiveMenu(!showPerspectiveMenu)}
              className={`flex-1 flex items-center justify-between px-2 py-1.5 rounded transition-all font-semibold ${
                perspectiveConfig.mode !== 'none'
                  ? isDark
                    ? 'bg-sky-950 text-sky-300 border border-sky-800 shadow-2xs'
                    : 'bg-white text-sky-900 border border-sky-400 shadow-2xs'
                  : isDark
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-zinc-700 hover:text-zinc-950'
              }`}
              title="Select Perspective Mode"
            >
              <div className="flex items-center gap-1.5 truncate">
                <Compass className="w-3.5 h-3.5 shrink-0" />
                <span className="capitalize truncate text-xs">
                  {perspectiveConfig.mode === 'none'
                    ? 'None (Freehand)'
                    : perspectiveConfig.mode === 'ground-grid'
                    ? 'Ground Grid'
                    : perspectiveConfig.mode}
                </span>
              </div>
              <Sliders className="w-3 h-3 text-zinc-400 shrink-0" />
            </button>

            {perspectiveConfig.mode !== 'none' && (
              <>
                <button
                  onClick={() =>
                    onChangePerspectiveConfig({ showHandles: !perspectiveConfig.showHandles })
                  }
                  className={`p-1.5 rounded transition-colors ${
                    perspectiveConfig.showHandles
                      ? isDark
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'bg-white text-zinc-900 shadow-2xs border border-zinc-300'
                      : isDark
                      ? 'text-zinc-500 hover:text-zinc-300'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                  title={
                    perspectiveConfig.showHandles
                      ? 'Hide Draggable Handles'
                      : 'Show Draggable Handles'
                  }
                >
                  <Move className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={resetPerspective}
                  className={`p-1.5 rounded transition-colors ${
                    isDark
                      ? 'text-zinc-500 hover:text-zinc-200'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                  title="Reset Vanishing Points"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Perspective Mode Menu Dropdown */}
          {showPerspectiveMenu && (
            <div
              className={`absolute top-full mt-1.5 left-0 right-0 rounded-lg p-2 shadow-xl border z-50 text-xs flex flex-col gap-1 ${
                isDark
                  ? 'bg-zinc-900 border-zinc-700 text-zinc-200'
                  : 'bg-white border-zinc-300 text-zinc-800'
              }`}
            >
              <div className="px-2 py-1 text-[10px] font-mono font-bold text-zinc-500 uppercase">
                Select Grid Mode
              </div>

              {(
                [
                  { mode: 'none', label: 'None (No grid)' },
                  { mode: 'ground-grid', label: 'Ground Grid (Floor)' },
                  { mode: '1-point', label: '1-Point Perspective' },
                  { mode: '2-point', label: '2-Point Perspective' },
                  { mode: '3-point', label: '3-Point Perspective' },
                  { mode: 'isometric', label: 'Isometric Grid (30°/60°)' },
                ] as { mode: PerspectiveMode; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.mode}
                  onClick={() => {
                    onChangePerspectiveConfig({ mode: opt.mode });
                    setShowPerspectiveMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded transition-colors flex items-center justify-between ${
                    perspectiveConfig.mode === opt.mode
                      ? isDark
                        ? 'bg-zinc-800 text-white font-bold'
                        : 'bg-zinc-200 text-zinc-950 font-bold'
                      : isDark
                      ? 'hover:bg-zinc-800/60 text-zinc-300'
                      : 'hover:bg-zinc-100 text-zinc-700'
                  }`}
                >
                  <span>{opt.label}</span>
                  {perspectiveConfig.mode === opt.mode && (
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  )}
                </button>
              ))}

              {perspectiveConfig.mode !== 'none' && (
                <div className="mt-1 pt-1.5 border-t border-zinc-200 dark:border-zinc-800 px-2 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500">Opacity:</span>
                  <input
                    type="range"
                    min="0.15"
                    max="0.85"
                    step="0.05"
                    value={perspectiveConfig.opacity}
                    onChange={(e) =>
                      onChangePerspectiveConfig({ opacity: parseFloat(e.target.value) })
                    }
                    className="w-24 accent-sky-500 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded cursor-pointer"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 5. Light Table & Onion Skinning Controls */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Light Table & Onion Skin
          </span>
          <span className="text-[10px] font-mono font-medium text-sky-600 dark:text-sky-400">
            {onionSettings.enabled ? `${onionSettings.prevFramesCount || 2} Prev Visible` : 'Off'}
          </span>
        </div>

        <div
          className={`flex flex-col gap-2 p-2 rounded-lg border text-xs ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-200/70 border-zinc-300'
          }`}
        >
          {/* Main Toggle and Color Coded Button */}
          <div className="flex items-center justify-between gap-1">
            <button
              onClick={() =>
                onChangeOnionSettings({
                  enabled: !onionSettings.enabled,
                  lightTableBulb: !onionSettings.enabled,
                })
              }
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded transition-all font-semibold ${
                onionSettings.enabled
                  ? isDark
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-2xs'
                    : 'bg-white text-zinc-900 border border-zinc-300 shadow-2xs'
                  : isDark
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-zinc-700 hover:text-zinc-950'
              }`}
              title="Toggle Light Table Backlight (O)"
            >
              <Lightbulb
                className={`w-3.5 h-3.5 ${
                  onionSettings.enabled
                    ? isDark
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-amber-600 fill-amber-600'
                    : 'text-zinc-500'
                }`}
              />
              <span>{onionSettings.enabled ? 'Light Table On' : 'Light Table Off'}</span>
            </button>

            {onionSettings.enabled && (
              <button
                onClick={() => onChangeOnionSettings({ colorCoded: !onionSettings.colorCoded })}
                className={`py-1.5 px-2 rounded text-[11px] font-mono font-medium transition-colors border shadow-2xs ${
                  onionSettings.colorCoded
                    ? isDark
                      ? 'bg-zinc-800 text-cyan-300 border-zinc-700'
                      : 'bg-white text-cyan-700 border-zinc-300 font-bold'
                    : 'text-zinc-500 border-transparent hover:bg-zinc-800/50'
                }`}
                title="Cyan for previous frames, Orange for next frame"
              >
                {onionSettings.colorCoded ? 'Cyan / Orange' : 'Graphite'}
              </button>
            )}
          </div>

          {/* Expanded Onion Controls when Enabled */}
          {onionSettings.enabled && (
            <div className="flex flex-col gap-2 pt-1 border-t border-zinc-200 dark:border-zinc-800">
              {/* Previous Frames Count Stepper (1 to 4) */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                  Prev Frames:
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4].map((count) => (
                    <button
                      key={`prev-${count}`}
                      onClick={() => onChangeOnionSettings({ prevFramesCount: count })}
                      className={`w-6 h-5.5 rounded text-[11px] font-mono font-bold transition-colors ${
                        (onionSettings.prevFramesCount || 2) === count
                          ? isDark
                            ? 'bg-sky-500 text-white shadow-2xs'
                            : 'bg-sky-600 text-white shadow-2xs'
                          : isDark
                          ? 'bg-zinc-800 text-zinc-400 hover:text-white'
                          : 'bg-white text-zinc-700 hover:text-black border border-zinc-300'
                      }`}
                      title={`Show ${count} previous frame${count > 1 ? 's' : ''}`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              {/* Opacity Range Slider */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                  Opacity:
                </span>
                <input
                  type="range"
                  min="0.2"
                  max="0.95"
                  step="0.05"
                  value={onionSettings.opacity || 0.65}
                  onChange={(e) =>
                    onChangeOnionSettings({ opacity: parseFloat(e.target.value) })
                  }
                  className="flex-1 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded cursor-pointer accent-sky-500"
                  title="Adjust onion skin visibility opacity"
                />
                <span className="text-[10px] font-mono tabular-nums text-zinc-500 w-8 text-right">
                  {Math.round((onionSettings.opacity || 0.65) * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6. Page Flip Controls & Roll Flipbook */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Page Flip & Roll
        </span>
        <div
          className={`flex flex-col gap-1.5 p-1 rounded-lg border text-xs ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-200/70 border-zinc-300'
          }`}
        >
          {/* Flip buttons */}
          <div className="flex items-center gap-1">
            <button
              disabled={currentFrameIndex === 0}
              onClick={onFlipBackward}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded disabled:opacity-30 disabled:pointer-events-none transition-colors border shadow-2xs ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                  : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300'
              }`}
              title="Previous Page (Left Arrow)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <button
              disabled={currentFrameIndex === totalFrames - 1}
              onClick={onFlipForward}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded font-semibold disabled:opacity-30 disabled:pointer-events-none transition-all border shadow-2xs ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700'
                  : 'bg-white hover:bg-zinc-50 text-zinc-900 border-zinc-300'
              }`}
              title="Flip Page Front-to-Back (Right Arrow or Space)"
            >
              <span>Flip</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Roll & Sound */}
          <div className="flex items-center gap-1">
            <button
              onClick={onTogglePlay}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded font-semibold transition-all ${
                isPlaying
                  ? 'bg-rose-600 text-white shadow-xs animate-pulse'
                  : isDark
                  ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border border-zinc-700'
                  : 'bg-white text-zinc-800 hover:bg-zinc-50 border border-zinc-300 shadow-2xs'
              }`}
              title="Roll Flipbook: Rapidly flip sheets to preview animation"
            >
              {isPlaying ? (
                <Square className="w-3 h-3 fill-current" />
              ) : (
                <Play className="w-3 h-3 fill-current" />
              )}
              <span>{isPlaying ? 'Stop Roll' : 'Roll Flipbook'}</span>
            </button>

            {/* FPS Selector */}
            <div className="flex items-center gap-0.5">
              {[12, 24].map((fps) => (
                <button
                  key={fps}
                  onClick={() => onChangeFps(fps)}
                  className={`px-1.5 py-1 rounded text-[10px] font-mono font-medium transition-colors ${
                    playbackFps === fps
                      ? isDark
                        ? 'bg-zinc-700 text-white font-bold'
                        : 'bg-zinc-300 text-zinc-950 font-bold'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  title={`${fps} Frames Per Second`}
                >
                  {fps}
                </button>
              ))}
            </div>

            {/* Sound toggle */}
            <button
              onClick={onToggleSound}
              className={`p-1.5 rounded transition-colors border shadow-2xs ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                  : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-300'
              }`}
              title={soundEnabled ? 'Paper Flip Sound: On' : 'Paper Flip Sound: Muted'}
            >
              {soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-200" />
              ) : (
                <VolumeX className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

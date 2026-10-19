import React, { useRef, useEffect, useState } from 'react';
import {
  Plus,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Copy,
  Trash2,
  GripVertical,
  ChevronsLeft,
  ChevronsRight,
  Film,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Frame } from '../types/storyboard';
import { playPegSnapSound } from '../utils/audio';

export interface FrameNavMenuProps {
  frames: Frame[];
  currentFrameIndex: number;
  onSelectFrame: (index: number) => void;
  onAddFrame: () => void;
  onDuplicateFrame: () => void;
  onDeleteFrame: (index: number) => void;
  onMoveFrame: (fromIndex: number, toIndex: number) => void;
  soundEnabled: boolean;
  theme: 'light' | 'dark';
}

export const FrameNavMenu: React.FC<FrameNavMenuProps> = ({
  frames,
  currentFrameIndex,
  onSelectFrame,
  onAddFrame,
  onDuplicateFrame,
  onDeleteFrame,
  onMoveFrame,
  soundEnabled,
  theme,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isEditingFrameInput, setIsEditingFrameInput] = useState(false);
  const [inputFrameText, setInputFrameText] = useState(String(currentFrameIndex + 1));
  const [isCollapsed, setIsCollapsed] = useState(false);

  const frameListRef = useRef<HTMLDivElement | null>(null);
  const frameCardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const isDark = theme === 'dark';

  // Synchronize input text with current frame
  useEffect(() => {
    setInputFrameText(String(currentFrameIndex + 1));
  }, [currentFrameIndex]);

  // Auto-scroll the active frame card into visible view whenever currentFrameIndex changes
  useEffect(() => {
    const card = frameCardRefs.current[currentFrameIndex];
    if (card && frameListRef.current) {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentFrameIndex]);

  const handleFrameClick = (idx: number) => {
    if (idx < 0 || idx >= frames.length) return;
    if (soundEnabled) playPegSnapSound();
    onSelectFrame(idx);
  };

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDraggedIndex(idx);
    e.dataTransfer.setData('text/plain', String(idx));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== idx) {
      setDragOverIndex(idx);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    const sourceIdxStr = e.dataTransfer.getData('text/plain');
    const sourceIdx = sourceIdxStr !== '' ? parseInt(sourceIdxStr, 10) : draggedIndex;
    if (
      sourceIdx !== null &&
      sourceIdx !== undefined &&
      !isNaN(sourceIdx) &&
      sourceIdx !== targetIdx
    ) {
      if (soundEnabled) playPegSnapSound();
      onMoveFrame(sourceIdx, targetIdx);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleFrameInputCommit = () => {
    setIsEditingFrameInput(false);
    const parsed = parseInt(inputFrameText.trim(), 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= frames.length) {
      handleFrameClick(parsed - 1);
    } else {
      setInputFrameText(String(currentFrameIndex + 1));
    }
  };

  // Milestone jump points
  const getMilestones = () => {
    if (frames.length <= 6) return [];
    const milestones: number[] = [0];
    const step = frames.length >= 24 ? 6 : 4;
    for (let i = step - 1; i < frames.length - 1; i += step) {
      if (!milestones.includes(i)) milestones.push(i);
    }
    const lastIdx = frames.length - 1;
    if (!milestones.includes(lastIdx)) milestones.push(lastIdx);
    return milestones;
  };

  const milestones = getMilestones();

  // Collapsed Sidebar View (Narrow compact rail)
  if (isCollapsed) {
    return (
      <div
        className={`w-12 shrink-0 rounded-xl border p-2 flex flex-col items-center gap-3 transition-colors shadow-sm select-none ${
          isDark ? 'bg-[#18181b] border-zinc-800 text-zinc-300' : 'bg-[#EFECE6] border-zinc-300 text-zinc-800'
        }`}
      >
        <button
          onClick={() => setIsCollapsed(false)}
          title="Expand Frame Navigation Menu"
          className={`p-1.5 rounded-lg border transition-colors shadow-2xs ${
            isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700' : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-300'
          }`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={onAddFrame}
          title="Add New Blank Frame"
          className="p-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
        </button>

        <div className="w-full h-[1px] bg-zinc-300 dark:bg-zinc-800" />

        {/* Compact Vertical Stack of Frame Numbers */}
        <div className="flex-1 w-full overflow-y-auto flex flex-col items-center gap-1.5 scrollbar-none py-1">
          {frames.map((frame, idx) => {
            const isCurrent = idx === currentFrameIndex;
            return (
              <button
                key={frame.id}
                onClick={() => handleFrameClick(idx)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold transition-all ${
                  isCurrent
                    ? isDark
                      ? 'bg-zinc-100 text-zinc-950 ring-2 ring-sky-400 shadow-sm'
                      : 'bg-zinc-900 text-white ring-2 ring-sky-500 shadow-sm'
                    : isDark
                    ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    : 'text-zinc-600 hover:bg-zinc-200 hover:text-zinc-950'
                }`}
                title={`Frame ${idx + 1} (Scene ${frame.sceneNumber} • Panel ${frame.panelNumber})`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <nav
      aria-label="Frame Navigation"
      className={`w-full lg:w-60 xl:w-68 shrink-0 flex flex-col rounded-xl border p-3 shadow-sm select-none transition-colors lg:sticky lg:top-4 lg:max-h-[calc(100vh-5.5rem)] overflow-hidden ${
        isDark ? 'bg-[#18181b] border-zinc-800 text-zinc-200' : 'bg-[#EFECE6] border-zinc-300 text-zinc-850'
      }`}
    >
      {/* 1. Header: Title, Total Badge & Collapse */}
      <div className="flex items-center justify-between pb-2.5 border-b border-zinc-300/80 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-sky-500/20 text-sky-500">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-tight">Frame Navigation</h3>
            <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
              {frames.length} {frames.length === 1 ? 'Frame' : 'Frames'} on Pegs
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsCollapsed(true)}
            title="Collapse Frame Navigation Menu"
            className={`p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Primary Navigation Bar: Quick Steppers & + New Frame */}
      <div className="flex items-center justify-between gap-1.5 py-2 shrink-0">
        <div className="flex items-center gap-1">
          {/* First Frame Jump Button (|<) */}
          <button
            disabled={currentFrameIndex === 0}
            onClick={() => handleFrameClick(0)}
            className={`p-1.5 rounded disabled:opacity-25 disabled:pointer-events-none transition-colors border shadow-2xs ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-300'
            }`}
            title="First Frame (Home)"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>

          {/* Previous Frame (<) */}
          <button
            disabled={currentFrameIndex === 0}
            onClick={() => handleFrameClick(currentFrameIndex - 1)}
            className={`p-1.5 rounded disabled:opacity-25 disabled:pointer-events-none transition-colors border shadow-2xs ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-300'
            }`}
            title="Previous Frame (Left Arrow)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>

          {/* Interactive Frame Counter & Direct Input Jump */}
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded border font-mono text-xs tabular-nums ${
              isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-200' : 'bg-white border-zinc-300 text-zinc-900'
            }`}
          >
            <span className="text-zinc-500 font-sans text-[11px]">F</span>
            {isEditingFrameInput ? (
              <input
                type="text"
                autoFocus
                value={inputFrameText}
                onChange={(e) => setInputFrameText(e.target.value)}
                onBlur={handleFrameInputCommit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFrameInputCommit();
                  if (e.key === 'Escape') {
                    setIsEditingFrameInput(false);
                    setInputFrameText(String(currentFrameIndex + 1));
                  }
                }}
                className={`w-7 text-center font-bold px-0.5 rounded focus:outline-none ${
                  isDark ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-black'
                }`}
              />
            ) : (
              <button
                onClick={() => setIsEditingFrameInput(true)}
                title="Click to jump to any frame"
                className={`font-bold hover:underline px-0.5 rounded cursor-pointer ${
                  isDark ? 'text-sky-400' : 'text-sky-600'
                }`}
              >
                {currentFrameIndex + 1}
              </button>
            )}
            <span className="text-zinc-500">/</span>
            <span className="font-semibold text-zinc-500">{frames.length}</span>
          </div>

          {/* Next Frame (>) */}
          <button
            disabled={currentFrameIndex === frames.length - 1}
            onClick={() => handleFrameClick(currentFrameIndex + 1)}
            className={`p-1.5 rounded disabled:opacity-25 disabled:pointer-events-none transition-colors border shadow-2xs ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-300'
            }`}
            title="Next Frame (Right Arrow)"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Last Frame Jump Button (>|) */}
          <button
            disabled={currentFrameIndex === frames.length - 1}
            onClick={() => handleFrameClick(frames.length - 1)}
            className={`p-1.5 rounded disabled:opacity-25 disabled:pointer-events-none transition-colors border shadow-2xs ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-300'
            }`}
            title="Last Frame (End)"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Primary + New Frame Button */}
        <button
          onClick={onAddFrame}
          title="Add New Blank Frame on Pegs (+)"
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold border transition-all shadow-xs active:scale-95 ${
            isDark
              ? 'bg-zinc-200 hover:bg-white text-zinc-950 border-zinc-300'
              : 'bg-zinc-950 hover:bg-zinc-800 text-white border-zinc-950'
          }`}
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New</span>
        </button>
      </div>

      {/* 3. Reorder & Frame Actions Toolbar */}
      <div className="flex items-center justify-between gap-1 pb-2 border-b border-zinc-300/80 dark:border-zinc-800 text-xs shrink-0">
        <div className="flex items-center gap-1 font-mono text-[11px]">
          <span className="text-[10px] uppercase font-sans text-zinc-500 font-semibold mr-0.5">
            Shift:
          </span>
          <button
            disabled={currentFrameIndex === 0}
            onClick={() => onMoveFrame(currentFrameIndex, currentFrameIndex - 1)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-mono font-medium disabled:opacity-25 disabled:pointer-events-none transition-colors ${
              isDark
                ? 'bg-zinc-850 hover:bg-zinc-750 text-zinc-300 border-zinc-750'
                : 'bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-300'
            }`}
            title="Move Frame Earlier (Alt + Up/Left)"
          >
            <ArrowUp className="w-3 h-3" />
            <span>Earlier</span>
          </button>

          <button
            disabled={currentFrameIndex === frames.length - 1}
            onClick={() => onMoveFrame(currentFrameIndex, currentFrameIndex + 1)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-mono font-medium disabled:opacity-25 disabled:pointer-events-none transition-colors ${
              isDark
                ? 'bg-zinc-850 hover:bg-zinc-750 text-zinc-300 border-zinc-750'
                : 'bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-300'
            }`}
            title="Move Frame Later (Alt + Down/Right)"
          >
            <span>Later</span>
            <ArrowDown className="w-3 h-3" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onDuplicateFrame}
            title="Duplicate Current Frame (Ctrl+D)"
            className={`p-1 rounded border transition-colors ${
              isDark
                ? 'bg-zinc-850 hover:bg-zinc-750 text-zinc-300 border-zinc-750'
                : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-300'
            }`}
          >
            <Copy className="w-3 h-3" />
          </button>

          {frames.length > 1 && (
            <button
              onClick={() => onDeleteFrame(currentFrameIndex)}
              title="Delete Current Frame"
              className={`p-1 rounded border transition-colors ${
                isDark
                  ? 'bg-zinc-850 hover:bg-rose-950/70 text-zinc-400 hover:text-rose-300 border-zinc-750'
                  : 'bg-white hover:bg-rose-50 text-zinc-600 hover:text-rose-700 border-zinc-300'
              }`}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Frame Stations List: Vertically scrollable cards beside the canvas */}
      <div
        ref={frameListRef}
        className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 py-2 min-h-0 scrollbar-thin"
      >
        {frames.map((frame, idx) => {
          const isCurrent = idx === currentFrameIndex;
          const isDragOver = dragOverIndex === idx && draggedIndex !== idx;
          const isDraggingThis = draggedIndex === idx;

          return (
            <div
              key={frame.id}
              ref={(el) => {
                frameCardRefs.current[idx] = el;
              }}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              onClick={() => handleFrameClick(idx)}
              className={`group relative flex items-center gap-2 p-2 rounded-xl border cursor-pointer select-none transition-all ${
                isCurrent
                  ? isDark
                    ? 'bg-zinc-850 border-sky-500 shadow-md ring-2 ring-sky-500/40'
                    : 'bg-white border-sky-500 shadow-md ring-2 ring-sky-500/40'
                  : isDark
                  ? 'bg-zinc-900/60 hover:bg-zinc-850 border-zinc-800/80 text-zinc-300'
                  : 'bg-[#FDFBF7] hover:bg-white border-zinc-300/80 text-zinc-700'
              } ${isDragOver ? 'scale-102 ring-2 ring-sky-400' : ''} ${
                isDraggingThis ? 'opacity-30' : ''
              }`}
            >
              {/* Drag Handle */}
              <div
                className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                title="Drag to reorder frame"
              >
                <GripVertical className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
              </div>

              {/* Thumbnail Preview (16:9) of Canvas Drawing */}
              <div className="w-16 h-9 shrink-0 aspect-[16/9] rounded border bg-[#F4F0E8] overflow-hidden shadow-2xs relative border-zinc-300 dark:border-zinc-700">
                {frame.canvasData && frame.canvasData.length > 50 ? (
                  <img
                    src={frame.canvasData}
                    alt={`Frame ${idx + 1}`}
                    className="w-full h-full object-contain pointer-events-none"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[9px] font-mono text-zinc-400">
                    Blank
                  </div>
                )}
                {/* Active peg badge */}
                {isCurrent && (
                  <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-sky-500 shadow-xs" />
                )}
              </div>

              {/* Frame Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span
                    className={`font-mono text-xs font-bold leading-tight ${
                      isCurrent
                        ? isDark
                          ? 'text-white'
                          : 'text-zinc-950 font-extrabold'
                        : isDark
                        ? 'text-zinc-300'
                        : 'text-zinc-800'
                    }`}
                  >
                    Frame {idx + 1}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {frame.durationSec}s
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                  <span>S{frame.sceneNumber || '1'}</span>
                  <span>•</span>
                  <span>P{frame.panelNumber || idx + 1}</span>
                  {frame.actionNotes && (
                    <>
                      <span>•</span>
                      <span className="truncate italic text-[9px] opacity-75">{frame.actionNotes}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. Bottom Timeline Quick Scrubber & Landmarks */}
      {frames.length > 3 && (
        <div className="pt-2 border-t border-zinc-300/80 dark:border-zinc-800 flex flex-col gap-1.5 shrink-0">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span>Scrubber</span>
            <span className="font-semibold text-zinc-600 dark:text-zinc-300">
              {currentFrameIndex + 1} of {frames.length}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={frames.length - 1}
            value={currentFrameIndex}
            onChange={(e) => handleFrameClick(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
            title={`Scrub across all ${frames.length} frames`}
          />

          {milestones.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-none">
              {milestones.map((idx) => (
                <button
                  key={`quick-jump-${idx}`}
                  onClick={() => handleFrameClick(idx)}
                  className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-medium border transition-colors ${
                    idx === currentFrameIndex
                      ? isDark
                        ? 'bg-sky-500 text-white border-sky-400 font-bold'
                        : 'bg-sky-600 text-white border-sky-600 font-bold'
                      : isDark
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border-zinc-700'
                      : 'bg-white hover:bg-zinc-100 text-zinc-600 border-zinc-300'
                  }`}
                  title={`Jump to Frame ${idx + 1}`}
                >
                  F{idx + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

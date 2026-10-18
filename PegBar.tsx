import React, { useRef, useEffect, useState } from 'react';
import {
  Plus,
  ArrowLeft,
  ArrowRight,
  Copy,
  Trash2,
  Lock,
  Unlock,
  GripVertical,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Frame } from '../types/storyboard';
import { playPegSnapSound } from '../utils/audio';
import { DrawDeskLogo } from './DrawDeskLogo';

interface PegBarProps {
  frames: Frame[];
  currentFrameIndex: number;
  onSelectFrame: (index: number) => void;
  onAddFrame: () => void;
  onDuplicateFrame: () => void;
  onDeleteFrame: (index: number) => void;
  onMoveFrame: (fromIndex: number, toIndex: number) => void;
  position: 'top' | 'bottom';
  onTogglePosition: () => void;
  soundEnabled: boolean;
  theme: 'light' | 'dark';
  showTimelineRack?: boolean;
}

export const PegBar: React.FC<PegBarProps> = ({
  frames,
  currentFrameIndex,
  onSelectFrame,
  onAddFrame,
  onDuplicateFrame,
  onDeleteFrame,
  onMoveFrame,
  position,
  onTogglePosition,
  soundEnabled,
  theme,
  showTimelineRack = false,
}) => {
  const [isLocked, setIsLocked] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isEditingFrameInput, setIsEditingFrameInput] = useState(false);
  const [inputFrameText, setInputFrameText] = useState(String(currentFrameIndex + 1));
  const [hoveredFrameIndex, setHoveredFrameIndex] = useState<number | null>(null);

  const frameStripRef = useRef<HTMLDivElement | null>(null);
  const frameButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const isDark = theme === 'dark';

  // Synchronize input text with current frame
  useEffect(() => {
    setInputFrameText(String(currentFrameIndex + 1));
  }, [currentFrameIndex]);

  // Auto-scroll the active frame button into visible view whenever currentFrameIndex changes
  useEffect(() => {
    const btn = frameButtonRefs.current[currentFrameIndex];
    if (btn && frameStripRef.current) {
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
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

  // Direct Jump from input box
  const handleFrameInputCommit = () => {
    setIsEditingFrameInput(false);
    const parsed = parseInt(inputFrameText.trim(), 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= frames.length) {
      handleFrameClick(parsed - 1);
    } else {
      setInputFrameText(String(currentFrameIndex + 1));
    }
  };

  // Generate milestone jump points if project has many frames (e.g., 40 frames)
  const getMilestones = () => {
    if (frames.length <= 8) return [];
    const milestones: number[] = [0]; // Frame 1

    // Step every 5 or 8 frames
    const step = frames.length >= 30 ? 8 : 4;
    for (let i = step - 1; i < frames.length - 1; i += step) {
      if (!milestones.includes(i)) milestones.push(i);
    }

    const lastIdx = frames.length - 1;
    if (!milestones.includes(lastIdx)) milestones.push(lastIdx);

    return milestones;
  };

  const milestones = getMilestones();

  return (
    <div
      className={`w-full max-w-4xl px-4 sm:px-6 mx-auto flex flex-col items-center select-none z-30 transition-all ${
        position === 'top' ? 'mb-2' : 'mt-2'
      }`}
    >
      {/* Acme Metal Peg Bar Strip - Machined Brushed Ash Aluminum */}
      <div
        className={`relative w-full border rounded-lg shadow-sm px-3 sm:px-4 py-2 flex items-center justify-between gap-3 transition-colors ${
          isDark
            ? 'bg-gradient-to-b from-[#242429] via-[#1b1b1e] to-[#121214] border-zinc-800'
            : 'bg-gradient-to-b from-[#F2EFE8] via-[#E8E4DC] to-[#DDD9D0] border-zinc-300'
        }`}
      >
        {/* Left Side: Acme Peg Indicator & Position Toggle */}
        <div className="flex items-center gap-2">
          {/* Authentic DrawDesk Desk Mark: no background */}
          <div
            title="DrawDesk Traditional Animation Equipment"
            className="hidden md:flex items-center gap-1.5 px-1 py-1 text-xs font-mono font-medium opacity-90 select-none"
          >
            <DrawDeskLogo className="w-4 h-4" size={16} />
            <span className={`text-[11px] font-semibold tracking-tight ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>DrawDesk</span>
          </div>

          <button
            onClick={onTogglePosition}
            title={`Peg Bar Position: ${position.toUpperCase()} (Click to toggle)`}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors border shadow-2xs ${
              isDark
                ? 'bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 border-zinc-700'
                : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full inline-block ${
                isDark ? 'bg-zinc-400' : 'bg-zinc-600'
              }`}
            />
            <span className="capitalize">{position} Pegs</span>
          </button>

          <button
            onClick={() => setIsLocked(!isLocked)}
            title={
              isLocked
                ? 'Peg Registration: Locked (Standard Acme alignment)'
                : 'Peg Registration: Unlocked'
            }
            className={`p-1.5 rounded transition-colors border shadow-2xs ${
              isDark
                ? 'bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 border-zinc-700'
                : 'bg-white hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900 border-zinc-300'
            }`}
          >
            {isLocked ? (
              <Lock className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`} />
            ) : (
              <Unlock className="w-3.5 h-3.5 text-zinc-400" />
            )}
          </button>
        </div>

        {/* Center: Authentic Acme 3-Peg Hardware */}
        <div
          className={`hidden sm:flex items-center gap-8 px-6 py-1.5 rounded-md border shadow-inner ${
            isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-zinc-200/70 border-zinc-300'
          }`}
        >
          {/* Left Acme Slot Peg */}
          <div className="flex flex-col items-center">
            <div
              title="Acme Slot Peg (Left: 0.500 x 0.125 in)"
              className="w-8 h-2.5 rounded-full bg-gradient-to-b from-zinc-300 via-zinc-400 to-zinc-600 shadow-[0_1px_2px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.7)] border border-zinc-500"
            />
            <span
              className={`text-[9px] font-mono mt-0.5 ${
                isDark ? 'text-zinc-500' : 'text-zinc-600'
              }`}
            >
              -4.0"
            </span>
          </div>

          {/* Center Round Peg */}
          <div className="flex flex-col items-center">
            <div
              title="Acme Round Peg (Center Ø 0.250 inch)"
              className="w-4 h-4 rounded-full bg-gradient-to-b from-zinc-300 via-zinc-400 to-zinc-600 shadow-[0_1px_2px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.7)] border border-zinc-500"
            />
            <span
              className={`text-[9px] font-mono font-medium mt-0.5 ${
                isDark ? 'text-zinc-400' : 'text-zinc-700'
              }`}
            >
              ACME Ø
            </span>
          </div>

          {/* Right Acme Slot Peg */}
          <div className="flex flex-col items-center">
            <div
              title="Acme Slot Peg (Right: 0.500 x 0.125 in)"
              className="w-8 h-2.5 rounded-full bg-gradient-to-b from-zinc-300 via-zinc-400 to-zinc-600 shadow-[0_1px_2px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.7)] border border-zinc-500"
            />
            <span
              className={`text-[9px] font-mono mt-0.5 ${
                isDark ? 'text-zinc-500' : 'text-zinc-600'
              }`}
            >
              +4.0"
            </span>
          </div>
        </div>

        {/* Right Side: Quick Frame Management Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onDuplicateFrame}
            title="Duplicate Current Frame (Ctrl+D)"
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border transition-colors shadow-2xs ${
              isDark
                ? 'bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 border-zinc-700'
                : 'bg-white hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900 border-zinc-300'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Duplicate</span>
          </button>

          <button
            onClick={onAddFrame}
            title="Insert Blank Frame on Pegs"
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded border transition-colors shadow-2xs ${
              isDark
                ? 'bg-zinc-200 hover:bg-white text-zinc-900 border-zinc-200'
                : 'bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Frame</span>
          </button>

          {frames.length > 1 && (
            <button
              onClick={() => onDeleteFrame(currentFrameIndex)}
              title="Remove Frame from Pegs"
              className={`p-1.5 rounded transition-colors ${
                isDark
                  ? 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/80'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Frame Timeline & Peg Station Rack (Only shown if showTimelineRack is explicitly requested; default moved to left side beside canvas) */}
      {showTimelineRack && (
        <div
          className={`w-full mt-1.5 px-2.5 py-2 rounded-md border flex flex-col gap-2 text-xs shadow-2xs transition-colors ${
          isDark
            ? 'bg-[#18181b] border-zinc-800 text-zinc-300'
            : 'bg-[#EFECE6] border-zinc-300 text-zinc-700'
        }`}
      >
        {/* Top Control Bar: Reorder (Left) and Frame Navigator & New Button (Right) */}
        <div className="flex items-center justify-between gap-2 flex-wrap w-full">
          {/* Left Side: Reorder Shift Buttons & Quick Jump Landmarks */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 font-mono text-[11px]">
              <span className="text-[10px] uppercase font-sans font-semibold tracking-wider text-zinc-500 dark:text-zinc-400 mr-0.5">
                Reorder:
              </span>
              <button
                disabled={currentFrameIndex === 0}
                onClick={() => onMoveFrame(currentFrameIndex, currentFrameIndex - 1)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded disabled:opacity-25 disabled:pointer-events-none transition-colors font-medium border shadow-2xs text-[11px] font-mono ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                    : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300'
                }`}
                title="Move Current Frame Earlier (Alt + ←)"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Shift ←</span>
              </button>
              <button
                disabled={currentFrameIndex === frames.length - 1}
                onClick={() => onMoveFrame(currentFrameIndex, currentFrameIndex + 1)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded disabled:opacity-25 disabled:pointer-events-none transition-colors font-medium border shadow-2xs text-[11px] font-mono ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                    : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300'
                }`}
                title="Move Current Frame Later (Alt + →)"
              >
                <span>Shift →</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Quick Jump Landmarks for larger frame collections */}
            {milestones.length > 0 && (
              <div className="hidden sm:flex items-center gap-1 overflow-x-auto py-0.5">
                <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">
                  Jump:
                </span>
                {milestones.map((idx) => {
                  const isSelected = idx === currentFrameIndex;
                  return (
                    <button
                      key={`milestone-${idx}`}
                      onClick={() => handleFrameClick(idx)}
                      className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-medium transition-colors border ${
                        isSelected
                          ? isDark
                            ? 'bg-sky-500 text-white border-sky-400 font-bold'
                            : 'bg-sky-600 text-white border-sky-600 font-bold'
                          : isDark
                          ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                          : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-300'
                      }`}
                      title={`Jump directly to Frame ${idx + 1}`}
                    >
                      F{idx + 1}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Side: Frame number and New Frame Button (Moved to the Right) */}
          <div className="flex items-center gap-1 ml-auto">
            {/* First Frame Jump Button (|<) */}
            <button
              disabled={currentFrameIndex === 0}
              onClick={() => handleFrameClick(0)}
              className={`p-1 rounded disabled:opacity-25 disabled:pointer-events-none transition-colors border shadow-2xs ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                  : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-300'
              }`}
              title="Jump to First Frame (Home / Frame 1)"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>

            {/* Previous Frame (<) */}
            <button
              disabled={currentFrameIndex === 0}
              onClick={() => handleFrameClick(currentFrameIndex - 1)}
              className={`p-1 rounded disabled:opacity-25 disabled:pointer-events-none transition-colors border shadow-2xs ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                  : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-300'
              }`}
              title="Previous Frame (Left Arrow / A)"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>

            {/* Interactive Frame Counter & Direct Input Jump */}
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded border font-mono text-xs tabular-nums ${
                isDark
                  ? 'bg-zinc-900 border-zinc-700 text-zinc-200'
                  : 'bg-white border-zinc-300 text-zinc-800'
              }`}
            >
              <span className="text-zinc-500 font-sans text-[11px]">Frame</span>
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
                  className={`w-9 text-center font-bold px-0.5 rounded focus:outline-none ${
                    isDark ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-black'
                  }`}
                />
              ) : (
                <button
                  onClick={() => setIsEditingFrameInput(true)}
                  title="Click to jump to any frame number"
                  className={`font-bold hover:underline px-0.5 rounded cursor-pointer ${
                    isDark ? 'text-sky-400 hover:bg-zinc-800' : 'text-sky-600 hover:bg-zinc-100'
                  }`}
                >
                  {currentFrameIndex + 1}
                </button>
              )}
              <span className="text-zinc-500">/</span>
              <button
                onClick={() => handleFrameClick(frames.length - 1)}
                title="Jump to last frame"
                className="font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              >
                {frames.length}
              </button>
            </div>

            {/* Next Frame (>) */}
            <button
              disabled={currentFrameIndex === frames.length - 1}
              onClick={() => handleFrameClick(currentFrameIndex + 1)}
              className={`p-1 rounded disabled:opacity-25 disabled:pointer-events-none transition-colors border shadow-2xs ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                  : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-300'
              }`}
              title="Next Frame (Right Arrow / D)"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Last Frame Jump Button (>|) */}
            <button
              disabled={currentFrameIndex === frames.length - 1}
              onClick={() => handleFrameClick(frames.length - 1)}
              className={`p-1 rounded disabled:opacity-25 disabled:pointer-events-none transition-colors border shadow-2xs ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                  : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-300'
              }`}
              title="Jump to Last Frame (End)"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>

            {/* Quick Add Frame Button */}
            <button
              onClick={onAddFrame}
              title="Add Next Blank Frame (+)"
              className={`flex items-center gap-1 px-2.5 py-1 ml-1 rounded text-xs font-semibold border transition-all shadow-2xs hover:scale-105 active:scale-95 ${
                isDark
                  ? 'bg-zinc-200 hover:bg-white text-zinc-950 border-zinc-300'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-900'
              }`}
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="text-[11px] font-mono leading-none">New</span>
            </button>
          </div>
        </div>

        {/* Frame Stations Container - Wrapped into rows to fit drawing canvas length without exceeding */}
        <div
          ref={frameStripRef}
          className="w-full flex flex-wrap items-center justify-start gap-1.5 py-1 px-0.5 max-h-56 overflow-y-auto scrollbar-thin"
        >
          {frames.map((frame, idx) => {
            const isCurrent = idx === currentFrameIndex;
            const isDragOver = dragOverIndex === idx && draggedIndex !== idx;
            const isDraggingThis = draggedIndex === idx;

            return (
              <div
                key={frame.id}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                onMouseEnter={() => setHoveredFrameIndex(idx)}
                onMouseLeave={() => setHoveredFrameIndex((cur) => (cur === idx ? null : cur))}
                className={`relative flex items-center shrink-0 transition-all ${
                  isDragOver ? 'scale-110 z-20' : ''
                } ${isDraggingThis ? 'opacity-30' : ''}`}
              >
                <button
                  ref={(el) => {
                    frameButtonRefs.current[idx] = el;
                  }}
                  onClick={() => handleFrameClick(idx)}
                  className={`group relative flex items-center justify-center min-w-[38px] h-7.5 px-2 rounded-md transition-all font-mono text-xs tabular-nums cursor-grab active:cursor-grabbing select-none ${
                    isCurrent
                      ? isDark
                        ? 'bg-zinc-100 text-zinc-950 font-bold shadow-xs ring-2 ring-sky-400'
                        : 'bg-zinc-950 text-white font-bold shadow-xs ring-2 ring-sky-500'
                      : isDark
                      ? 'bg-zinc-850 hover:bg-zinc-750 text-zinc-300 hover:text-white border border-zinc-750'
                      : 'bg-white hover:bg-zinc-100 text-zinc-700 hover:text-zinc-950 border border-zinc-300 shadow-2xs'
                  } ${
                    isDragOver
                      ? isDark
                        ? 'ring-2 ring-sky-400 shadow-md bg-sky-950 text-sky-200'
                        : 'ring-2 ring-sky-500 shadow-md bg-sky-100 text-sky-900'
                      : ''
                  }`}
                  title={`Scene ${frame.sceneNumber} - Panel ${frame.panelNumber} (Frame ${idx + 1}) — Click to jump or drag to reorder`}
                >
                  {/* Grip dots hint */}
                  <GripVertical className="w-2.5 h-2.5 opacity-30 group-hover:opacity-80 -ml-1 mr-0.5" />

                  {/* Peg hole pin indicator */}
                  <span
                    className={`w-1.5 h-1.5 rounded-full mr-1 ${
                      isCurrent
                        ? isDark
                          ? 'bg-sky-600'
                          : 'bg-sky-400'
                        : isDark
                        ? 'bg-zinc-600 group-hover:bg-zinc-400'
                        : 'bg-zinc-400 group-hover:bg-zinc-600'
                    }`}
                  />
                  <span>{idx + 1}</span>
                </button>

                {/* Thumbnail tooltip on hover */}
                {hoveredFrameIndex === idx && frame.canvasData && frame.canvasData.length > 50 && (
                  <div
                    className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-1.5 rounded-lg border shadow-xl z-50 pointer-events-none w-36 flex flex-col gap-1 ${
                      isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-200' : 'bg-white border-zinc-300 text-zinc-900'
                    }`}
                  >
                    <div className="w-full aspect-[16/9] bg-[#F4F0E8] rounded overflow-hidden border border-zinc-300 dark:border-zinc-700">
                      <img
                        src={frame.canvasData}
                        alt={`Frame ${idx + 1}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-mono font-bold px-0.5">
                      <span>F{idx + 1}</span>
                      <span className="text-zinc-400 font-normal">P{frame.panelNumber}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Fast Scrubber Slider Track (Shown for quick scrubbing when frames > 8) */}
        {frames.length > 8 && (
          <div className="flex items-center gap-2 pt-1 border-t border-zinc-200 dark:border-zinc-800/80">
            <span className="text-[10px] font-mono text-zinc-500 whitespace-nowrap">
              Scrub Timeline:
            </span>
            <input
              type="range"
              min={0}
              max={frames.length - 1}
              value={currentFrameIndex}
              onChange={(e) => handleFrameClick(parseInt(e.target.value, 10))}
              className="flex-1 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
              title={`Drag to scrub across all ${frames.length} frames`}
            />
            <span className="text-[11px] font-mono font-semibold tabular-nums text-zinc-600 dark:text-zinc-400 min-w-[50px] text-right">
              {currentFrameIndex + 1}/{frames.length}
            </span>
          </div>
        )}
      </div>
      )}
    </div>
  );
};

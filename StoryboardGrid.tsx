import React, { useState } from 'react';
import { Frame } from '../types/storyboard';
import { Plus, Copy, Trash2, ArrowRight, ArrowLeft, Play, GripVertical } from 'lucide-react';

interface StoryboardGridProps {
  frames: Frame[];
  currentFrameIndex: number;
  onSelectFrame: (index: number) => void;
  onAddFrame: () => void;
  onDuplicateFrame: (index: number) => void;
  onDeleteFrame: (index: number) => void;
  onMoveFrame: (fromIndex: number, toIndex: number) => void;
  onCloseGrid: () => void;
  onPlayRoll: () => void;
  theme?: 'light' | 'dark';
}

export const StoryboardGrid: React.FC<StoryboardGridProps> = ({
  frames,
  currentFrameIndex,
  onSelectFrame,
  onAddFrame,
  onDuplicateFrame,
  onDeleteFrame,
  onMoveFrame,
  onCloseGrid,
  onPlayRoll,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';
  const [draggedCardIndex, setDraggedCardIndex] = useState<number | null>(null);
  const [dragOverCardIndex, setDragOverCardIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedCardIndex(index);
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCardIndex !== index) {
      setDragOverCardIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIdxStr = e.dataTransfer.getData('text/plain');
    const sourceIdx = sourceIdxStr !== '' ? parseInt(sourceIdxStr, 10) : draggedCardIndex;
    if (
      sourceIdx !== null &&
      sourceIdx !== undefined &&
      !isNaN(sourceIdx) &&
      sourceIdx !== targetIndex
    ) {
      onMoveFrame(sourceIdx, targetIndex);
    }
    setDraggedCardIndex(null);
    setDragOverCardIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedCardIndex(null);
    setDragOverCardIndex(null);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 flex flex-col gap-6">
      {/* Header bar in Ash & Toned Paper */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 border-b pb-4 transition-colors ${
          isDark ? 'border-zinc-800' : 'border-zinc-300'
        }`}
      >
        <div>
          <h2
            className={`text-lg font-bold flex items-center gap-2 ${
              isDark ? 'text-zinc-100' : 'text-zinc-900'
            }`}
          >
            <span>Storyboard Sequence Wall</span>
            <span
              className={`text-xs font-mono font-semibold px-2 py-0.5 rounded shadow-2xs border ${
                isDark
                  ? 'text-zinc-300 bg-zinc-800 border-zinc-700'
                  : 'text-zinc-700 bg-zinc-100 border-zinc-300'
              }`}
            >
              {frames.length} {frames.length === 1 ? 'Panel' : 'Panels'}
            </span>
          </h2>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            Click any panel to load it onto the drawing desk with Acme peg alignment.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onPlayRoll}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold border transition-colors shadow-2xs ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Roll Flipbook</span>
          </button>

          <button
            onClick={onAddFrame}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold shadow-xs transition-colors ${
              isDark
                ? 'bg-zinc-100 hover:bg-white text-zinc-950 font-bold'
                : 'bg-zinc-900 hover:bg-zinc-800 text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Panel</span>
          </button>

          <button
            onClick={onCloseGrid}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold border transition-colors shadow-2xs ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-300'
            }`}
          >
            <span>Back to Desk</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Panels Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {frames.map((frame, index) => {
          const isCurrent = index === currentFrameIndex;
          const isDragOver = dragOverCardIndex === index && draggedCardIndex !== index;
          const isDraggingThis = draggedCardIndex === index;

          return (
            <div
              key={frame.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => {
                onSelectFrame(index);
                onCloseGrid();
              }}
              className={`group relative flex flex-col rounded-md border shadow-sm overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${
                isDraggingThis ? 'opacity-30' : ''
              } ${
                isDragOver
                  ? isDark
                    ? 'ring-2 ring-sky-400 scale-[1.02] border-sky-400 z-10'
                    : 'ring-2 ring-sky-500 scale-[1.02] border-sky-500 z-10'
                  : isDark
                  ? isCurrent
                    ? 'bg-zinc-900 ring-2 ring-sky-500 border-sky-500'
                    : 'bg-[#18181b] border-zinc-800 hover:border-zinc-700'
                  : isCurrent
                  ? 'bg-white ring-2 ring-zinc-900 border-zinc-900'
                  : 'bg-white border-zinc-300 hover:border-zinc-400'
              }`}
            >
              {/* Card Header with Peg Holes Stamp & Drag Handle */}
              <div
                className={`relative px-3 py-2 border-b flex items-center justify-between text-xs font-mono cursor-grab active:cursor-grabbing ${
                  isDark
                    ? 'bg-[#202024] border-zinc-800 text-zinc-300'
                    : 'bg-zinc-100/70 border-zinc-200 text-zinc-800'
                }`}
                title="Drag panel to reorder storyboard sequence"
              >
                <div className="flex items-center gap-1.5">
                  <GripVertical className="w-3 h-3 opacity-40 group-hover:opacity-80 -ml-1 text-zinc-400" />
                  <span className={`font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                    SC {frame.sceneNumber} · PN {frame.panelNumber}
                  </span>
                  <span className={`text-[10px] font-semibold ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                    #{index + 1}
                  </span>
                </div>

                {/* Simulated Peg Cutouts */}
                <div className="flex items-center gap-1.5 opacity-60">
                  <span className={`w-3 h-1 rounded-full ${isDark ? 'bg-zinc-600' : 'bg-zinc-400'}`} />
                  <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-zinc-600' : 'bg-zinc-400'}`} />
                  <span className={`w-3 h-1 rounded-full ${isDark ? 'bg-zinc-600' : 'bg-zinc-400'}`} />
                </div>
              </div>

              {/* Thumbnail Drawing View (Always default paper color so dark drawings are crisp) */}
              <div
                className={`relative w-full aspect-[16/9] border-b flex items-center justify-center overflow-hidden bg-[#F4F0E8] ${
                  isDark ? 'border-zinc-800' : 'border-zinc-200'
                }`}
              >
                {frame.canvasData ? (
                  <img
                    src={frame.canvasData}
                    alt={`Panel ${frame.panelNumber}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className={`text-xs italic font-mono ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    Empty Drawing Sheet
                  </div>
                )}

                {/* Duration Badge */}
                <div
                  className={`absolute bottom-1 right-1 px-1.5 py-0.5 rounded font-mono text-[9px] tabular-nums ${
                    isDark ? 'bg-black/80 text-zinc-300' : 'bg-zinc-900/80 text-white'
                  }`}
                >
                  {frame.durationSec}s
                </div>
              </div>

              {/* Notes Body */}
              <div
                className={`p-3 flex flex-col gap-1.5 flex-1 justify-between ${
                  isDark ? 'bg-[#18181b]' : 'bg-white'
                }`}
              >
                <div className="space-y-1">
                  {frame.actionNotes && (
                    <p
                      className={`text-[11px] line-clamp-2 leading-relaxed ${
                        isDark ? 'text-zinc-300' : 'text-zinc-800'
                      }`}
                    >
                      <strong
                        className={`text-[10px] font-mono uppercase font-semibold ${
                          isDark ? 'text-zinc-500' : 'text-zinc-500'
                        }`}
                      >
                        Act:{' '}
                      </strong>
                      {frame.actionNotes}
                    </p>
                  )}
                  {frame.dialogueNotes && (
                    <p
                      className={`text-[11px] italic line-clamp-1 ${
                        isDark ? 'text-zinc-400' : 'text-zinc-600'
                      }`}
                    >
                      <strong
                        className={`text-[10px] font-mono uppercase not-italic font-semibold ${
                          isDark ? 'text-zinc-500' : 'text-zinc-500'
                        }`}
                      >
                        Dia:{' '}
                      </strong>
                      {frame.dialogueNotes}
                    </p>
                  )}
                  {!frame.actionNotes && !frame.dialogueNotes && (
                    <p
                      className={`text-[10px] font-mono italic ${
                        isDark ? 'text-zinc-600' : 'text-zinc-400'
                      }`}
                    >
                      No notes recorded
                    </p>
                  )}
                </div>

                {/* Card Action Toolbar */}
                <div
                  className={`flex items-center justify-between gap-1 pt-2 border-t mt-2 ${
                    isDark ? 'border-zinc-800' : 'border-zinc-100'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Reorder Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      disabled={index === 0}
                      onClick={() => onMoveFrame(index, index - 1)}
                      className={`p-1 rounded transition-colors disabled:opacity-25 disabled:pointer-events-none ${
                        isDark
                          ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                          : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                      }`}
                      title="Move Panel Earlier (Shift Left)"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>

                    <button
                      disabled={index === frames.length - 1}
                      onClick={() => onMoveFrame(index, index + 1)}
                      className={`p-1 rounded transition-colors disabled:opacity-25 disabled:pointer-events-none ${
                        isDark
                          ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                          : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                      }`}
                      title="Move Panel Later (Shift Right)"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Duplicate and Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onDuplicateFrame(index)}
                      className={`p-1 rounded transition-colors ${
                        isDark
                          ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                          : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                      }`}
                      title="Duplicate Panel"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {frames.length > 1 && (
                      <button
                        onClick={() => onDeleteFrame(index)}
                        className={`p-1 rounded transition-colors ${
                          isDark
                            ? 'text-zinc-400 hover:text-rose-400 hover:bg-zinc-800'
                            : 'text-zinc-500 hover:text-rose-600 hover:bg-zinc-100'
                        }`}
                        title="Delete Panel"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

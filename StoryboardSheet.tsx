import React from 'react';
import { Frame, ToolSettings, OnionSkinSettings, PerspectiveConfig } from '../types/storyboard';
import { DrawingCanvas } from './DrawingCanvas';

interface StoryboardSheetProps {
  currentFrame: Frame;
  allFrames: Frame[];
  currentFrameIndex: number;
  toolSettings: ToolSettings;
  onionSettings: OnionSkinSettings;
  onChangeOnionSettings?: (updates: Partial<OnionSkinSettings>) => void;
  showFieldGrid: boolean;
  pegPosition: 'top' | 'bottom';
  onUpdateCanvas: (dataUrl: string) => void;
  onUpdateFrameNotes: (updates: Partial<Frame>) => void;
  undoTrigger: number;
  redoTrigger: number;
  clearTrigger?: number;
  canUndoChange: (can: boolean) => void;
  canRedoChange: (can: boolean) => void;
  perspectiveConfig: PerspectiveConfig;
  onUpdatePerspectiveConfig: (newConfig: Partial<PerspectiveConfig>) => void;
  theme: 'light' | 'dark';
}

export const StoryboardSheet: React.FC<StoryboardSheetProps> = ({
  currentFrame,
  allFrames,
  currentFrameIndex,
  toolSettings,
  onionSettings,
  onChangeOnionSettings,
  showFieldGrid,
  pegPosition,
  onUpdateCanvas,
  onUpdateFrameNotes,
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

  return (
    <div
      className={`p-4 sm:p-6 flex flex-col gap-3 font-sans transition-colors ${
        isDark ? 'text-zinc-200' : 'text-zinc-900'
      }`}
    >
      {/* Traditional Pre-Printed Storyboard Header Stamp */}
      <div
        className={`flex items-center justify-between border-b pb-2 text-xs font-mono ${
          isDark ? 'border-zinc-800 text-zinc-400' : 'border-zinc-300 text-zinc-700'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              }`}
            >
              SCENE:
            </span>
            <input
              type="text"
              value={currentFrame.sceneNumber}
              onChange={(e) => onUpdateFrameNotes({ sceneNumber: e.target.value })}
              className={`w-12 border-b-2 px-1 py-0.5 font-bold focus:outline-none transition-colors ${
                isDark
                  ? 'bg-zinc-800/80 text-zinc-100 border-zinc-700 focus:border-zinc-300'
                  : 'bg-zinc-200/50 hover:bg-zinc-200/80 focus:bg-white text-zinc-900 border-zinc-400/80 focus:border-zinc-900'
              }`}
              title="Scene Number"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              }`}
            >
              PANEL:
            </span>
            <input
              type="text"
              value={currentFrame.panelNumber}
              onChange={(e) => onUpdateFrameNotes({ panelNumber: e.target.value })}
              className={`w-12 border-b-2 px-1 py-0.5 font-bold focus:outline-none transition-colors ${
                isDark
                  ? 'bg-zinc-800/80 text-zinc-100 border-zinc-700 focus:border-zinc-300'
                  : 'bg-zinc-200/50 hover:bg-zinc-200/80 focus:bg-white text-zinc-900 border-zinc-400/80 focus:border-zinc-900'
              }`}
              title="Panel Number"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              }`}
            >
              SHOT:
            </span>
            <input
              type="text"
              value={currentFrame.shotNumber}
              onChange={(e) => onUpdateFrameNotes({ shotNumber: e.target.value })}
              className={`w-12 border-b-2 px-1 py-0.5 font-bold focus:outline-none transition-colors ${
                isDark
                  ? 'bg-zinc-800/80 text-zinc-100 border-zinc-700 focus:border-zinc-300'
                  : 'bg-zinc-200/50 hover:bg-zinc-200/80 focus:bg-white text-zinc-900 border-zinc-400/80 focus:border-zinc-900'
              }`}
              title="Shot Number"
            />
          </div>
        </div>

        {/* Traditional Timing Stamp */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[11px]">
            <span
              className={`text-[10px] font-bold uppercase ${
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              }`}
            >
              TIMING:
            </span>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="60"
              value={currentFrame.durationSec}
              onChange={(e) => onUpdateFrameNotes({ durationSec: parseFloat(e.target.value) || 1 })}
              className={`w-12 border-b-2 px-1 py-0.5 font-bold text-right focus:outline-none tabular-nums transition-colors ${
                isDark
                  ? 'bg-zinc-800/80 text-zinc-100 border-zinc-700 focus:border-zinc-300'
                  : 'bg-zinc-200/50 hover:bg-zinc-200/80 focus:bg-white text-zinc-900 border-zinc-400/80 focus:border-zinc-900'
              }`}
            />
            <span className={isDark ? 'text-zinc-400' : 'text-zinc-700'}>sec</span>
          </div>

          <span className={isDark ? 'text-zinc-700' : 'text-zinc-300'}>|</span>
          <span
            className={`text-[10px] font-mono font-medium tabular-nums ${
              isDark ? 'text-zinc-400' : 'text-zinc-600'
            }`}
          >
            {Math.round(currentFrame.durationSec * 24)} FRAMES @ 24FPS
          </span>

          {/* Quick Light Table / Onion Skin Status & Toggle */}
          {onChangeOnionSettings && (
            <>
              <span className={isDark ? 'text-zinc-700' : 'text-zinc-300'}>|</span>
              <button
                onClick={() =>
                  onChangeOnionSettings({
                    enabled: !onionSettings.enabled,
                    lightTableBulb: !onionSettings.enabled,
                  })
                }
                title="Click to toggle Light Table & Onion Skin (shows previous frames in Cyan)"
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all border shadow-2xs ${
                  onionSettings.enabled
                    ? isDark
                      ? 'bg-sky-950/80 text-sky-300 border-sky-700'
                      : 'bg-sky-50 text-sky-800 border-sky-400'
                    : isDark
                    ? 'bg-zinc-800/80 text-zinc-500 border-zinc-700 hover:text-zinc-300'
                    : 'bg-zinc-100 text-zinc-500 border-zinc-300 hover:text-zinc-800'
                }`}
              >
                <span>💡</span>
                <span>
                  {onionSettings.enabled
                    ? `Light Table: ON (${onionSettings.prevFramesCount || 2} Prev)`
                    : 'Light Table: OFF'}
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Drawing Area: Storyboard 16:9 Screen Field */}
      <DrawingCanvas
        currentFrame={currentFrame}
        allFrames={allFrames}
        currentFrameIndex={currentFrameIndex}
        toolSettings={toolSettings}
        onionSettings={onionSettings}
        showFieldGrid={showFieldGrid}
        pegPosition={pegPosition}
        onUpdateCanvas={onUpdateCanvas}
        undoTrigger={undoTrigger}
        redoTrigger={redoTrigger}
        clearTrigger={clearTrigger}
        canUndoChange={canUndoChange}
        canRedoChange={canRedoChange}
        perspectiveConfig={perspectiveConfig}
        onUpdatePerspectiveConfig={onUpdatePerspectiveConfig}
        theme={theme}
      />

      {/* Traditional Storyboard Action & Dialogue Pre-printed Notes Box */}
      <div
        className={`grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t text-xs ${
          isDark ? 'border-zinc-800' : 'border-zinc-300'
        }`}
      >
        {/* Action Description */}
        <div className="flex flex-col gap-1">
          <label
            className={`text-[10px] font-mono font-bold uppercase tracking-wide ${
              isDark ? 'text-zinc-400' : 'text-zinc-700'
            }`}
          >
            ACTION / DESCRIPTION:
          </label>
          <textarea
            rows={2}
            value={currentFrame.actionNotes}
            onChange={(e) => onUpdateFrameNotes({ actionNotes: e.target.value })}
            placeholder="Describe character action, staging, or camera move..."
            className={`w-full resize-none rounded px-2.5 py-1.5 text-xs focus:outline-none transition-colors font-sans leading-relaxed ${
              isDark
                ? 'bg-zinc-800/80 border border-zinc-700/80 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-400'
                : 'bg-zinc-200/40 hover:bg-zinc-200/70 focus:bg-white border border-zinc-300/90 text-zinc-900 placeholder:text-zinc-500 focus:border-zinc-600'
            }`}
          />
        </div>

        {/* Dialogue / Audio */}
        <div className="flex flex-col gap-1">
          <label
            className={`text-[10px] font-mono font-bold uppercase tracking-wide ${
              isDark ? 'text-zinc-400' : 'text-zinc-700'
            }`}
          >
            DIALOGUE / SOUND FX:
          </label>
          <textarea
            rows={2}
            value={currentFrame.dialogueNotes}
            onChange={(e) => onUpdateFrameNotes({ dialogueNotes: e.target.value })}
            placeholder='Character line e.g. "Wait for the cue!" or SFX e.g. [Footsteps]...'
            className={`w-full resize-none rounded px-2.5 py-1.5 text-xs focus:outline-none transition-colors font-sans leading-relaxed ${
              isDark
                ? 'bg-zinc-800/80 border border-zinc-700/80 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-400'
                : 'bg-zinc-200/40 hover:bg-zinc-200/70 focus:bg-white border border-zinc-300/90 text-zinc-900 placeholder:text-zinc-500 focus:border-zinc-600'
            }`}
          />
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Frame } from '../types/storyboard';
import {
  calculateAnimaticTimings,
  findFrameIndexAtTime,
  formatTimecode,
  formatTimeShort,
  exportAnimaticEdlCsv,
  renderAnimaticVideo,
  AnimaticTimingData,
  FrameTiming,
} from '../utils/animaticEngine';
import { playFrameCutSound, playPegSnapSound } from '../utils/audio';
import { DrawDeskLogo } from './DrawDeskLogo';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Repeat,
  Volume2,
  VolumeX,
  Music,
  Download,
  Video,
  FileSpreadsheet,
  Maximize2,
  Minimize2,
  ArrowLeft,
  Clock,
  Layers,
  Sparkles,
  Sliders,
  Settings2,
  Check,
  X,
  Upload,
  Subtitles,
  Grid3X3,
  Film,
  Plus,
  Minus,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Tv,
} from 'lucide-react';

export interface AnimaticModeProps {
  projectTitle: string;
  frames: Frame[];
  initialFrameIndex?: number;
  onBackToDesk: () => void;
  onOpenWall?: () => void;
  onUpdateFrameTiming: (frameIndex: number, newDurationSec: number) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const AnimaticMode: React.FC<AnimaticModeProps> = ({
  projectTitle,
  frames,
  initialFrameIndex = 0,
  onBackToDesk,
  onOpenWall,
  onUpdateFrameTiming,
  theme = 'light',
  onToggleTheme,
}) => {
  const isDark = theme === 'dark';

  // 1. Timing calculation (24 FPS film standard)
  const fps = 24;
  const timingData: AnimaticTimingData = useMemo(() => {
    return calculateAnimaticTimings(frames, fps);
  }, [frames, fps]);

  // Current playhead time in seconds
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(() => {
    if (initialFrameIndex > 0 && timingData.timings[initialFrameIndex]) {
      return timingData.timings[initialFrameIndex].startSec;
    }
    return 0;
  });

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Overlays state
  const [showSubtitles, setShowSubtitles] = useState<boolean>(true);
  const [showTimecodeHud, setShowTimecodeHud] = useState<boolean>(true);
  const [showActionNotes, setShowActionNotes] = useState<boolean>(true);
  const [showAcmePegs, setShowAcmePegs] = useState<boolean>(true);
  const [showSafeGuides, setShowSafeGuides] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  // Canvas Paper Tone: 'paper' (warm drafting paper #F4F0E8 matching Drawing Desk), 'white', or 'dark'
  const [canvasPaperTone, setCanvasPaperTone] = useState<'paper' | 'white' | 'dark'>('paper');

  // Scratch Audio Track state
  const [scratchAudioUrl, setScratchAudioUrl] = useState<string | null>(null);
  const [scratchAudioName, setScratchAudioName] = useState<string | null>(null);
  const [audioVolume, setAudioVolume] = useState<number>(0.8);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  // Video Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isRenderingVideo, setIsRenderingVideo] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<number>(0);
  const [renderStatusText, setRenderStatusText] = useState<string>('');
  const [renderedVideoBlob, setRenderedVideoBlob] = useState<Blob | null>(null);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);

  // Export Settings
  const [exportRes, setExportRes] = useState<'1080p' | '720p'>('1080p');
  const [exportBurnSubs, setExportBurnSubs] = useState<boolean>(true);
  const [exportBurnTc, setExportBurnTc] = useState<boolean>(true);
  const [exportPegs, setExportPegs] = useState<boolean>(true);

  // Container refs for theater fullscreen & smooth auto-scroll in sidebar
  const containerRef = useRef<HTMLDivElement>(null);
  const sidebarListRef = useRef<HTMLDivElement>(null);
  const sidebarCardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Compute active timing block & active frame from playhead time
  const currentFrameIndex = useMemo(() => {
    return findFrameIndexAtTime(timingData.timings, currentTimeSec);
  }, [timingData.timings, currentTimeSec]);

  const activeTiming = timingData.timings[currentFrameIndex] || timingData.timings[0];
  const activeFrame = frames[currentFrameIndex] || frames[0];

  // Track previous frame index to play cut click sound on frame boundary
  const prevFrameIndexRef = useRef<number>(currentFrameIndex);
  useEffect(() => {
    if (prevFrameIndexRef.current !== currentFrameIndex) {
      if (soundEnabled && isPlaying) {
        playFrameCutSound(0.08);
      }
      prevFrameIndexRef.current = currentFrameIndex;
    }
  }, [currentFrameIndex, soundEnabled, isPlaying]);

  // Auto-scroll the active frame card into visible view in the left sidebar
  useEffect(() => {
    const card = sidebarCardRefs.current[currentFrameIndex];
    if (card && sidebarListRef.current) {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentFrameIndex]);

  // Master Playback Loop (RAF)
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    if (!isPlaying) {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (audioElementRef.current && !audioElementRef.current.paused) {
        audioElementRef.current.pause();
      }
      return;
    }

    lastTimeRef.current = performance.now();

    // Start or sync scratch audio playback
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = currentTimeSec;
      audioElementRef.current.playbackRate = playbackSpeed;
      audioElementRef.current.volume = isAudioMuted ? 0 : audioVolume;
      audioElementRef.current.play().catch(() => {});
    }

    const loop = (now: number) => {
      const deltaSec = ((now - lastTimeRef.current) / 1000) * playbackSpeed;
      lastTimeRef.current = now;

      setCurrentTimeSec((prevTime) => {
        const nextTime = prevTime + deltaSec;
        const total = timingData.totalDurationSec;

        if (nextTime >= total) {
          if (isLooping) {
            if (audioElementRef.current) audioElementRef.current.currentTime = 0;
            return 0;
          } else {
            setIsPlaying(false);
            return total;
          }
        }
        return nextTime;
      });

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [isPlaying, isLooping, playbackSpeed, timingData.totalDurationSec, audioVolume, isAudioMuted]);

  // Handle Scratch Audio Upload
  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setScratchAudioUrl(url);
      setScratchAudioName(file.name);
      e.target.value = '';
    }
  };

  const handleRemoveScratchAudio = () => {
    if (scratchAudioUrl) {
      URL.revokeObjectURL(scratchAudioUrl);
      setScratchAudioUrl(null);
      setScratchAudioName(null);
    }
  };

  // Keyboard Shortcuts (Space to play/pause, Left/Right arrow frame step, Shift+Arrows board jump)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (e.shiftKey) {
          handleJumpNextBoard();
        } else {
          handleStepFrame(1);
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (e.shiftKey) {
          handleJumpPrevBoard();
        } else {
          handleStepFrame(-1);
        }
      } else if (e.key === 'Home') {
        e.preventDefault();
        handleJumpToStart();
      } else if (e.key === 'End') {
        e.preventDefault();
        handleJumpToEnd();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        handleToggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [timingData.timings, currentFrameIndex, isPlaying]);

  // Navigation handlers
  const handleJumpToStart = () => {
    setCurrentTimeSec(0);
    if (audioElementRef.current) audioElementRef.current.currentTime = 0;
  };

  const handleJumpToEnd = () => {
    const total = timingData.totalDurationSec;
    const lastTiming = timingData.timings[timingData.timings.length - 1];
    setCurrentTimeSec(lastTiming ? lastTiming.startSec : Math.max(0, total - 0.1));
  };

  const handleJumpPrevBoard = () => {
    if (currentFrameIndex > 0) {
      const prevTiming = timingData.timings[currentFrameIndex - 1];
      if (prevTiming) {
        setCurrentTimeSec(prevTiming.startSec);
        if (soundEnabled) playFrameCutSound(0.08);
      }
    } else {
      handleJumpToStart();
    }
  };

  const handleJumpNextBoard = () => {
    if (currentFrameIndex < timingData.timings.length - 1) {
      const nextTiming = timingData.timings[currentFrameIndex + 1];
      if (nextTiming) {
        setCurrentTimeSec(nextTiming.startSec);
        if (soundEnabled) playFrameCutSound(0.08);
      }
    }
  };

  const handleStepFrame = (frameDelta: number) => {
    setIsPlaying(false);
    const frameDuration = 1 / fps;
    const newTime = Math.max(
      0,
      Math.min(timingData.totalDurationSec, currentTimeSec + frameDelta * frameDuration)
    );
    setCurrentTimeSec(newTime);
  };

  const handleSelectTimingBlock = (timing: FrameTiming) => {
    setCurrentTimeSec(timing.startSec);
    if (soundEnabled) playFrameCutSound(0.08);
  };

  // Adjust duration of current active frame directly in Animatic mode
  const handleAdjustActiveDuration = (deltaSec: number) => {
    if (!activeFrame) return;
    const currentDur = activeFrame.durationSec || 1.0;
    const newDur = Math.max(0.1, Number((currentDur + deltaSec).toFixed(2)));
    onUpdateFrameTiming(currentFrameIndex, newDur);
  };

  const handleSetExactDuration = (newDur: number) => {
    if (!activeFrame) return;
    const valid = Math.max(0.1, Number(newDur.toFixed(2)));
    onUpdateFrameTiming(currentFrameIndex, valid);
  };

  // Fullscreen toggle
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Start Video Render
  const handleStartVideoRender = async () => {
    try {
      setIsRenderingVideo(true);
      setRenderProgress(0);
      setRenderStatusText('Initializing animatic renderer...');

      const blob = await renderAnimaticVideo(
        projectTitle,
        frames,
        {
          width: exportRes === '1080p' ? 1920 : 1080,
          height: exportRes === '1080p' ? 1080 : 720,
          fps: 24,
          burnSubtitles: exportBurnSubs,
          burnTimecode: exportBurnTc,
          showPegHoles: exportPegs,
          theme,
          scratchAudioUrl,
        },
        (pct, status) => {
          setRenderProgress(pct);
          setRenderStatusText(status);
        }
      );

      const url = URL.createObjectURL(blob);
      setRenderedVideoBlob(blob);
      setRenderedVideoUrl(url);
      setRenderProgress(100);
      setRenderStatusText('Animatic video render complete!');
    } catch (err) {
      console.error('Failed to render animatic video:', err);
      setRenderStatusText('Render error occurred. Please try again.');
    } finally {
      setIsRenderingVideo(false);
    }
  };

  const handleDownloadRenderedVideo = () => {
    if (!renderedVideoUrl) return;
    const link = document.createElement('a');
    link.href = renderedVideoUrl;
    const safeTitle = (projectTitle || 'Animatic').trim().replace(/[^a-z0-9_-]/gi, '_');
    link.download = `${safeTitle}_Animatic_${exportRes}.webm`;
    link.click();
  };

  const totalDuration = timingData.totalDurationSec;
  const progressPercent = totalDuration > 0 ? (currentTimeSec / totalDuration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-4 p-3 sm:p-5 w-full max-w-[1650px] mx-auto select-none transition-colors"
    >
      {/* Hidden scratch audio element */}
      {scratchAudioUrl && (
        <audio
          ref={audioElementRef}
          src={scratchAudioUrl}
          preload="auto"
          onEnded={() => {
            if (isLooping && isPlaying) {
              if (audioElementRef.current) audioElementRef.current.currentTime = 0;
            }
          }}
        />
      )}

      {/* Hidden input for scratch audio file */}
      <input
        ref={audioFileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleAudioFileChange}
      />

      {/* ============================================================== */}
      {/* ZONE 1 (LEFT): ANIMATIC BOARDS NAVIGATION SIDEBAR               */}
      {/* Follows exact width and styling of FrameNavMenu in Drawing Desk*/}
      {/* ============================================================== */}
      <aside className="w-full lg:w-60 xl:w-68 shrink-0 lg:sticky lg:top-4 pb-2 lg:pb-0 order-2 lg:order-1">
        <div
          className={`flex flex-col gap-2 rounded-xl p-3 shadow-md border backdrop-blur-xs transition-colors ${
            isDark
              ? 'bg-[#18181b]/95 border-zinc-800 text-zinc-200'
              : 'bg-[#EFECE6]/95 border-zinc-300 text-zinc-800'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-zinc-300/80 dark:border-zinc-800">
            <div className="flex items-center gap-1.5">
              <Film className="w-4 h-4 text-amber-500" />
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                Boards ({timingData.timings.length})
              </span>
            </div>
            <span
              className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                isDark
                  ? 'bg-zinc-800 border-zinc-700 text-amber-400'
                  : 'bg-white border-zinc-300 text-amber-700'
              }`}
            >
              {formatTimeShort(totalDuration)}
            </span>
          </div>

          {/* Quick Info Bar */}
          <div className="text-[10px] font-mono flex items-center justify-between opacity-75 px-1">
            <span>24 FPS LEICA REEL</span>
            <span>{timingData.totalFrames24} TOTAL FRAMES</span>
          </div>

          {/* Scrollable Frame Cards List */}
          <div
            ref={sidebarListRef}
            className="flex flex-col gap-2 max-h-[calc(100vh-210px)] overflow-y-auto pr-1 scrollbar-thin"
          >
            {timingData.timings.map((timing, idx) => {
              const isActive = idx === currentFrameIndex;

              return (
                <div
                  key={timing.id || `anim_card_${idx}`}
                  ref={(el) => {
                    sidebarCardRefs.current[idx] = el;
                  }}
                  onClick={() => handleSelectTimingBlock(timing)}
                  className={`group relative flex flex-col p-2 rounded-lg border cursor-pointer transition-all ${
                    isActive
                      ? isDark
                        ? 'bg-zinc-800/90 border-amber-400/90 ring-2 ring-amber-400/30 shadow-md'
                        : 'bg-white border-amber-500 ring-2 ring-amber-500/30 shadow-md'
                      : isDark
                      ? 'bg-zinc-900/60 hover:bg-zinc-800/70 border-zinc-800 text-zinc-400'
                      : 'bg-white/70 hover:bg-white border-zinc-300 text-zinc-700'
                  }`}
                >
                  {/* Card Header: Scene / Panel & Duration Badge */}
                  <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                          isActive
                            ? 'bg-amber-500 text-zinc-950 font-bold'
                            : isDark
                            ? 'bg-zinc-800 text-zinc-400'
                            : 'bg-zinc-200 text-zinc-700'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="font-bold">
                        SC {timing.sceneNumber} • P{timing.panelNumber}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded ${
                        isActive
                          ? 'bg-amber-500/20 text-amber-500 dark:text-amber-400 font-bold'
                          : isDark
                          ? 'bg-zinc-800 text-zinc-400'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {timing.durationSec.toFixed(2)}s
                    </span>
                  </div>

                  {/* Thumbnail Preview (16:9) */}
                  <div className="w-full aspect-16/9 rounded overflow-hidden flex items-center justify-center border border-zinc-300/80 bg-[#F4F0E8] relative">
                    {timing.canvasData ? (
                      <img
                        src={timing.canvasData}
                        alt={`Scene ${timing.sceneNumber} Panel ${timing.panelNumber}`}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] opacity-40 font-mono">Blank Canvas</span>
                    )}

                    {/* Playing indicator badge on active card */}
                    {isActive && isPlaying && (
                      <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-amber-500 text-zinc-950 text-[9px] font-bold font-mono uppercase flex items-center gap-1 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-950 animate-ping" />
                        <span>LIVE</span>
                      </div>
                    )}

                    {/* Timecode in corner */}
                    <div className="absolute bottom-1 left-1 px-1 py-0.2 rounded bg-black/75 backdrop-blur-xs text-[9px] font-mono text-zinc-300">
                      {timing.timecodeIn}
                    </div>
                  </div>

                  {/* Dialogue / Action Notes Snippet */}
                  <div className="mt-1.5 text-[10px] truncate">
                    {timing.dialogueNotes ? (
                      <span className="text-amber-600 dark:text-yellow-400 font-medium">
                        “{timing.dialogueNotes}”
                      </span>
                    ) : timing.actionNotes ? (
                      <span className="italic opacity-70">{timing.actionNotes}</span>
                    ) : (
                      <span className="opacity-40 font-mono text-[9px]">
                        {timing.frameCount24} frames @ 24fps
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* ZONE 2 (CENTER): TRADITIONAL ANIMATION DESK & PAPER SHEET      */}
      {/* Identical structure to Drawing Desk: Peg Bar, Paper Sheet, etc.*/}
      {/* ============================================================== */}
      <div className="flex-1 flex flex-col items-center justify-between w-full max-w-4xl gap-3 order-1 lg:order-2">
        {/* Top Acme Peg Bar */}
        {showAcmePegs && (
          <div className="w-full px-2 sm:px-4 mx-auto flex flex-col items-center select-none z-30">
            <div
              className={`relative w-full border rounded-lg shadow-xs px-3 sm:px-4 py-2 flex items-center justify-between gap-3 transition-colors ${
                isDark
                  ? 'bg-gradient-to-b from-[#242429] via-[#1b1b1e] to-[#121214] border-zinc-800'
                  : 'bg-gradient-to-b from-[#F2EFE8] via-[#E8E4DC] to-[#DDD9D0] border-zinc-300'
              }`}
            >
              {/* Left Side: Brand mark & registration status */}
              <div className="flex items-center gap-2">
                <div
                  title="DrawDesk Traditional Animation Equipment"
                  className="hidden md:flex items-center gap-1.5 px-1 py-1 text-xs font-mono font-medium opacity-90 select-none"
                >
                  <DrawDeskLogo className="w-4 h-4" size={16} />
                  <span
                    className={`text-[11px] font-semibold tracking-tight ${
                      isDark ? 'text-zinc-300' : 'text-zinc-700'
                    }`}
                  >
                    DrawDesk
                  </span>
                </div>

                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium border shadow-2xs ${
                    isDark
                      ? 'bg-zinc-800/80 text-zinc-300 border-zinc-700'
                      : 'bg-white text-zinc-800 border-zinc-300'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full inline-block ${
                      isDark ? 'bg-amber-400' : 'bg-amber-600'
                    }`}
                  />
                  <span>Acme 12-Field</span>
                </div>

                <div
                  title="Peg Registration: Locked (Standard Acme alignment)"
                  className={`p-1.5 rounded border shadow-2xs ${
                    isDark
                      ? 'bg-zinc-800/80 text-zinc-300 border-zinc-700'
                      : 'bg-white text-zinc-700 border-zinc-300'
                  }`}
                >
                  <Lock className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`} />
                </div>
              </div>

              {/* Center: Authentic Machined Acme 3-Peg Hardware */}
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
                      isDark ? 'text-zinc-500' : 'text-zinc-500'
                    }`}
                  >
                    SLOT L
                  </span>
                </div>

                {/* Center Acme Round Peg */}
                <div className="flex flex-col items-center">
                  <div
                    title="Acme Round Peg (Center: 0.250 in diameter)"
                    className="w-3.5 h-3.5 rounded-full bg-gradient-to-b from-zinc-300 via-zinc-400 to-zinc-600 shadow-[0_1px_2px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.7)] border border-zinc-500"
                  />
                  <span
                    className={`text-[9px] font-mono mt-0.5 font-bold ${
                      isDark ? 'text-amber-400/90' : 'text-amber-700'
                    }`}
                  >
                    CENTER
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
                      isDark ? 'text-zinc-500' : 'text-zinc-500'
                    }`}
                  >
                    SLOT R
                  </span>
                </div>
              </div>

              {/* Right Side: Quick Active Frame Badge */}
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                    isDark
                      ? 'bg-zinc-800 border-zinc-700 text-amber-400'
                      : 'bg-white border-zinc-300 text-amber-700'
                  }`}
                >
                  BOARD {currentFrameIndex + 1}/{timingData.timings.length}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* The Physical Paper Storyboard Sheet (Screening Table) */}
        <div className="relative w-full my-auto py-1">
          {/* Stacked paper edge underneath for tactile paper sketchbook depth */}
          <div
            className={`absolute inset-0 rounded-md shadow-xs border pointer-events-none transform translate-y-2 translate-x-1 scale-[0.99] -z-10 transition-colors ${
              isDark ? 'bg-[#141416] border-zinc-800' : 'bg-[#DFDBD1] border-zinc-300/80'
            }`}
          />

          {/* Front Face of Storyboard Sheet - drafting paper texture */}
          <div
            className={`relative rounded-md border shadow-[0_8px_30px_-4px_rgba(0,0,0,0.12),0_2px_6px_rgba(0,0,0,0.06)] overflow-hidden transition-colors ${
              isDark ? 'bg-[#1E1E22] border-zinc-700/80' : 'bg-[#F4F0E8] border-zinc-300'
            }`}
            style={{
              backgroundImage: isDark
                ? `radial-gradient(#2d2d34 0.75px, transparent 0.75px), radial-gradient(#2d2d34 0.75px, #1E1E22 0.75px)`
                : `radial-gradient(#dedad0 0.75px, transparent 0.75px), radial-gradient(#dedad0 0.75px, #F4F0E8 0.75px)`,
              backgroundSize: '30px 30px',
              backgroundPosition: '0 0, 15px 15px',
            }}
          >
            <div
              className={`p-4 sm:p-6 flex flex-col gap-3 font-sans transition-colors ${
                isDark ? 'text-zinc-200' : 'text-zinc-900'
              }`}
            >
              {/* Traditional Pre-Printed Storyboard Header Stamp */}
              <div
                className={`flex flex-wrap items-center justify-between border-b pb-2 text-xs font-mono gap-2 ${
                  isDark ? 'border-zinc-800 text-zinc-400' : 'border-zinc-300 text-zinc-700'
                }`}
              >
                {/* Scene, Panel, Shot Stamping */}
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        isDark ? 'text-zinc-400' : 'text-zinc-600'
                      }`}
                    >
                      SCENE:
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold font-mono ${
                        isDark ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-200/70 text-zinc-900'
                      }`}
                    >
                      {activeTiming?.sceneNumber || '1'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        isDark ? 'text-zinc-400' : 'text-zinc-600'
                      }`}
                    >
                      PANEL:
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold font-mono ${
                        isDark ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-200/70 text-zinc-900'
                      }`}
                    >
                      {activeTiming?.panelNumber || '1'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        isDark ? 'text-zinc-400' : 'text-zinc-600'
                      }`}
                    >
                      SHOT:
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold font-mono ${
                        isDark ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-200/70 text-zinc-900'
                      }`}
                    >
                      {activeTiming?.shotNumber || '1'}
                    </span>
                  </div>
                </div>

                {/* Timing & Timecode Readout */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-1 text-[11px]">
                    <span
                      className={`text-[10px] font-bold uppercase ${
                        isDark ? 'text-zinc-400' : 'text-zinc-600'
                      }`}
                    >
                      TIMING:
                    </span>
                    <span className="font-bold tabular-nums">
                      {activeTiming?.durationSec.toFixed(2)} sec
                    </span>
                  </div>

                  <span className={isDark ? 'text-zinc-700' : 'text-zinc-300'}>|</span>
                  <span
                    className={`text-[10px] font-mono font-medium tabular-nums ${
                      isDark ? 'text-zinc-400' : 'text-zinc-600'
                    }`}
                  >
                    {activeTiming?.frameCount24} FRAMES @ 24FPS
                  </span>

                  <span className={isDark ? 'text-zinc-700' : 'text-zinc-300'}>|</span>
                  <span className="text-[10px] font-mono font-bold text-sky-500">
                    TC: {formatTimecode(currentTimeSec, fps)}
                  </span>
                </div>
              </div>

              {/* 16:9 Screening Canvas Viewport (Framed in the sheet, matching Drawing Desk) */}
              <div
                className={`relative w-full aspect-16/9 rounded-lg overflow-hidden border shadow-xs flex items-center justify-center transition-colors ${
                  canvasPaperTone === 'paper'
                    ? 'bg-[#F4F0E8] border-zinc-400/80 text-zinc-900'
                    : canvasPaperTone === 'white'
                    ? 'bg-white border-zinc-300 text-zinc-900'
                    : 'bg-[#18181c] border-zinc-800 text-zinc-100'
                }`}
              >
                {/* Traditional die-cut Acme peg holes at top (matching DrawingCanvas) */}
                <div
                  className="absolute top-2 left-0 right-0 flex items-center justify-center gap-16 pointer-events-none z-10"
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

                {/* Traditional Storyboard Framing & Safe Action Boundaries (identical to DrawingCanvas) */}
                <div className="absolute inset-4 pointer-events-none border border-zinc-400/70 rounded-xs z-10">
                  <div className="absolute inset-4 border border-dashed border-zinc-400/40 rounded-xs">
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

                {/* Active Frame Drawing */}
                {activeFrame?.canvasData ? (
                  <img
                    src={activeFrame.canvasData}
                    alt={`Scene ${activeTiming?.sceneNumber} Panel ${activeTiming?.panelNumber}`}
                    className="relative z-20 w-full h-full object-contain select-none"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-zinc-500 p-4 relative z-20">
                    <Sparkles className="w-8 h-8 mb-2 opacity-40 text-amber-500" />
                    <span className="text-xs font-mono font-medium text-zinc-700">No drawing on this frame</span>
                    <span className="text-[11px] text-zinc-500 mt-0.5">
                      Ready for storyboard illustration
                    </span>
                  </div>
                )}

                {/* Optional Safe Action & Safe Title 16:9 Guides Overlay */}
                {showSafeGuides && (
                  <div className="absolute inset-0 pointer-events-none z-10 p-6 sm:p-10">
                    <div className="w-full h-full border border-sky-400/30 border-dashed rounded-lg flex items-center justify-center relative">
                      <div className="w-[85%] h-[85%] border border-amber-400/30 border-dashed rounded-sm" />
                      <div className="absolute top-2 left-2 text-[10px] font-mono text-sky-400/70">
                        ACTION SAFE 90%
                      </div>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-sky-400/50 flex items-center justify-center">
                        +
                      </div>
                    </div>
                  </div>
                )}

                {/* Live Timecode & Board HUD (Top Corners) */}
                {showTimecodeHud && activeTiming && (
                  <div className="absolute top-2.5 inset-x-3 flex items-center justify-between pointer-events-none z-20">
                    <div className="px-2.5 py-1 bg-black/80 backdrop-blur-xs rounded text-[11px] font-mono font-bold text-white border border-white/10 shadow-sm">
                      SCENE {activeTiming.sceneNumber} • PANEL {activeTiming.panelNumber} • SHOT{' '}
                      {activeTiming.shotNumber}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="px-2.5 py-1 bg-black/80 backdrop-blur-xs rounded text-[11px] font-mono font-bold text-sky-400 border border-sky-500/20 shadow-sm">
                        TC: {formatTimecode(currentTimeSec, fps)}
                      </div>
                      <div className="px-2.5 py-1 bg-black/80 backdrop-blur-xs rounded text-[11px] font-mono text-zinc-300 border border-white/10 shadow-sm">
                        {currentFrameIndex + 1}/{timingData.timings.length}
                      </div>
                    </div>
                  </div>
                )}

                {/* Subtitle / Dialogue & Action Notes Lower-Third Banner */}
                {showSubtitles && (activeTiming?.dialogueNotes || activeTiming?.actionNotes) && (
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent pt-8 pb-3 px-6 pointer-events-none z-20 text-center">
                    {activeTiming.dialogueNotes && (
                      <p className="text-sm sm:text-base font-semibold text-yellow-300 tracking-wide drop-shadow-md">
                        “{activeTiming.dialogueNotes}”
                      </p>
                    )}
                    {showActionNotes && activeTiming.actionNotes && (
                      <p className="text-xs italic text-zinc-300 mt-1 max-w-2xl mx-auto drop-shadow-xs">
                        {activeTiming.actionNotes}
                      </p>
                    )}
                  </div>
                )}

                {/* Floating Quick Toggles in Bottom-Right Corner of Viewport */}
                <div className="absolute bottom-2 right-2 flex items-center gap-1.5 z-30 opacity-70 hover:opacity-100 transition-opacity">
                  {/* Paper Tone Quick Toggle */}
                  <button
                    onClick={() =>
                      setCanvasPaperTone((curr) =>
                        curr === 'paper' ? 'white' : curr === 'white' ? 'dark' : 'paper'
                      )
                    }
                    className="px-2 py-1 rounded text-[10px] font-mono font-bold backdrop-blur-md border bg-black/60 text-zinc-200 border-white/20 hover:bg-black/80 transition-colors"
                    title={`Paper Tone: ${canvasPaperTone}. Click to toggle Paper/White/Dark`}
                  >
                    {canvasPaperTone === 'paper'
                      ? '📜 DRAFTING PAPER'
                      : canvasPaperTone === 'white'
                      ? '⬜ WHITE'
                      : '⬛ DARK'}
                  </button>

                  <button
                    onClick={() => setShowSubtitles((v) => !v)}
                    className={`p-1.5 rounded text-xs font-mono backdrop-blur-md border transition-colors ${
                      showSubtitles
                        ? 'bg-amber-500/80 text-black border-amber-400'
                        : 'bg-black/60 text-zinc-400 border-white/10'
                    }`}
                    title="Toggle Dialogue Subtitles"
                  >
                    <Subtitles className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setShowTimecodeHud((v) => !v)}
                    className={`p-1.5 rounded text-xs font-mono backdrop-blur-md border transition-colors ${
                      showTimecodeHud
                        ? 'bg-amber-500/80 text-black border-amber-400'
                        : 'bg-black/60 text-zinc-400 border-white/10'
                    }`}
                    title="Toggle Timecode HUD"
                  >
                    <Clock className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setShowSafeGuides((v) => !v)}
                    className={`p-1.5 rounded text-xs font-mono backdrop-blur-md border transition-colors ${
                      showSafeGuides
                        ? 'bg-amber-500/80 text-black border-amber-400'
                        : 'bg-black/60 text-zinc-400 border-white/10'
                    }`}
                    title="Toggle 16:9 Safe Title Guides"
                  >
                    <Grid3X3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

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
                  <div
                    className={`w-full min-h-[46px] rounded px-2.5 py-1.5 text-xs font-sans leading-relaxed border ${
                      isDark
                        ? 'bg-zinc-800/80 border-zinc-700/80 text-zinc-200'
                        : 'bg-zinc-200/40 border-zinc-300/90 text-zinc-900'
                    }`}
                  >
                    {activeFrame?.actionNotes ? (
                      activeFrame.actionNotes
                    ) : (
                      <span className="italic opacity-40">No action description specified</span>
                    )}
                  </div>
                </div>

                {/* Dialogue / Audio */}
                <div className="flex flex-col gap-1">
                  <label
                    className={`text-[10px] font-mono font-bold uppercase tracking-wide ${
                      isDark ? 'text-zinc-400' : 'text-zinc-700'
                    }`}
                  >
                    DIALOGUE / AUDIO:
                  </label>
                  <div
                    className={`w-full min-h-[46px] rounded px-2.5 py-1.5 text-xs font-sans leading-relaxed border ${
                      isDark
                        ? 'bg-zinc-800/80 border-zinc-700/80 text-yellow-300'
                        : 'bg-zinc-200/40 border-zinc-300/90 text-zinc-900'
                    }`}
                  >
                    {activeFrame?.dialogueNotes ? (
                      <span>“{activeFrame.dialogueNotes}”</span>
                    ) : (
                      <span className="italic opacity-40">No dialogue note specified</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center Desk Transport & Scrubber Controls */}
        <div
          className={`w-full rounded-xl border p-3 flex flex-col gap-2.5 shadow-sm transition-colors ${
            isDark
              ? 'bg-[#18181b]/95 border-zinc-800 text-zinc-200'
              : 'bg-[#EFECE6]/95 border-zinc-300 text-zinc-800'
          }`}
        >
          {/* Top Row: Timecode, Board indicator, and Quick Jump buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div
                className={`px-2.5 py-1 rounded-md border font-mono font-bold text-xs tracking-wider flex items-center gap-1.5 ${
                  isDark
                    ? 'bg-zinc-900 border-zinc-700 text-amber-400'
                    : 'bg-white border-zinc-300 text-zinc-900'
                }`}
              >
                <span>{formatTimecode(currentTimeSec, fps)}</span>
                <span className="text-[10px] opacity-60">
                  / {formatTimecode(totalDuration, fps)}
                </span>
              </div>

              <span className="text-[11px] font-mono opacity-75">
                Frame {Math.floor(currentTimeSec * fps)} / {timingData.totalFrames24}
              </span>
            </div>

            {/* Transport Stepping Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleJumpToStart}
                className={`p-1.5 rounded border transition-colors ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300'
                    : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-800'
                }`}
                title="Jump to Start (Home)"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleJumpPrevBoard}
                className={`px-2 py-1 rounded border text-xs font-mono font-semibold transition-colors ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300'
                    : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-800'
                }`}
                title="Previous Board (Shift+Left)"
              >
                ◀ Board
              </button>

              <button
                onClick={() => handleStepFrame(-1)}
                className={`px-2 py-1 rounded border text-xs font-mono font-semibold transition-colors ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300'
                    : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-800'
                }`}
                title="Step Backward 1 Frame (Left Arrow)"
              >
                -1 fr
              </button>

              <button
                onClick={() => setIsPlaying((p) => !p)}
                className={`px-4 py-1.5 rounded-lg font-bold flex items-center gap-1.5 text-xs transition-all shadow-xs ${
                  isPlaying
                    ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold'
                    : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold'
                }`}
                title="Play / Pause Animatic (Space)"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    <span>Play Animatic</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleStepFrame(1)}
                className={`px-2 py-1 rounded border text-xs font-mono font-semibold transition-colors ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300'
                    : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-800'
                }`}
                title="Step Forward 1 Frame (Right Arrow)"
              >
                +1 fr
              </button>

              <button
                onClick={handleJumpNextBoard}
                className={`px-2 py-1 rounded border text-xs font-mono font-semibold transition-colors ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300'
                    : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-800'
                }`}
                title="Next Board (Shift+Right)"
              >
                Board ▶
              </button>

              <button
                onClick={handleJumpToEnd}
                className={`p-1.5 rounded border transition-colors ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300'
                    : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-800'
                }`}
                title="Jump to End (End)"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Global Timeline Scrub Bar */}
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const pct = Math.max(0, Math.min(1, clickX / rect.width));
              setCurrentTimeSec(pct * timingData.totalDurationSec);
            }}
            className={`relative h-3 rounded-full cursor-pointer overflow-hidden border ${
              isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-200 border-zinc-300'
            }`}
          >
            {/* Progress Fill */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-amber-500 transition-all duration-75"
              style={{ width: `${progressPercent}%` }}
            />

            {/* Cut Tick Markers */}
            {timingData.timings.map((t, idx) => {
              const cutPct = totalDuration > 0 ? (t.startSec / totalDuration) * 100 : 0;
              return (
                <div
                  key={`tick_${idx}`}
                  className="absolute top-0 bottom-0 w-0.5 bg-black/50 z-10 pointer-events-none"
                  style={{ left: `${cutPct}%` }}
                />
              );
            })}
          </div>

          {/* Proportional Film Strip Rack */}
          <div className="relative overflow-x-auto pb-1 pt-0.5 flex items-stretch gap-1.5 scrollbar-thin">
            {timingData.timings.map((timing, idx) => {
              const isActive = idx === currentFrameIndex;
              const proportionalWidth = Math.max(85, Math.round(timing.durationSec * 80));

              return (
                <div
                  key={`strip_${idx}`}
                  onClick={() => handleSelectTimingBlock(timing)}
                  style={{ width: `${proportionalWidth}px` }}
                  className={`shrink-0 flex flex-col justify-between p-1.5 rounded-lg border cursor-pointer transition-all ${
                    isActive
                      ? isDark
                        ? 'ring-2 ring-amber-400 bg-zinc-800 border-amber-400/80 shadow-md'
                        : 'ring-2 ring-amber-500 bg-white border-amber-500 shadow-md'
                      : isDark
                      ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400'
                      : 'bg-white hover:bg-zinc-50 border-zinc-300 text-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[9px] font-mono mb-1">
                    <span className={`font-bold ${isActive ? 'text-amber-500' : ''}`}>
                      #{idx + 1}
                    </span>
                    <span className="opacity-75">{timing.durationSec.toFixed(1)}s</span>
                  </div>

                  <div className="w-full aspect-16/9 rounded overflow-hidden flex items-center justify-center border border-zinc-300/80 bg-[#F4F0E8] relative">
                    {timing.canvasData ? (
                      <img
                        src={timing.canvasData}
                        alt={`Panel ${timing.panelNumber}`}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-[8px] opacity-40 font-mono">Blank</span>
                    )}
                  </div>

                  <div className="mt-1 text-[9px] truncate opacity-75 font-mono">
                    {timing.timecodeIn}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Acme Peg Bar */}
        {showAcmePegs && (
          <div className="w-full px-2 sm:px-4 mx-auto flex flex-col items-center select-none z-30">
            <div
              className={`relative w-full border rounded-lg shadow-xs px-3 sm:px-4 py-2 flex items-center justify-between gap-3 transition-colors ${
                isDark
                  ? 'bg-gradient-to-b from-[#242429] via-[#1b1b1e] to-[#121214] border-zinc-800'
                  : 'bg-gradient-to-b from-[#F2EFE8] via-[#E8E4DC] to-[#DDD9D0] border-zinc-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-medium text-zinc-500">
                  Bottom Acme Registration
                </span>
              </div>

              {/* Peg Pins */}
              <div
                className={`hidden sm:flex items-center gap-8 px-6 py-1.5 rounded-md border shadow-inner ${
                  isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-zinc-200/70 border-zinc-300'
                }`}
              >
                <div className="w-8 h-2 rounded-full bg-gradient-to-b from-zinc-300 via-zinc-400 to-zinc-600 border border-zinc-500" />
                <div className="w-3 h-3 rounded-full bg-gradient-to-b from-zinc-300 via-zinc-400 to-zinc-600 border border-zinc-500" />
                <div className="w-8 h-2 rounded-full bg-gradient-to-b from-zinc-300 via-zinc-400 to-zinc-600 border border-zinc-500" />
              </div>

              <div className="text-[11px] font-mono text-zinc-500">24 FPS SYNC</div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* ZONE 3 (RIGHT): ANIMATIC DIRECTOR DOCK                          */}
      {/* Follows exact width and container styling of ToolDock in Desk  */}
      {/* ============================================================== */}
      <aside className="w-full lg:w-72 xl:w-80 shrink-0 lg:sticky lg:top-4 pb-6 lg:pb-0 order-3">
        <div
          className={`w-full flex flex-col gap-3 rounded-xl p-3 sm:p-3.5 shadow-md backdrop-blur-xs select-none transition-colors border ${
            isDark
              ? 'bg-[#18181b]/95 border-zinc-800 text-zinc-200'
              : 'bg-[#EFECE6]/95 border-zinc-300 text-zinc-800'
          }`}
        >
          {/* Dock Header */}
          <div className="flex items-center justify-between pb-2 border-b border-zinc-300/80 dark:border-zinc-800">
            <div className="flex items-center gap-1.5">
              <Film className="w-4 h-4 text-amber-500" />
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                Director Dock
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                B {currentFrameIndex + 1}/{timingData.timings.length}
              </span>
            </div>

            {/* Quick Actions (Fullscreen & Return to Desk) */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleToggleFullscreen}
                className={`p-1.5 rounded transition-colors ${
                  isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-200 text-zinc-700'
                }`}
                title="Toggle Theater Fullscreen"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={onBackToDesk}
                className={`flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded border transition-colors ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                    : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-800'
                }`}
                title="Return to Storyboard Drawing Desk"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Desk</span>
              </button>
            </div>
          </div>

          {/* SECTION 1: MASTER PLAYBACK TRANSPORT */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Playback Controls
            </span>

            {/* Big Primary Play/Pause Button */}
            <button
              onClick={() => setIsPlaying((p) => !p)}
              className="w-full py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 text-sm transition-all shadow-md active:scale-98 bg-amber-500 hover:bg-amber-400 text-zinc-950"
              title="Play / Pause Animatic (Space)"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause Animatic</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                  <span>Play Animatic (Space)</span>
                </>
              )}
            </button>

            {/* Stepper Buttons Row */}
            <div className="grid grid-cols-4 gap-1.5">
              <button
                onClick={handleJumpPrevBoard}
                className={`py-1.5 rounded-md border text-xs font-mono font-semibold flex items-center justify-center transition-colors ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                    : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-800'
                }`}
                title="Previous Board (Shift+Left)"
              >
                ◀ Board
              </button>

              <button
                onClick={() => handleStepFrame(-1)}
                className={`py-1.5 rounded-md border text-xs font-mono font-semibold flex items-center justify-center transition-colors ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300'
                    : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-700'
                }`}
                title="Step -1 frame (Left Arrow)"
              >
                -1 fr
              </button>

              <button
                onClick={() => handleStepFrame(1)}
                className={`py-1.5 rounded-md border text-xs font-mono font-semibold flex items-center justify-center transition-colors ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300'
                    : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-700'
                }`}
                title="Step +1 frame (Right Arrow)"
              >
                +1 fr
              </button>

              <button
                onClick={handleJumpNextBoard}
                className={`py-1.5 rounded-md border text-xs font-mono font-semibold flex items-center justify-center transition-colors ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                    : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-800'
                }`}
                title="Next Board (Shift+Right)"
              >
                Board ▶
              </button>
            </div>

            {/* Secondary Controls: Speed, Loop, Sound */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {/* Speed Selector */}
              <div className="flex items-center gap-1 col-span-1">
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                  className={`w-full px-2 py-1.5 text-xs font-mono font-bold rounded-lg border outline-none ${
                    isDark
                      ? 'bg-zinc-800 border-zinc-700 text-white'
                      : 'bg-white border-zinc-300 text-zinc-900'
                  }`}
                  title="Playback Speed"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={0.75}>0.75x</option>
                  <option value={1.0}>1.0x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2.0}>2.0x</option>
                </select>
              </div>

              {/* Loop Toggle */}
              <button
                onClick={() => setIsLooping((l) => !l)}
                className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  isLooping
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-500 font-bold'
                    : isDark
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-400'
                    : 'bg-white border-zinc-300 text-zinc-500'
                }`}
                title={isLooping ? 'Looping enabled' : 'Looping disabled'}
              >
                <Repeat className="w-3.5 h-3.5" />
                <span>Loop</span>
              </button>

              {/* Cut Clicks Sound Toggle */}
              <button
                onClick={() => setSoundEnabled((s) => !s)}
                className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  soundEnabled
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-500 font-bold'
                    : isDark
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-500'
                    : 'bg-white border-zinc-300 text-zinc-400'
                }`}
                title={soundEnabled ? 'Acoustic cut clicks active' : 'Cut sound muted'}
              >
                {soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5" />
                )}
                <span>Sound</span>
              </button>
            </div>
          </div>

          {/* SECTION 2: ACTIVE BOARD DURATION EDITOR */}
          <div className="flex flex-col gap-2 pt-2 border-t border-zinc-300/80 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Board {currentFrameIndex + 1} Duration
              </span>
              <span className="text-[10px] font-mono font-semibold text-amber-500">
                {activeTiming?.frameCount24} frames
              </span>
            </div>

            {/* Steppers & Exact input */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleAdjustActiveDuration(-1.0)}
                className={`px-2 py-1.5 text-xs font-mono font-semibold rounded border transition-colors ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700'
                    : 'bg-white hover:bg-zinc-100 border-zinc-300'
                }`}
                title="Decrease duration by 1.0 second"
              >
                -1s
              </button>
              <button
                onClick={() => handleAdjustActiveDuration(-0.25)}
                className={`px-2 py-1.5 text-xs font-mono font-semibold rounded border transition-colors ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700'
                    : 'bg-white hover:bg-zinc-100 border-zinc-300'
                }`}
                title="Decrease duration by 0.25s (6 frames)"
              >
                -0.25s
              </button>

              <div className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded border bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="60"
                  value={activeFrame?.durationSec || 1.0}
                  onChange={(e) => handleSetExactDuration(parseFloat(e.target.value) || 1)}
                  className="w-14 text-xs font-mono font-bold bg-transparent outline-none text-center"
                />
                <span className="text-[10px] font-mono opacity-60">sec</span>
              </div>

              <button
                onClick={() => handleAdjustActiveDuration(0.25)}
                className={`px-2 py-1.5 text-xs font-mono font-semibold rounded border transition-colors ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700'
                    : 'bg-white hover:bg-zinc-100 border-zinc-300'
                }`}
                title="Increase duration by 0.25s (6 frames)"
              >
                +0.25s
              </button>
              <button
                onClick={() => handleAdjustActiveDuration(1.0)}
                className={`px-2 py-1.5 text-xs font-mono font-semibold rounded border transition-colors ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700'
                    : 'bg-white hover:bg-zinc-100 border-zinc-300'
                }`}
                title="Increase duration by 1.0 second"
              >
                +1s
              </button>
            </div>
          </div>

          {/* SECTION 3: SCRATCH AUDIO & VOICEOVER TRACK */}
          <div className="flex flex-col gap-2 pt-2 border-t border-zinc-300/80 dark:border-zinc-800">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Scratch Audio Track
            </span>

            {scratchAudioUrl ? (
              <div className="flex flex-col gap-2 p-2 rounded-lg border border-amber-500/40 bg-amber-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <Music className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-[11px] font-mono font-medium text-amber-600 dark:text-amber-400 truncate max-w-[150px]">
                      {scratchAudioName}
                    </span>
                  </div>
                  <button
                    onClick={handleRemoveScratchAudio}
                    className="p-1 text-zinc-400 hover:text-red-400 transition-colors"
                    title="Remove scratch audio"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Volume slider */}
                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => setIsAudioMuted((m) => !m)}
                    className="text-zinc-400 hover:text-zinc-200"
                  >
                    {isAudioMuted ? (
                      <VolumeX className="w-3.5 h-3.5" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isAudioMuted ? 0 : audioVolume}
                    onChange={(e) => {
                      setAudioVolume(parseFloat(e.target.value));
                      if (isAudioMuted) setIsAudioMuted(false);
                    }}
                    className="flex-1 accent-amber-500 h-1.5 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] font-mono w-7 text-right">
                    {Math.round((isAudioMuted ? 0 : audioVolume) * 100)}%
                  </span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => audioFileInputRef.current?.click()}
                className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-semibold transition-colors ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                    : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-800'
                }`}
                title="Import temp voice track or scratch audio (MP3, WAV)"
              >
                <Music className="w-3.5 h-3.5 text-amber-500" />
                <span>Upload Scratch Audio</span>
              </button>
            )}
          </div>

          {/* SECTION 4: SCREEN OVERLAYS & VIEW PREFERENCES */}
          <div className="flex flex-col gap-2 pt-2 border-t border-zinc-300/80 dark:border-zinc-800">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Screening Overlays
            </span>

            <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
              <button
                onClick={() => setShowSubtitles((v) => !v)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[11px] transition-colors ${
                  showSubtitles
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-500 font-bold'
                    : isDark
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-400'
                    : 'bg-white border-zinc-300 text-zinc-600'
                }`}
              >
                <Subtitles className="w-3.5 h-3.5" />
                <span>Subtitles</span>
              </button>

              <button
                onClick={() => setShowTimecodeHud((v) => !v)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[11px] transition-colors ${
                  showTimecodeHud
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-500 font-bold'
                    : isDark
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-400'
                    : 'bg-white border-zinc-300 text-zinc-600'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>HUD Time</span>
              </button>

              <button
                onClick={() => setShowSafeGuides((v) => !v)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[11px] transition-colors ${
                  showSafeGuides
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-500 font-bold'
                    : isDark
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-400'
                    : 'bg-white border-zinc-300 text-zinc-600'
                }`}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                <span>Safe Guides</span>
              </button>

              <button
                onClick={() => setShowAcmePegs((v) => !v)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[11px] transition-colors ${
                  showAcmePegs
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-500 font-bold'
                    : isDark
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-400'
                    : 'bg-white border-zinc-300 text-zinc-600'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Acme Pegs</span>
              </button>
            </div>

            {/* Canvas Paper Tone Selector */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Paper Tone
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCanvasPaperTone('paper')}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                    canvasPaperTone === 'paper'
                      ? 'bg-amber-500 text-zinc-950 border-amber-600'
                      : isDark
                      ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      : 'bg-white text-zinc-600 border-zinc-300'
                  }`}
                  title="Warm drafting paper (#F4F0E8, authentic animation desk)"
                >
                  Paper
                </button>
                <button
                  onClick={() => setCanvasPaperTone('white')}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                    canvasPaperTone === 'white'
                      ? 'bg-amber-500 text-zinc-950 border-amber-600'
                      : isDark
                      ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      : 'bg-white text-zinc-600 border-zinc-300'
                  }`}
                  title="Clean white paper"
                >
                  White
                </button>
                <button
                  onClick={() => setCanvasPaperTone('dark')}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                    canvasPaperTone === 'dark'
                      ? 'bg-amber-500 text-zinc-950 border-amber-600'
                      : isDark
                      ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      : 'bg-white text-zinc-600 border-zinc-300'
                  }`}
                  title="Cinema dark background"
                >
                  Dark
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 5: EXPORT & DELIVERY */}
          <div className="flex flex-col gap-2 pt-2 border-t border-zinc-300/80 dark:border-zinc-800">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Export & Delivery
            </span>

            {/* Export Animatic Video CTA */}
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold bg-sky-500 hover:bg-sky-400 text-zinc-950 transition-colors shadow-xs"
              title="Render and export animatic as a video file (.webm)"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Export Animatic Video</span>
            </button>

            {/* Export Timing Sheet CSV */}
            <button
              onClick={() => exportAnimaticEdlCsv(projectTitle, frames, fps)}
              className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-semibold transition-colors ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-emerald-400'
                  : 'bg-white hover:bg-zinc-100 border-zinc-300 text-emerald-700'
              }`}
              title="Download Animatic Exposure Timing Sheet (.csv) for Premiere, Storyboard Pro, DaVinci"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Timing Sheet (CSV)</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* ANIMATIC VIDEO EXPORT MODAL                                    */}
      {/* ============================================================== */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 flex flex-col gap-5 ${
              isDark
                ? 'bg-[#18181c] border-zinc-700 text-zinc-100'
                : 'bg-[#FAF8F5] border-zinc-300 text-zinc-900'
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3 border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold">Export Animatic Video</h3>
              </div>
              <button
                onClick={() => {
                  if (!isRenderingVideo) setIsExportModalOpen(false);
                }}
                disabled={isRenderingVideo}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 disabled:opacity-30"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Render Progress or Configuration */}
            {isRenderingVideo ? (
              <div className="flex flex-col items-center justify-center py-6 gap-4 text-center">
                <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
                <div>
                  <h4 className="font-bold text-sm">Rendering Animatic...</h4>
                  <p className="text-xs text-zinc-400 mt-1 max-w-xs">{renderStatusText}</p>
                </div>
                <div className="w-full bg-zinc-700/40 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-sky-400 h-2.5 rounded-full transition-all duration-150"
                    style={{ width: `${renderProgress}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-bold text-sky-400">{renderProgress}%</span>
              </div>
            ) : renderedVideoUrl ? (
              /* Finished Render Result */
              <div className="flex flex-col gap-4">
                <div className="p-3 bg-emerald-950/30 border border-emerald-800/50 rounded-xl flex items-center gap-3">
                  <Check className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-300">Animatic Video Ready!</h4>
                    <p className="text-[11px] text-zinc-400">
                      Duration: {formatTimeShort(timingData.totalDurationSec)} (
                      {timingData.timings.length} boards)
                    </p>
                  </div>
                </div>

                <video
                  src={renderedVideoUrl}
                  controls
                  className="w-full rounded-lg border border-zinc-700 aspect-16/9 bg-[#F4F0E8]"
                />

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      setRenderedVideoUrl(null);
                      setRenderedVideoBlob(null);
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-700 hover:bg-zinc-800"
                  >
                    Re-render
                  </button>
                  <button
                    onClick={handleDownloadRenderedVideo}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-colors shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Video</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Export Settings Form */
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold font-mono">RESOLUTION & QUALITY</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setExportRes('1080p')}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        exportRes === '1080p'
                          ? 'border-sky-400 bg-sky-500/15 ring-1 ring-sky-400'
                          : 'border-zinc-700 bg-zinc-800/60'
                      }`}
                    >
                      <div className="text-xs font-bold">1080p Full HD</div>
                      <div className="text-[10px] text-zinc-400">1920 × 1080 (Crisp)</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportRes('720p')}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        exportRes === '720p'
                          ? 'border-sky-400 bg-sky-500/15 ring-1 ring-sky-400'
                          : 'border-zinc-700 bg-zinc-800/60'
                      }`}
                    >
                      <div className="text-xs font-bold">720p HD</div>
                      <div className="text-[10px] text-zinc-400">1280 × 720 (Fast)</div>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold font-mono">BURN-IN OVERLAYS</label>
                  <label className="flex items-center gap-2.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportBurnSubs}
                      onChange={(e) => setExportBurnSubs(e.target.checked)}
                      className="rounded accent-sky-500"
                    />
                    <span>Burn dialogue & action subtitles into video</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportBurnTc}
                      onChange={(e) => setExportBurnTc(e.target.checked)}
                      className="rounded accent-sky-500"
                    />
                    <span>Burn running SMPTE timecode & scene/panel tag</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportPegs}
                      onChange={(e) => setExportPegs(e.target.checked)}
                      className="rounded accent-sky-500"
                    />
                    <span>Include traditional Acme peg registration holes</span>
                  </label>
                </div>

                {scratchAudioName && (
                  <div className="p-2.5 rounded-lg border border-sky-500/30 bg-sky-500/10 flex items-center gap-2 text-xs">
                    <Music className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="truncate">Audio Track: {scratchAudioName}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    onClick={() => setIsExportModalOpen(false)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-700 hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleStartVideoRender}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 transition-colors shadow-xs"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Start Video Render</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

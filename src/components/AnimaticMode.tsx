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
import { playFrameCutSound } from '../utils/audio';
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
  FolderOpen,
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

  // Derived current active frame
  const currentFrameIndex = useMemo(() => {
    return findFrameIndexAtTime(timingData.timings, currentTimeSec);
  }, [timingData.timings, currentTimeSec]);

  const activeTiming: FrameTiming | undefined = timingData.timings[currentFrameIndex];
  const activeFrame: Frame | undefined = frames[currentFrameIndex];

  // Track frame cuts to play audio cue
  const lastCutFrameIndexRef = useRef<number>(currentFrameIndex);

  // High precision animation frame ref
  const lastRafTimestampRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Container ref for fullscreen
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle scratch audio file upload
  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
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
    }
    setScratchAudioUrl(null);
    setScratchAudioName(null);
  };

  // Sync scratch audio with playhead
  useEffect(() => {
    const audio = audioElementRef.current;
    if (!audio) return;

    audio.volume = isAudioMuted ? 0 : audioVolume;

    if (isPlaying) {
      // Seek audio to match animatic playhead
      if (Math.abs(audio.currentTime - currentTimeSec) > 0.15) {
        audio.currentTime = currentTimeSec;
      }
      audio.playbackRate = playbackSpeed;
      audio.play().catch(() => {});
    } else {
      audio.pause();
      audio.currentTime = currentTimeSec;
    }
  }, [isPlaying, currentTimeSec, playbackSpeed, isAudioMuted, audioVolume]);

  // Main high-precision Playback Loop
  useEffect(() => {
    if (!isPlaying) {
      lastRafTimestampRef.current = null;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      return;
    }

    const step = (timestamp: number) => {
      if (lastRafTimestampRef.current === null) {
        lastRafTimestampRef.current = timestamp;
      }

      const deltaMs = timestamp - lastRafTimestampRef.current;
      lastRafTimestampRef.current = timestamp;

      // Advance time based on delta and speed multiplier
      const deltaSec = (deltaMs / 1000) * playbackSpeed;

      setCurrentTimeSec((prevTime) => {
        const nextTime = prevTime + deltaSec;
        const total = timingData.totalDurationSec;

        if (total <= 0) return 0;

        if (nextTime >= total) {
          if (isLooping) {
            return 0;
          } else {
            setIsPlaying(false);
            return total;
          }
        }
        return nextTime;
      });

      rafIdRef.current = requestAnimationFrame(step);
    };

    rafIdRef.current = requestAnimationFrame(step);

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [isPlaying, playbackSpeed, isLooping, timingData.totalDurationSec]);

  // Play shutter / cut click sound on frame change during playback
  useEffect(() => {
    if (currentFrameIndex !== lastCutFrameIndexRef.current) {
      if (isPlaying && soundEnabled) {
        playFrameCutSound(0.06);
      }
      lastCutFrameIndexRef.current = currentFrameIndex;
    }
  }, [currentFrameIndex, isPlaying, soundEnabled]);

  // Keyboard navigation & playback shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (e.shiftKey) {
          // Jump to next board
          handleJumpNextBoard();
        } else {
          // Step 1 film frame
          handleStepFrame(1);
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (e.shiftKey) {
          // Jump to previous board
          handleJumpPrevBoard();
        } else {
          // Step -1 film frame
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
          width: exportRes === '1080p' ? 1920 : 1280,
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

  // Download rendered video
  const handleDownloadRenderedVideo = () => {
    if (!renderedVideoUrl) return;
    const link = document.createElement('a');
    link.href = renderedVideoUrl;
    const safeTitle = (projectTitle || 'Animatic').trim().replace(/[^a-z0-9_-]/gi, '_');
    link.download = `${safeTitle}_Animatic_${exportRes}.webm`;
    link.click();
  };

  // Calculate timeline progress percentage
  const totalDuration = timingData.totalDurationSec;
  const progressPercent = totalDuration > 0 ? (currentTimeSec / totalDuration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={`min-h-full flex-1 flex flex-col w-full transition-colors select-none ${
        isDark ? 'bg-[#0f0f12] text-zinc-100' : 'bg-[#EDEAE4] text-zinc-900'
      }`}
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

      {/* Top Header Bar */}
      <header
        className={`px-4 py-2.5 border-b flex items-center justify-between gap-3 shrink-0 ${
          isDark ? 'bg-[#15151a] border-zinc-800' : 'bg-[#FAF8F5] border-zinc-300'
        }`}
      >
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDesk}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-800'
            }`}
            title="Return to Storyboard Drawing Desk"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to Desk</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold font-mono uppercase bg-amber-500/20 text-amber-500 border border-amber-500/30">
              <Film className="w-3 h-3" />
              <span>Animatic Mode</span>
            </div>
            <h2 className="text-sm font-bold truncate max-w-[200px] sm:max-w-xs">{projectTitle}</h2>
          </div>
        </div>

        {/* Center: Overall timing stats badge */}
        <div className="hidden md:flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 opacity-80">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>
              Total: <strong>{formatTimeShort(timingData.totalDurationSec)}</strong> (
              {timingData.totalFrames24} frames @ 24fps)
            </span>
          </div>
          <div className="flex items-center gap-1.5 opacity-80">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Board: <strong>{currentFrameIndex + 1}</strong> of {timingData.timings.length}
            </span>
          </div>
        </div>

        {/* Right: Actions (CSV EDL, Video Export, Audio, Fullscreen) */}
        <div className="flex items-center gap-2">
          {/* Export Timing Sheet CSV */}
          <button
            onClick={() => exportAnimaticEdlCsv(projectTitle, frames, fps)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-emerald-400'
                : 'bg-white hover:bg-zinc-100 border-zinc-300 text-emerald-700'
            }`}
            title="Download Animatic Exposure Timing Sheet (.csv) for Premiere, Storyboard Pro, DaVinci"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Timing Sheet (CSV)</span>
          </button>

          {/* Export Animatic Video */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md bg-sky-500 hover:bg-sky-400 text-zinc-950 transition-colors shadow-xs"
            title="Render and export animatic as a video file (.webm)"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Export Animatic Video</span>
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={handleToggleFullscreen}
            className={`p-1.5 rounded-md border transition-colors ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300'
                : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-700'
            }`}
            title="Toggle Theater Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Theme toggle */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className={`p-1.5 rounded-md border transition-colors ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-amber-400'
                  : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-700'
              }`}
              title="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          )}
        </div>
      </header>

      {/* Main Theater / Screening Room Stage */}
      <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-5 relative min-h-0 overflow-hidden">
        {/* Screening Frame Container */}
        <div className="relative w-full max-w-5xl aspect-16/9 bg-zinc-950 rounded-xl overflow-hidden shadow-2xl border border-zinc-800 flex flex-col justify-between">
          {/* Top Traditional Acme Peg Bar (Stylized) */}
          {showAcmePegs && (
            <div className="h-6 sm:h-7 bg-[#1c1c22] border-b border-zinc-800 flex items-center justify-between px-4 shrink-0 z-20">
              <span className="text-[10px] font-mono font-bold tracking-wider text-zinc-500">
                ACME 12-FIELD REGISTRATION • 24 FPS
              </span>
              {/* Peg pins */}
              <div className="flex items-center gap-12 sm:gap-24 opacity-75">
                <div className="w-4 h-1.5 bg-zinc-400 rounded-xs" />
                <div className="w-2 h-2 bg-zinc-400 rounded-full" />
                <div className="w-4 h-1.5 bg-zinc-400 rounded-xs" />
              </div>
              <span className="text-[10px] font-mono text-zinc-500">
                SCENE {activeTiming?.sceneNumber || '1'}
              </span>
            </div>
          )}

          {/* Canvas Display Viewport */}
          <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-zinc-950">
            {activeFrame?.canvasData ? (
              <img
                src={activeFrame.canvasData}
                alt={`Scene ${activeTiming?.sceneNumber} Panel ${activeTiming?.panelNumber}`}
                className="w-full h-full object-contain p-2 transition-transform duration-100"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-zinc-500">
                <Sparkles className="w-10 h-10 mb-2 opacity-40" />
                <span className="text-xs font-mono">No Drawing Data on this Frame</span>
              </div>
            )}

            {/* Optional Safe Action / 16:9 Title Guides Overlay */}
            {showSafeGuides && (
              <div className="absolute inset-0 pointer-events-none z-10 p-6 sm:p-10">
                <div className="w-full h-full border border-sky-500/30 border-dashed rounded-lg flex items-center justify-center relative">
                  <div className="w-[85%] h-[85%] border border-amber-500/30 border-dashed rounded-sm" />
                  <div className="absolute top-2 left-2 text-[10px] font-mono text-sky-400/60">
                    SAFE ACTION 90%
                  </div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-sky-400/40 flex items-center justify-center">
                    +
                  </div>
                </div>
              </div>
            )}

            {/* Timecode & HUD Overlay (Top Corners) */}
            {showTimecodeHud && activeTiming && (
              <div className="absolute top-2 inset-x-2 flex items-center justify-between pointer-events-none z-20">
                {/* Scene & Panel tag */}
                <div className="px-2.5 py-1 bg-black/75 backdrop-blur-xs rounded text-[11px] font-mono font-bold text-white border border-white/10 shadow-xs">
                  SCENE {activeTiming.sceneNumber} • PANEL {activeTiming.panelNumber} • SHOT{' '}
                  {activeTiming.shotNumber}
                </div>

                {/* Live Running Timecode & Board Counter */}
                <div className="flex items-center gap-2">
                  <div className="px-2.5 py-1 bg-black/75 backdrop-blur-xs rounded text-[11px] font-mono font-bold text-sky-400 border border-sky-500/20 shadow-xs">
                    TC: {formatTimecode(currentTimeSec, fps)}
                  </div>
                  <div className="px-2.5 py-1 bg-black/75 backdrop-blur-xs rounded text-[11px] font-mono text-zinc-300 border border-white/10 shadow-xs">
                    BOARD {currentFrameIndex + 1}/{timingData.timings.length}
                  </div>
                </div>
              </div>
            )}

            {/* Subtitle / Dialogue & Action Direction Bar (Lower Thirds) */}
            {showSubtitles && (activeTiming?.dialogueNotes || activeTiming?.actionNotes) && (
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent pt-6 pb-3 px-6 pointer-events-none z-20 text-center">
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
          </div>

          {/* Screening stage floating quick toggles (Bottom right overlay) */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5 z-30 opacity-70 hover:opacity-100 transition-opacity">
            <button
              onClick={() => setShowSubtitles((v) => !v)}
              className={`p-1.5 rounded text-xs font-mono backdrop-blur-md border ${
                showSubtitles
                  ? 'bg-sky-500/80 text-black border-sky-400'
                  : 'bg-black/60 text-zinc-400 border-white/10'
              }`}
              title="Toggle Dialogue Subtitles"
            >
              <Subtitles className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowTimecodeHud((v) => !v)}
              className={`p-1.5 rounded text-xs font-mono backdrop-blur-md border ${
                showTimecodeHud
                  ? 'bg-sky-500/80 text-black border-sky-400'
                  : 'bg-black/60 text-zinc-400 border-white/10'
              }`}
              title="Toggle Timecode HUD"
            >
              <Clock className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowSafeGuides((v) => !v)}
              className={`p-1.5 rounded text-xs font-mono backdrop-blur-md border ${
                showSafeGuides
                  ? 'bg-sky-500/80 text-black border-sky-400'
                  : 'bg-black/60 text-zinc-400 border-white/10'
              }`}
              title="Toggle 16:9 Safe Title Guides"
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowAcmePegs((v) => !v)}
              className={`px-1.5 py-1 rounded text-[10px] font-mono backdrop-blur-md border ${
                showAcmePegs
                  ? 'bg-sky-500/80 text-black border-sky-400'
                  : 'bg-black/60 text-zinc-400 border-white/10'
              }`}
              title="Toggle Acme Peg Bar"
            >
              PEGS
            </button>
          </div>
        </div>
      </div>

      {/* Playback Controls & Master Transport Bar */}
      <div
        className={`px-4 py-2 border-t shrink-0 flex flex-wrap items-center justify-between gap-3 ${
          isDark ? 'bg-[#15151a] border-zinc-800' : 'bg-[#FAF8F5] border-zinc-300'
        }`}
      >
        {/* Left: Timecode and frame counter */}
        <div className="flex items-center gap-3">
          <div
            className={`px-3 py-1 rounded-lg border font-mono font-bold text-sm tracking-wider flex items-center gap-2 ${
              isDark ? 'bg-zinc-900 border-zinc-700 text-sky-400' : 'bg-white border-zinc-300 text-zinc-900'
            }`}
          >
            <span>{formatTimecode(currentTimeSec, fps)}</span>
            <span className="text-[10px] opacity-60">/ {formatTimecode(timingData.totalDurationSec, fps)}</span>
          </div>

          <span className="text-xs font-mono hidden sm:inline opacity-75">
            Frame {Math.floor(currentTimeSec * fps)} / {timingData.totalFrames24}
          </span>
        </div>

        {/* Center: Main Transport Buttons */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Jump to Start */}
          <button
            onClick={handleJumpToStart}
            className={`p-2 rounded-lg border transition-colors ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-800'
            }`}
            title="Jump to Start (Home)"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Jump to Prev Board */}
          <button
            onClick={handleJumpPrevBoard}
            className={`p-2 rounded-lg border transition-colors ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-800'
            }`}
            title="Previous Board (Shift+Left)"
          >
            <span className="text-xs font-bold font-mono">◀ Board</span>
          </button>

          {/* Step -1 Frame */}
          <button
            onClick={() => handleStepFrame(-1)}
            className={`px-2 py-1.5 rounded-lg border text-xs font-mono font-semibold transition-colors ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300'
                : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-700'
            }`}
            title="Step Backward 1 Frame (Left Arrow)"
          >
            -1 fr
          </button>

          {/* Master Play / Pause Button */}
          <button
            onClick={() => setIsPlaying((p) => !p)}
            className={`px-5 py-2 rounded-lg font-bold flex items-center gap-2 text-sm transition-all shadow-md active:scale-95 ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 ring-2 ring-amber-500/40'
                : 'bg-sky-500 hover:bg-sky-400 text-zinc-950 ring-2 ring-sky-500/40'
            }`}
            title="Play / Pause Animatic (Spacebar)"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current ml-0.5" />
                <span>Play Animatic</span>
              </>
            )}
          </button>

          {/* Step +1 Frame */}
          <button
            onClick={() => handleStepFrame(1)}
            className={`px-2 py-1.5 rounded-lg border text-xs font-mono font-semibold transition-colors ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300'
                : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-700'
            }`}
            title="Step Forward 1 Frame (Right Arrow)"
          >
            +1 fr
          </button>

          {/* Jump to Next Board */}
          <button
            onClick={handleJumpNextBoard}
            className={`p-2 rounded-lg border transition-colors ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-800'
            }`}
            title="Next Board (Shift+Right)"
          >
            <span className="text-xs font-bold font-mono">Board ▶</span>
          </button>

          {/* Jump to End */}
          <button
            onClick={handleJumpToEnd}
            className={`p-2 rounded-lg border transition-colors ${
              isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-800'
            }`}
            title="Jump to End (End)"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Secondary Playback Settings (Loop, Speed, Cut Audio, Scratch Audio) */}
        <div className="flex items-center gap-2">
          {/* Loop toggle */}
          <button
            onClick={() => setIsLooping((l) => !l)}
            className={`p-2 rounded-lg border transition-colors ${
              isLooping
                ? 'bg-sky-500/20 border-sky-500/40 text-sky-400 font-bold'
                : isDark
                ? 'bg-zinc-800 border-zinc-700 text-zinc-400'
                : 'bg-white border-zinc-300 text-zinc-500'
            }`}
            title={isLooping ? 'Looping enabled' : 'Looping disabled'}
          >
            <Repeat className="w-4 h-4" />
          </button>

          {/* Cut Click sound toggle */}
          <button
            onClick={() => setSoundEnabled((s) => !s)}
            className={`p-2 rounded-lg border transition-colors ${
              soundEnabled
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                : isDark
                ? 'bg-zinc-800 border-zinc-700 text-zinc-500'
                : 'bg-white border-zinc-300 text-zinc-400'
            }`}
            title={soundEnabled ? 'Acoustic cut clicks enabled' : 'Cut sound muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Playback speed selector */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono opacity-70 hidden sm:inline">Speed:</span>
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              className={`px-2 py-1.5 text-xs font-mono font-bold rounded-lg border outline-none ${
                isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-900'
              }`}
            >
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={1.0}>1.0x (Norm)</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2.0}>2.0x</option>
            </select>
          </div>

          {/* Scratch Audio Track Manager */}
          {scratchAudioUrl ? (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg border border-sky-500/40 bg-sky-500/10 text-xs">
              <Music className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="max-w-[80px] sm:max-w-[120px] truncate text-[11px] font-mono text-sky-300">
                {scratchAudioName}
              </span>
              <button
                onClick={handleRemoveScratchAudio}
                className="p-0.5 hover:text-red-400 text-zinc-400 transition-colors ml-1"
                title="Remove Scratch Audio"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => audioFileInputRef.current?.click()}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300'
                  : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-700'
              }`}
              title="Upload scratch audio / temp voice track (MP3, WAV)"
            >
              <Music className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Add Scratch Audio</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Proportional Timing Timeline (The Heart of Animatic Mode!) */}
      <div
        className={`p-3 sm:p-4 border-t shrink-0 flex flex-col gap-2.5 ${
          isDark ? 'bg-[#121216] border-zinc-800' : 'bg-[#F4F1EA] border-zinc-300'
        }`}
      >
        {/* Timeline Header & Live Timing Adjuster for Selected Frame */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider font-mono opacity-80">
              Timing Track
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                isDark ? 'bg-zinc-800 text-sky-400' : 'bg-white border border-zinc-300 text-zinc-800'
              }`}
            >
              Selected Board {currentFrameIndex + 1}: {activeTiming?.durationSec.toFixed(2)}s (
              {activeTiming?.frameCount24} frames)
            </span>
          </div>

          {/* Quick In-Timeline Timing Adjuster Buttons */}
          {activeFrame && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono opacity-70 hidden sm:inline">Adjust Duration:</span>
              <button
                onClick={() => handleAdjustActiveDuration(-1.0)}
                className={`px-2 py-1 text-xs font-mono font-semibold rounded border transition-colors ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700' : 'bg-white hover:bg-zinc-100 border-zinc-300'
                }`}
                title="Decrease duration by 1.0 second"
              >
                -1.0s
              </button>
              <button
                onClick={() => handleAdjustActiveDuration(-0.25)}
                className={`px-2 py-1 text-xs font-mono font-semibold rounded border transition-colors ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700' : 'bg-white hover:bg-zinc-100 border-zinc-300'
                }`}
                title="Decrease duration by 0.25 second (6 frames)"
              >
                -0.25s
              </button>

              {/* Exact duration input */}
              <div className="flex items-center gap-1 px-2 py-0.5 rounded border bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="60"
                  value={activeFrame.durationSec}
                  onChange={(e) => handleSetExactDuration(parseFloat(e.target.value) || 1)}
                  className="w-14 text-xs font-mono font-bold bg-transparent outline-none text-center"
                />
                <span className="text-[11px] font-mono opacity-60">sec</span>
              </div>

              <button
                onClick={() => handleAdjustActiveDuration(0.25)}
                className={`px-2 py-1 text-xs font-mono font-semibold rounded border transition-colors ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700' : 'bg-white hover:bg-zinc-100 border-zinc-300'
                }`}
                title="Increase duration by 0.25 second (6 frames)"
              >
                +0.25s
              </button>
              <button
                onClick={() => handleAdjustActiveDuration(1.0)}
                className={`px-2 py-1 text-xs font-mono font-semibold rounded border transition-colors ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700' : 'bg-white hover:bg-zinc-100 border-zinc-300'
                }`}
                title="Increase duration by 1.0 second"
              >
                +1.0s
              </button>
            </div>
          )}
        </div>

        {/* Global Scrub Bar */}
        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const pct = Math.max(0, Math.min(1, clickX / rect.width));
            setCurrentTimeSec(pct * timingData.totalDurationSec);
          }}
          className={`relative h-3 rounded-full cursor-pointer overflow-hidden border ${
            isDark ? 'bg-zinc-800/80 border-zinc-700' : 'bg-zinc-200 border-zinc-300'
          }`}
        >
          {/* Progress fill */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-sky-500 transition-all duration-75"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Cuts tick markers along scrub bar */}
          {timingData.timings.map((t, idx) => {
            const cutPct = totalDuration > 0 ? (t.startSec / totalDuration) * 100 : 0;
            return (
              <div
                key={`tick_${idx}`}
                className="absolute top-0 bottom-0 w-0.5 bg-black/40 z-10 pointer-events-none"
                style={{ left: `${cutPct}%` }}
              />
            );
          })}
        </div>

        {/* Proportional Frame Strip Track */}
        <div className="relative overflow-x-auto pb-1 pt-1 flex items-stretch gap-1.5 scrollbar-thin">
          {timingData.timings.map((timing, idx) => {
            const isActive = idx === currentFrameIndex;
            // Proportional width: each second = ~80px, minimum width 90px
            const proportionalWidth = Math.max(90, Math.round(timing.durationSec * 90));

            return (
              <div
                key={timing.id || `anim_frame_${idx}`}
                onClick={() => handleSelectTimingBlock(timing)}
                style={{ width: `${proportionalWidth}px` }}
                className={`shrink-0 flex flex-col justify-between p-1.5 rounded-lg border cursor-pointer transition-all ${
                  isActive
                    ? 'ring-2 ring-sky-500 shadow-md scale-[1.01] ' +
                      (isDark
                        ? 'bg-zinc-800 border-sky-400'
                        : 'bg-white border-sky-500')
                    : isDark
                    ? 'bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-400'
                    : 'bg-stone-50 hover:bg-white border-zinc-300 text-zinc-600'
                }`}
              >
                {/* Header: Scene/Panel & Duration */}
                <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                  <span className={`font-bold ${isActive ? 'text-sky-400' : ''}`}>
                    #{idx + 1} (P{timing.panelNumber})
                  </span>
                  <span
                    className={`px-1 rounded ${
                      isActive
                        ? 'bg-sky-500/20 text-sky-400 font-bold'
                        : 'opacity-75'
                    }`}
                  >
                    {timing.durationSec.toFixed(1)}s
                  </span>
                </div>

                {/* Thumbnail */}
                <div
                  className={`w-full aspect-16/9 rounded overflow-hidden flex items-center justify-center border relative ${
                    isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-stone-100 border-zinc-200'
                  }`}
                >
                  {timing.canvasData ? (
                    <img
                      src={timing.canvasData}
                      alt={`Panel ${timing.panelNumber}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-[9px] opacity-40 font-mono">Blank</span>
                  )}

                  {/* Acme peg dots preview */}
                  <div className="absolute top-0.5 inset-x-0 flex items-center justify-center gap-2 pointer-events-none opacity-40">
                    <div className="w-1.5 h-0.5 bg-zinc-500 rounded-xs" />
                    <div className="w-0.5 h-0.5 bg-zinc-500 rounded-full" />
                    <div className="w-1.5 h-0.5 bg-zinc-500 rounded-xs" />
                  </div>
                </div>

                {/* Dialogue or Action preview snippet */}
                <div className="mt-1 text-[9px] truncate">
                  {timing.dialogueNotes ? (
                    <span className="text-yellow-400 font-medium">“{timing.dialogueNotes}”</span>
                  ) : timing.actionNotes ? (
                    <span className="italic opacity-70">{timing.actionNotes}</span>
                  ) : (
                    <span className="opacity-40 font-mono">{timing.timecodeIn}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Animatic Video Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 flex flex-col gap-5 ${
              isDark ? 'bg-[#18181c] border-zinc-700 text-zinc-100' : 'bg-[#FAF8F5] border-zinc-300 text-zinc-900'
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
                {/* Progress bar */}
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
                      Duration: {formatTimeShort(timingData.totalDurationSec)} ({timingData.timings.length} boards)
                    </p>
                  </div>
                </div>

                {/* Video preview */}
                <video
                  src={renderedVideoUrl}
                  controls
                  className="w-full rounded-lg border border-zinc-700 aspect-16/9 bg-black"
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
                    className="px-4 py-1.5 text-xs font-bold rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 flex items-center gap-1.5 shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .webm Video</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Pre-Render Configuration */
              <div className="flex flex-col gap-4">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Renders the storyboard into a video reel, following the exact timing assigned to each
                  board.
                </p>

                {/* Resolution selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">Video Resolution</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setExportRes('1080p')}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-colors ${
                        exportRes === '1080p'
                          ? 'border-sky-500 bg-sky-500/10 text-sky-400 font-bold'
                          : isDark
                          ? 'border-zinc-700 bg-zinc-800/60'
                          : 'border-zinc-300 bg-white'
                      }`}
                    >
                      <span>Full HD 1080p</span>
                      <span className="text-[10px] font-mono opacity-60">1920 × 1080</span>
                    </button>
                    <button
                      onClick={() => setExportRes('720p')}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-colors ${
                        exportRes === '720p'
                          ? 'border-sky-500 bg-sky-500/10 text-sky-400 font-bold'
                          : isDark
                          ? 'border-zinc-700 bg-zinc-800/60'
                          : 'border-zinc-300 bg-white'
                      }`}
                    >
                      <span>Standard HD 720p</span>
                      <span className="text-[10px] font-mono opacity-60">1280 × 720</span>
                    </button>
                  </div>
                </div>

                {/* Overlays burn-in toggles */}
                <div className="flex flex-col gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <label className="text-xs font-semibold">Burn-in Elements</label>

                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span>Dialogue & Subtitles</span>
                    <input
                      type="checkbox"
                      checked={exportBurnSubs}
                      onChange={(e) => setExportBurnSubs(e.target.checked)}
                      className="rounded accent-sky-500"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span>Timecode & Scene/Panel HUD</span>
                    <input
                      type="checkbox"
                      checked={exportBurnTc}
                      onChange={(e) => setExportBurnTc(e.target.checked)}
                      className="rounded accent-sky-500"
                    />
                  </label>

                  <label className="flex items-center justify-between text-xs cursor-pointer">
                    <span>Acme Peg Registration Bar</span>
                    <input
                      type="checkbox"
                      checked={exportPegs}
                      onChange={(e) => setExportPegs(e.target.checked)}
                      className="rounded accent-sky-500"
                    />
                  </label>
                </div>

                {/* Scratch audio notice */}
                {scratchAudioUrl && (
                  <div className="p-2.5 rounded-lg bg-sky-950/30 border border-sky-800/40 text-xs text-sky-300 flex items-center gap-2">
                    <Music className="w-4 h-4 shrink-0 text-sky-400" />
                    <span>Included scratch audio: {scratchAudioName}</span>
                  </div>
                )}

                {/* Modal actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    onClick={() => setIsExportModalOpen(false)}
                    className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-zinc-700 hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleStartVideoRender}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 flex items-center gap-1.5 shadow-xs"
                  >
                    <Video className="w-4 h-4" />
                    <span>Render Video</span>
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

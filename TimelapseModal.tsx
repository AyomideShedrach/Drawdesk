import React, { useState, useRef, useEffect } from 'react';
import {
  Video,
  Play,
  Pause,
  Download,
  X,
  RotateCcw,
  Sparkles,
  Monitor,
  Camera,
  FastForward,
  Clock,
  Layers,
  Check,
} from 'lucide-react';
import {
  TimelapseCaptureMode,
  TimelapseResult,
} from '../utils/timelapseRecorder';

interface TimelapseModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: TimelapseResult | null;
  onStartRecording: (mode: TimelapseCaptureMode, speedMultiplier: number) => void;
  projectTitle: string;
  theme?: 'light' | 'dark';
}

export const TimelapseModal: React.FC<TimelapseModalProps> = ({
  isOpen,
  onClose,
  result,
  onStartRecording,
  projectTitle,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';

  // Config setup state (when starting a new recording)
  const [selectedMode, setSelectedMode] = useState<TimelapseCaptureMode>('studio-snapshots');
  const [selectedSpeed, setSelectedSpeed] = useState<number>(4);

  // Video playback state (when reviewing finished recording)
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    if (result && videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, [result]);

  if (!isOpen) return null;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.duration) {
        setDuration(videoRef.current.duration);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.videoUrl;
    const safeTitle = projectTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `timelapse_${safeTitle}_${Date.now()}.webm`;
    a.click();
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-2xl rounded-2xl shadow-2xl border transition-all overflow-hidden flex flex-col ${
          isDark
            ? 'bg-[#18181b] border-zinc-800 text-zinc-100'
            : 'bg-[#FDFBF7] border-zinc-300 text-zinc-900'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isDark ? 'border-zinc-800/80 bg-zinc-900/40' : 'border-zinc-200 bg-zinc-100/50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-xs ${
                result
                  ? isDark
                    ? 'bg-emerald-950/80 border-emerald-800/60 text-emerald-400'
                    : 'bg-emerald-100 border-emerald-200 text-emerald-700'
                  : isDark
                  ? 'bg-rose-950/80 border-rose-800/60 text-rose-400'
                  : 'bg-rose-100 border-rose-200 text-rose-600'
              }`}
            >
              {result ? <Sparkles className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            </div>
            <div>
              <h3 className={`font-bold text-sm tracking-tight ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                {result ? 'Timelapse Video Ready' : 'Start Timelapse Recording'}
              </h3>
              <p className={`text-[11px] font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {result
                  ? `Completed recording of "${projectTitle}"`
                  : 'Capture your complete drawing process showing the studio UI'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark
                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto max-h-[calc(85vh-130px)]">
          {result ? (
            /* REVIEW / PREVIEW VIDEO STATE */
            <div className="flex flex-col gap-4">
              {/* Video Player */}
              <div
                className={`relative aspect-[16/9] w-full rounded-xl overflow-hidden border shadow-inner flex items-center justify-center ${
                  isDark ? 'bg-black border-zinc-800' : 'bg-zinc-950 border-zinc-700'
                }`}
              >
                <video
                  ref={videoRef}
                  src={result.videoUrl}
                  className="w-full h-full object-contain cursor-pointer"
                  onClick={togglePlay}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleTimeUpdate}
                  onEnded={() => setIsPlaying(false)}
                  playsInline
                />

                {/* Big Center Play Overlay Button */}
                {!isPlaying && (
                  <button
                    onClick={togglePlay}
                    className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-white/90 hover:bg-white text-zinc-900 shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                  >
                    <Play className="w-6 h-6 ml-0.5 fill-current" />
                  </button>
                )}
              </div>

              {/* Video Timeline Scrub Bar */}
              <div className="flex flex-col gap-1.5">
                <input
                  type="range"
                  min="0"
                  max={duration || 1}
                  step="0.05"
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 accent-sky-500 rounded-lg cursor-pointer bg-zinc-300 dark:bg-zinc-800"
                />

                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={togglePlay}
                      className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200"
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    </button>
                    <span>
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  {/* Playback speed buttons */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] uppercase mr-0.5">Speed:</span>
                    {[0.5, 1, 2, 4, 8].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => handleSpeedChange(rate)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                          playbackRate === rate
                            ? isDark
                              ? 'bg-zinc-200 text-zinc-950 font-bold'
                              : 'bg-zinc-900 text-white font-bold'
                            : 'hover:bg-zinc-200 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Timelapse Details Metrics Card */}
              <div
                className={`grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl border text-xs ${
                  isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-100/70 border-zinc-200'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Real Session
                  </span>
                  <span className="font-bold font-mono mt-0.5 text-xs">
                    {formatTime(result.recordedDurationSec)}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase flex items-center gap-1">
                    <FastForward className="w-3 h-3" /> Video Length
                  </span>
                  <span className="font-bold font-mono mt-0.5 text-xs">
                    {formatTime(result.durationSec)} ({result.speedMultiplier}x)
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase flex items-center gap-1">
                    <Layers className="w-3 h-3" /> Snapshots
                  </span>
                  <span className="font-bold font-mono mt-0.5 text-xs">
                    {result.frameCount} frames
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase flex items-center gap-1">
                    <Camera className="w-3 h-3" /> Mode
                  </span>
                  <span className="font-bold font-mono mt-0.5 text-xs capitalize truncate">
                    {result.mode === 'screen' ? 'UI Window' : 'Studio Snap'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* CONFIG / START RECORDING STATE */
            <div className="flex flex-col gap-5">
              {/* Option 1: Select Capture Mode */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold tracking-tight text-zinc-700 dark:text-zinc-300">
                  1. Choose Interface Capture Mode
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Mode A: Studio Desk Snapshot Compositor (Recommended - No permissions needed) */}
                  <button
                    onClick={() => setSelectedMode('studio-snapshots')}
                    className={`flex flex-col text-left p-3.5 rounded-xl border transition-all relative ${
                      selectedMode === 'studio-snapshots'
                        ? isDark
                          ? 'border-sky-500 bg-sky-950/20 ring-1 ring-sky-500/50'
                          : 'border-sky-600 bg-sky-50/80 ring-1 ring-sky-600/40'
                        : isDark
                        ? 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/50'
                        : 'border-zinc-200 hover:border-zinc-300 bg-white'
                    }`}
                  >
                    <span className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      Recommended
                    </span>
                    <div className="flex items-center gap-2 mb-1.5 mt-1">
                      <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500">
                        <Camera className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs">Studio Interface Mode</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                      Auto-composites live storyboard canvas, pegs, header stamps, and active tools into smooth timelapse frames. <strong>Works everywhere, zero permissions needed!</strong>
                    </p>
                  </button>

                  {/* Mode B: Screen / App Window Capture (Requires browser permission) */}
                  <button
                    onClick={() => setSelectedMode('screen')}
                    className={`flex flex-col text-left p-3.5 rounded-xl border transition-all relative ${
                      selectedMode === 'screen'
                        ? isDark
                          ? 'border-sky-500 bg-sky-950/20 ring-1 ring-sky-500/50'
                          : 'border-sky-600 bg-sky-50/80 ring-1 ring-sky-600/40'
                        : isDark
                        ? 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/50'
                        : 'border-zinc-200 hover:border-zinc-300 bg-white'
                    }`}
                  >
                    {selectedMode === 'screen' && (
                      <span className="absolute top-3 right-3 w-4 h-4 rounded-full bg-sky-500 text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="p-1.5 rounded-lg bg-zinc-500/10 text-zinc-500">
                        <Monitor className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs">Live Screen Share</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                      Captures the complete live browser tab or screen window. Requires browser screen share permission (auto falls back if restricted).
                    </p>
                  </button>
                </div>
              </div>

              {/* Option 2: Select Speed Multiplier */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold tracking-tight text-zinc-700 dark:text-zinc-300">
                  2. Timelapse Speed Multiplier
                </span>

                <div className="grid grid-cols-5 gap-2">
                  {[
                    { mult: 1, label: '1x', sub: 'Realtime' },
                    { mult: 2, label: '2x', sub: 'Relaxed' },
                    { mult: 4, label: '4x', sub: 'Standard' },
                    { mult: 8, label: '8x', sub: 'Fast' },
                    { mult: 16, label: '16x', sub: 'Hyper' },
                  ].map((s) => (
                    <button
                      key={s.mult}
                      onClick={() => setSelectedSpeed(s.mult)}
                      className={`flex flex-col items-center py-2 px-1 rounded-xl border text-center transition-all ${
                        selectedSpeed === s.mult
                          ? isDark
                            ? 'bg-zinc-200 text-zinc-950 font-bold border-zinc-200 shadow-sm'
                            : 'bg-zinc-900 text-white font-bold border-zinc-900 shadow-sm'
                          : isDark
                          ? 'bg-zinc-900/50 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
                          : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-200'
                      }`}
                    >
                      <span className="text-xs font-mono">{s.label}</span>
                      <span className="text-[9px] opacity-75 mt-0.5">{s.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                  isDark ? 'bg-zinc-900/80 border-zinc-800 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-600'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                <span>
                  While recording, a red <strong>● REC</strong> indicator will stay docked in the top bar. Click it anytime to pause or export.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-t ${
            isDark ? 'border-zinc-800/80 bg-zinc-900/40' : 'border-zinc-200 bg-zinc-100/50'
          }`}
        >
          {result ? (
            <>
              <button
                onClick={() => {
                  onStartRecording(selectedMode, selectedSpeed);
                  onClose();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  isDark
                    ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300'
                    : 'border-zinc-300 hover:bg-zinc-200 text-zinc-700'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Record Another</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-600'
                  }`}
                >
                  Close
                </button>

                <button
                  onClick={handleDownload}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold shadow-md transition-all ${
                    isDark
                      ? 'bg-sky-500 hover:bg-sky-400 text-zinc-950 shadow-sky-500/20'
                      : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  <span>Download Timelapse (.webm)</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-zinc-200 text-zinc-600'
                }`}
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  onStartRecording(selectedMode, selectedSpeed);
                  onClose();
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/25 transition-all"
              >
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span>Start Recording</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

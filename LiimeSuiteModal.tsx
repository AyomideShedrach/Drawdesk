import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  X,
  Clock,
  Sparkles,
  Globe,
  RefreshCw,
  Layers,
  ArrowRight,
} from 'lucide-react';

export interface LiimeSuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'light' | 'dark';
}

export const LiimeSuiteModal: React.FC<LiimeSuiteModalProps> = ({
  isOpen,
  onClose,
  theme = 'light',
}) => {
  const [countdown, setCountdown] = useState(4);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const isDark = theme === 'dark';

  // 4-second unskippable countdown timer whenever the modal opens
  useEffect(() => {
    if (!isOpen) {
      setCountdown(4);
      return;
    }

    setCountdown(4);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Handle ESC key (only active after countdown reaches 0)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && countdown === 0) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, countdown, onClose]);

  if (!isOpen) return null;

  const isLocked = countdown > 0;
  const suiteUrl = 'https://liimesuite.pages.dev/';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="LIIME Suite Portal"
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-200"
    >
      {/* Backdrop */}
      <div
        onClick={() => {
          if (!isLocked) {
            onClose();
          }
        }}
        className={`absolute inset-0 backdrop-blur-md transition-colors ${
          isDark ? 'bg-black/85' : 'bg-black/65'
        }`}
      />

      {/* Pop-up Window Modal */}
      <div
        className={`relative z-10 w-full max-w-5xl h-[90vh] max-h-[820px] rounded-2xl border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ${
          isDark
            ? 'bg-[#18181b] border-zinc-750 text-zinc-100'
            : 'bg-[#EDEAE3] border-zinc-350 text-zinc-900'
        }`}
      >
        {/* Top Header Bar */}
        <div
          className={`flex items-center justify-between px-3.5 sm:px-5 py-2.5 sm:py-3 border-b shrink-0 transition-colors ${
            isDark ? 'bg-[#121214] border-zinc-800' : 'bg-[#E5E2DA] border-zinc-300'
          }`}
        >
          {/* Left: LIIME Suite Brand & Link Info */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Logo Badge */}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-sky-600 flex items-center justify-center text-white shadow-md font-bold text-xs">
              <Sparkles className="w-4 h-4" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight">LIIME SUITE</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                  Creative Hub
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                <Globe className="w-3 h-3 text-sky-500" />
                <span className="truncate max-w-[180px] sm:max-w-xs">{suiteUrl}</span>
              </div>
            </div>
          </div>

          {/* Right: Direct Link Button, Countdown Pill, & Close Button */}
          <div className="flex items-center gap-2">
            {/* Open in new tab link */}
            <a
              href={suiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isDark
                  ? 'bg-zinc-850 hover:bg-zinc-750 text-sky-400 border-zinc-750'
                  : 'bg-white hover:bg-zinc-100 text-sky-700 border-zinc-300'
              }`}
              title="Open LIIME Suite in new browser tab"
            >
              <span>Open in Tab</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {/* Unskippable 4s Countdown Badge or Skip / Close Button */}
            {isLocked ? (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-amber-300 text-xs font-mono font-bold shadow-xs select-none"
                title={`Unskippable for ${countdown} more seconds`}
              >
                <Clock className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                <span>Skip in {countdown}s</span>
              </div>
            ) : (
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-bold text-xs shadow-md transition-all cursor-pointer animate-in fade-in"
                title="Continue to DrawDesk"
              >
                <span>Continue to App</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Close (X) button */}
            <button
              onClick={() => {
                if (!isLocked) onClose();
              }}
              disabled={isLocked}
              title={isLocked ? `Locked for ${countdown}s` : 'Close window'}
              className={`p-1.5 rounded-lg border transition-all ${
                isLocked
                  ? 'opacity-30 cursor-not-allowed bg-zinc-800/40 border-transparent text-zinc-500'
                  : 'cursor-pointer hover:bg-rose-500/20 hover:text-rose-400 border-zinc-300 dark:border-zinc-750 text-zinc-400 hover:border-rose-500/40'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Unskippable Progress Bar (4 Seconds) */}
        {isLocked && (
          <div className="w-full h-1 bg-zinc-800/60 overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-sky-400 transition-all ease-linear"
              style={{
                width: `${((4 - countdown) / 4) * 100}%`,
                transitionDuration: '1000ms',
              }}
            />
          </div>
        )}

        {/* Live Iframe Viewport */}
        <div className="relative flex-1 w-full h-full bg-white dark:bg-[#0f0f12] overflow-hidden">
          {/* Iframe Loading Spinner */}
          {!iframeLoaded && !iframeError && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[#F4F1EA] dark:bg-[#121214] text-zinc-600 dark:text-zinc-400">
              <RefreshCw className="w-6 h-6 animate-spin text-sky-500" />
              <span className="text-xs font-mono font-medium">Loading LIIME Suite...</span>
            </div>
          )}

          {/* Iframe fallback if offline */}
          {iframeError ? (
            <div className="flex-1 h-full flex flex-col items-center justify-center p-6 text-center gap-3">
              <div className="p-3 rounded-full bg-sky-500/15 text-sky-500">
                <Globe className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold">LIIME Suite</h4>
              <p className="text-xs max-w-md text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Explore the creative ecosystem including 2DXYZ, DrawDesk traditional animation desk, and AnimiToRef.
              </p>
              <a
                href={suiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold text-xs transition-colors shadow-sm"
              >
                <span>Visit {suiteUrl}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <iframe
              src={suiteUrl}
              onLoad={() => setIframeLoaded(true)}
              onError={() => setIframeError(true)}
              className="w-full h-full border-0 select-auto"
              title="LIIME Suite Portal"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          )}
        </div>

        {/* Modal Bottom Status Bar */}
        <div
          className={`flex items-center justify-between px-4 py-2 border-t text-[11px] font-mono shrink-0 transition-colors ${
            isDark ? 'bg-[#121214] border-zinc-800 text-zinc-400' : 'bg-[#E5E2DA] border-zinc-300 text-zinc-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">LIIME Suite 1.0 • 2DXYZ, DrawDesk & AnimiToRef</span>
            <span className="sm:hidden">LIIME Suite</span>
          </div>

          <div className="flex items-center gap-3">
            {isLocked ? (
              <span className="text-amber-500 dark:text-amber-400 font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Unskippable ({countdown}s)</span>
              </span>
            ) : (
              <button
                onClick={onClose}
                className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
              >
                Skip & Return to DrawDesk →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

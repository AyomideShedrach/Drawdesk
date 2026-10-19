import React, { useState, useEffect } from 'react';
import { DrawDeskLogo } from './DrawDeskLogo';

interface LoadingScreenProps {
  onComplete?: () => void;
  theme?: 'light' | 'dark';
  minDurationMs?: number;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  onComplete,
  theme = 'light',
  minDurationMs = 1500,
}) => {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const isDark = theme === 'dark';

  useEffect(() => {
    const startTime = performance.now();
    let animationFrameId: number;

    const updateProgress = () => {
      const elapsed = performance.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / minDurationMs) * 100));
      setProgress(pct);

      if (elapsed < minDurationMs) {
        animationFrameId = requestAnimationFrame(updateProgress);
      } else {
        // Trigger fade out
        setIsFadingOut(true);
        const timeout = setTimeout(() => {
          onComplete?.();
        }, 450);
        return () => clearTimeout(timeout);
      }
    };

    animationFrameId = requestAnimationFrame(updateProgress);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [minDurationMs, onComplete]);

  return (
    <div
      role="status"
      aria-label="Loading DrawDesk"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center select-none transition-opacity duration-500 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      } ${
        isDark ? 'bg-[#0f0f12] text-zinc-100' : 'bg-[#F4F1EA] text-zinc-900'
      }`}
    >
      {/* Background Studio Grid & Atmosphere */}
      <div
        className={`absolute inset-0 pointer-events-none opacity-40 ${
          isDark
            ? 'radial-gradient-dark'
            : 'radial-gradient-light'
        }`}
        style={{
          backgroundImage: isDark
            ? 'radial-gradient(circle at center, rgba(56, 189, 248, 0.08) 0%, transparent 70%)'
            : 'radial-gradient(circle at center, rgba(217, 119, 6, 0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center max-w-md px-6 text-center">
        {/* DrawDesk Official Logo: 64x64, no background */}
        <div className="mb-6 shrink-0 flex items-center justify-center">
          <DrawDeskLogo className="w-16 h-16" size={64} />
        </div>

        {/* Acme 3-Peg Registration Bar Icon */}
        <div
          className={`flex items-center gap-3 px-5 py-2.5 rounded-full border mb-8 shadow-xs transition-colors ${
            isDark
              ? 'bg-zinc-900/90 border-zinc-800 text-zinc-400'
              : 'bg-white/80 border-stone-300/80 text-stone-600'
          }`}
        >
          {/* Left Acme Slot Pin */}
          <div className="w-5 h-2 rounded-xs bg-amber-600/80 dark:bg-amber-500/80 shadow-inner" />
          {/* Center Round Pin */}
          <div className="w-3.5 h-3.5 rounded-full bg-amber-600/80 dark:bg-amber-500/80 shadow-inner" />
          {/* Right Acme Slot Pin */}
          <div className="w-5 h-2 rounded-xs bg-amber-600/80 dark:bg-amber-500/80 shadow-inner" />
        </div>

        {/* Brand / App Title */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`text-xs font-mono uppercase tracking-[0.25em] font-semibold ${
              isDark ? 'text-sky-400' : 'text-amber-800 dark:text-amber-600'
            }`}
          >
            DrawDesk
          </span>
        </div>

        {/* Requested Headline: "The best storyboarding tool" */}
        <h1
          className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-sans mb-3 ${
            isDark ? 'text-zinc-100' : 'text-stone-900'
          }`}
        >
          The best storyboarding tool
        </h1>

        <p
          className={`text-xs sm:text-sm font-normal max-w-xs mb-8 leading-relaxed ${
            isDark ? 'text-zinc-400' : 'text-stone-600'
          }`}
        >
          Traditional 12-field animation desk with Acme peg alignment, onion skinning & batch rendering.
        </p>

        {/* Progress Bar & Status */}
        <div className="w-56 flex flex-col gap-2">
          <div
            className={`w-full h-1.5 rounded-full overflow-hidden ${
              isDark ? 'bg-zinc-800' : 'bg-stone-300/80'
            }`}
          >
            <div
              className={`h-full rounded-full transition-all duration-100 ease-out ${
                isDark ? 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]' : 'bg-amber-600'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className={isDark ? 'text-zinc-500' : 'text-stone-500'}>
              {progress < 40
                ? 'Mounting animation desk...'
                : progress < 80
                ? 'Aligning Acme peg holes...'
                : 'Ready for production'}
            </span>
            <span className={`font-semibold ${isDark ? 'text-zinc-400' : 'text-stone-700'}`}>
              {progress}%
            </span>
          </div>
        </div>
      </div>

      {/* Studio Desk Watermark Footnote */}
      <div
        className={`absolute bottom-6 text-[10px] font-mono tracking-wider uppercase ${
          isDark ? 'text-zinc-600' : 'text-stone-400'
        }`}
      >
        Standard 12-Field System • Production Edition
      </div>
    </div>
  );
};

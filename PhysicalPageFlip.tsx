import React, { useState, useEffect, useRef } from 'react';
import { Frame } from '../types/storyboard';
import { playPaperFlipSound } from '../utils/audio';

interface PhysicalPageFlipProps {
  currentFrame: Frame;
  nextFrame: Frame | null;
  prevFrame: Frame | null;
  direction: 'forward' | 'backward' | null;
  isFlipping: boolean;
  onFlipComplete: () => void;
  children: React.ReactNode;
  soundEnabled: boolean;
  pegPosition: 'top' | 'bottom';
  onFlipForward: () => void;
  onFlipBackward: () => void;
  theme: 'light' | 'dark';
}

export const PhysicalPageFlip: React.FC<PhysicalPageFlipProps> = ({
  currentFrame,
  nextFrame,
  prevFrame,
  direction,
  isFlipping,
  onFlipComplete,
  children,
  soundEnabled,
  pegPosition,
  onFlipForward,
  onFlipBackward,
  theme,
}) => {
  const isDark = theme === 'dark';
  // Manual drag curl state (allows animator to peel the page up and down interactively)
  const [dragCurlPercent, setDragCurlPercent] = useState<number>(0);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);

  // Play sound when flip starts
  useEffect(() => {
    if (isFlipping && direction) {
      if (soundEnabled) {
        playPaperFlipSound(direction);
      }
      const timer = setTimeout(() => {
        onFlipComplete();
      }, 420); // Duration matches CSS flip animation
      return () => clearTimeout(timer);
    }
  }, [isFlipping, direction, onFlipComplete, soundEnabled]);

  // Interactive bottom-edge drag to peel page
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaY = startYRef.current - e.clientY;
    // Moving up peels page
    const percent = Math.min(100, Math.max(0, (deltaY / 260) * 100));
    setDragCurlPercent(percent);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (dragCurlPercent > 45 && nextFrame) {
      // Completed the flip to back!
      setDragCurlPercent(0);
      onFlipForward();
    } else {
      // Snap back down
      setDragCurlPercent(0);
    }
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto" style={{ perspective: '1600px' }}>
      {/* Background Page Stack (Revealed beneath when front page flips) */}
      <div
        className={`absolute inset-0 rounded-md shadow-md border pointer-events-none transform translate-y-1 translate-x-0.5 scale-[0.995] transition-colors ${
          isDark
            ? 'bg-[#18181b] border-zinc-800'
            : 'bg-[#EAE6DD] border-zinc-300/90'
        }`}
        style={{
          boxShadow: isDark
            ? '0 4px 16px -2px rgba(0,0,0,0.5)'
            : '0 4px 16px -2px rgba(0,0,0,0.1), 0 2px 6px -1px rgba(0,0,0,0.06)',
        }}
      >
        {/* Next page preview outline if flipping forward */}
        {nextFrame && (
          <div className="w-full h-full p-6 opacity-35 flex flex-col justify-between">
            <div
              className={`flex justify-between text-xs font-mono font-semibold ${
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              }`}
            >
              <span>SCENE {nextFrame.sceneNumber}</span>
              <span>PANEL {nextFrame.panelNumber}</span>
            </div>
            <div
              className={`w-full aspect-[16/9] border border-dashed rounded flex items-center justify-center ${
                isDark ? 'border-zinc-700' : 'border-zinc-400'
              }`}
            >
              <span
                className={`text-xs font-mono font-medium ${
                  isDark ? 'text-zinc-500' : 'text-zinc-500'
                }`}
              >
                PAGE {nextFrame.panelNumber}
              </span>
            </div>
            <div
              className={`h-10 border-t ${
                isDark ? 'border-zinc-800' : 'border-zinc-300'
              }`}
            />
          </div>
        )}
      </div>

      {/* Second deeper stack paper edge */}
      <div
        className={`absolute inset-0 rounded-md shadow-xs border pointer-events-none transform translate-y-2 translate-x-1 scale-[0.99] -z-10 transition-colors ${
          isDark
            ? 'bg-[#141416] border-zinc-800'
            : 'bg-[#DFDBD1] border-zinc-300/80'
        }`}
      />

      {/* Active Flipping Paper Sheet */}
      <div
        className={`relative w-full transition-transform ease-in-out ${
          isFlipping && direction === 'forward'
            ? 'animate-flip-forward'
            : isFlipping && direction === 'backward'
            ? 'animate-flip-down'
            : ''
        }`}
        style={{
          transformOrigin: pegPosition === 'top' ? 'top center' : 'bottom center',
          transformStyle: 'preserve-3d',
          transform:
            dragCurlPercent > 0
              ? `rotateX(-${dragCurlPercent * 0.75}deg) translateY(-${dragCurlPercent * 0.8}px) translateZ(${
                  dragCurlPercent * 0.5
                }px)`
              : undefined,
          transition: dragCurlPercent > 0 ? 'none' : 'transform 0.38s cubic-bezier(0.2, 0.8, 0.25, 1), opacity 0.38s',
        }}
      >
        {/* The Front Face of Storyboard Sheet - Toned down warm ash drafting paper or dim studio dark */}
        <div
          className={`relative rounded-md border shadow-[0_8px_30px_-4px_rgba(0,0,0,0.12),0_2px_6px_rgba(0,0,0,0.06)] overflow-hidden transition-colors ${
            isDark
              ? 'bg-[#1E1E22] border-zinc-700/80'
              : 'bg-[#F4F0E8] border-zinc-300'
          }`}
          style={{
            backgroundImage: isDark
              ? `radial-gradient(#2d2d34 0.75px, transparent 0.75px), radial-gradient(#2d2d34 0.75px, #1E1E22 0.75px)`
              : `radial-gradient(#dedad0 0.75px, transparent 0.75px), radial-gradient(#dedad0 0.75px, #F4F0E8 0.75px)`,
            backgroundSize: '30px 30px',
            backgroundPosition: '0 0, 15px 15px',
          }}
        >
          {/* Paper Content: Sheet Header, Canvas, Storyboard Dialogue/Action Fields */}
          {children}

          {/* Dynamic Lighting & Shadow during page peel/curl */}
          {dragCurlPercent > 0 && (
            <div
              className="absolute inset-0 pointer-events-none transition-opacity"
              style={{
                background: `linear-gradient(to top, rgba(0,0,0,${
                  (dragCurlPercent / 100) * 0.25
                }) 0%, rgba(255,255,255,${(dragCurlPercent / 100) * 0.3}) 60%, transparent 100%)`,
              }}
            />
          )}

          {/* Bottom Flip / Peel Tab - Physical Sketchbook Affordance */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            title="Click or Drag Up to Flip Page to Back (Physical Page Flip)"
            className="group absolute bottom-0 right-0 w-24 h-14 cursor-grab active:cursor-grabbing flex items-end justify-end p-2 z-30 touch-none select-none"
          >
            {/* Paper Corner Curl Graphic */}
            <div className="relative w-8 h-8 flex items-end justify-end">
              <div
                className={`w-6 h-6 border-b-2 border-r-2 rounded-br-sm group-hover:w-7 group-hover:h-7 transition-all duration-150 flex items-center justify-center ${
                  isDark
                    ? 'border-zinc-600 bg-zinc-800/60'
                    : 'border-zinc-400 bg-zinc-200/50'
                }`}
              >
                <span
                  className={`text-[9px] font-mono font-bold transition-colors ${
                    isDark
                      ? 'text-zinc-400 group-hover:text-zinc-200'
                      : 'text-zinc-600 group-hover:text-zinc-950'
                  }`}
                >
                  FLIP
                </span>
              </div>
              {/* Corner fold triangle shadow */}
              <div
                className={`absolute bottom-0 right-0 w-4 h-4 bg-gradient-to-tl pointer-events-none ${
                  isDark ? 'from-black/40 to-transparent' : 'from-zinc-400/25 to-transparent'
                }`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

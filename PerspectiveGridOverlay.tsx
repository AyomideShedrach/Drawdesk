import React, { useRef, useState, useCallback } from 'react';
import { PerspectiveConfig } from '../types/storyboard';

interface PerspectiveGridOverlayProps {
  config: PerspectiveConfig;
  onChangeConfig: (newConfig: Partial<PerspectiveConfig>) => void;
  theme: 'light' | 'dark';
}

export const PerspectiveGridOverlay: React.FC<PerspectiveGridOverlayProps> = ({
  config,
  onChangeConfig,
  theme,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [activeDrag, setActiveDrag] = useState<
    'horizon' | 'vp1' | 'vp2' | 'vp3' | 'ground' | null
  >(null);

  const strokeColor =
    theme === 'dark' ? 'rgba(148, 163, 184, 0.45)' : 'rgba(71, 85, 105, 0.45)';
  const horizonColor =
    theme === 'dark' ? 'rgba(56, 189, 248, 0.85)' : 'rgba(2, 132, 199, 0.85)';
  const handleFill =
    theme === 'dark' ? '#0284c7' : '#0369a1';
  const handleBorder = theme === 'dark' ? '#ffffff' : '#ffffff';

  const getSvgCoordinates = useCallback((e: React.PointerEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = 960 / rect.width;
    const scaleY = 540 / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const handlePointerDown = (
    e: React.PointerEvent,
    type: 'horizon' | 'vp1' | 'vp2' | 'vp3' | 'ground'
  ) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setActiveDrag(type);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeDrag) return;
    const { x, y } = getSvgCoordinates(e);

    if (activeDrag === 'horizon') {
      const clampedY = Math.max(20, Math.min(520, y));
      onChangeConfig({
        horizonY: clampedY,
        vp1: { ...config.vp1, y: clampedY },
        vp2: { ...config.vp2, y: clampedY },
      });
    } else if (activeDrag === 'vp1') {
      if (config.mode === '1-point') {
        onChangeConfig({
          vp1: { x, y },
          horizonY: y,
        });
      } else {
        onChangeConfig({
          vp1: { x, y: config.horizonY },
        });
      }
    } else if (activeDrag === 'vp2') {
      onChangeConfig({
        vp2: { x, y: config.horizonY },
      });
    } else if (activeDrag === 'vp3') {
      onChangeConfig({
        vp3: { x, y },
      });
    } else if (activeDrag === 'ground') {
      onChangeConfig({
        groundPlane: {
          ...config.groundPlane,
          originX: x,
          originY: y,
        },
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeDrag) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setActiveDrag(null);
    }
  };

  if (config.mode === 'none') return null;

  const { horizonY, vp1, vp2, vp3, groundPlane, opacity, showHandles } = config;

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 960 540"
      className="absolute inset-0 w-full h-full pointer-events-none z-25 select-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{ opacity }}
    >
      <defs>
        <filter id="handleShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* 1. HORIZON LINE (for 1-pt, 2-pt, 3-pt, ground-grid) */}
      {config.mode !== 'isometric' && (
        <g>
          <line
            x1="-200"
            y1={horizonY}
            x2="1160"
            y2={horizonY}
            stroke={horizonColor}
            strokeWidth="1.75"
            strokeDasharray="6 3"
          />
          <text
            x="20"
            y={horizonY - 6}
            fill={horizonColor}
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
            letterSpacing="0.05em"
          >
            EYE LEVEL / HORIZON
          </text>
        </g>
      )}

      {/* 2. ONE-POINT PERSPECTIVE GRID */}
      {config.mode === '1-point' && (
        <g>
          {/* Radial convergence lines radiating from VP1 */}
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i * Math.PI * 2) / 24;
            const length = 1200;
            const x2 = vp1.x + Math.cos(angle) * length;
            const y2 = vp1.y + Math.sin(angle) * length;
            return (
              <line
                key={`1pt-rad-${i}`}
                x1={vp1.x}
                y1={vp1.y}
                x2={x2}
                y2={y2}
                stroke={strokeColor}
                strokeWidth="1"
              />
            );
          })}

          {/* Perspective floor distance rings / squares */}
          {[60, 130, 220, 340, 500].map((dist, idx) => (
            <rect
              key={`1pt-rect-${idx}`}
              x={vp1.x - dist * 1.77}
              y={vp1.y - dist}
              width={dist * 3.54}
              height={dist * 2}
              fill="none"
              stroke={strokeColor}
              strokeWidth="0.8"
              strokeDasharray="2 4"
            />
          ))}
        </g>
      )}

      {/* 3. TWO-POINT PERSPECTIVE GRID */}
      {config.mode === '2-point' && (
        <g>
          {/* Lines from Left VP1 */}
          {Array.from({ length: 20 }).map((_, i) => {
            const t = (i / 19) * 800 - 150;
            return (
              <line
                key={`2pt-l-${i}`}
                x1={vp1.x}
                y1={horizonY}
                x2={960 + 100}
                y2={t}
                stroke={strokeColor}
                strokeWidth="1"
              />
            );
          })}

          {/* Lines from Right VP2 */}
          {Array.from({ length: 20 }).map((_, i) => {
            const t = (i / 19) * 800 - 150;
            return (
              <line
                key={`2pt-r-${i}`}
                x1={vp2.x}
                y1={horizonY}
                x2={-100}
                y2={t}
                stroke={strokeColor}
                strokeWidth="1"
              />
            );
          })}

          {/* Vertical true lines */}
          {Array.from({ length: 9 }).map((_, i) => {
            const vx = 80 + i * 100;
            return (
              <line
                key={`2pt-v-${i}`}
                x1={vx}
                y1={0}
                x2={vx}
                y2={540}
                stroke={strokeColor}
                strokeWidth="0.75"
                strokeDasharray="3 3"
              />
            );
          })}
        </g>
      )}

      {/* 4. THREE-POINT PERSPECTIVE GRID */}
      {config.mode === '3-point' && (
        <g>
          {/* VP1 (Left) */}
          {Array.from({ length: 16 }).map((_, i) => {
            const t = (i / 15) * 800 - 150;
            return (
              <line
                key={`3pt-l-${i}`}
                x1={vp1.x}
                y1={horizonY}
                x2={960 + 100}
                y2={t}
                stroke={strokeColor}
                strokeWidth="0.9"
              />
            );
          })}

          {/* VP2 (Right) */}
          {Array.from({ length: 16 }).map((_, i) => {
            const t = (i / 15) * 800 - 150;
            return (
              <line
                key={`3pt-r-${i}`}
                x1={vp2.x}
                y1={horizonY}
                x2={-100}
                y2={t}
                stroke={strokeColor}
                strokeWidth="0.9"
              />
            );
          })}

          {/* VP3 (Vertical Zenith / Nadir) */}
          {Array.from({ length: 17 }).map((_, i) => {
            const tx = (i / 16) * 1160 - 100;
            return (
              <line
                key={`3pt-v3-${i}`}
                x1={vp3.x}
                y1={vp3.y}
                x2={tx}
                y2={vp3.y > horizonY ? -200 : 740}
                stroke={strokeColor}
                strokeWidth="1.1"
              />
            );
          })}
        </g>
      )}

      {/* 5. MOVABLE GROUND GRID (Receding floor grid) */}
      {config.mode === 'ground-grid' && (
        <g>
          {/* Vanishing convergence from ground anchor origin to horizon */}
          {Array.from({ length: 17 }).map((_, i) => {
            const bottomSpreadX = (i / 16) * 1360 - 200;
            return (
              <line
                key={`gr-rad-${i}`}
                x1={groundPlane.originX}
                y1={horizonY}
                x2={bottomSpreadX}
                y2={650}
                stroke={strokeColor}
                strokeWidth="1.1"
              />
            );
          })}

          {/* Receding horizontal ground rungs */}
          {[0.08, 0.18, 0.3, 0.44, 0.6, 0.78, 1.0].map((prog, idx) => {
            const curY = horizonY + (groundPlane.originY - horizonY) * prog;
            if (curY <= horizonY) return null;
            return (
              <line
                key={`gr-rung-${idx}`}
                x1={-150}
                y1={curY}
                x2={1110}
                y2={curY}
                stroke={strokeColor}
                strokeWidth={idx === 6 ? '1.8' : '1'}
              />
            );
          })}

          {/* Ground anchor base indicator line */}
          <line
            x1={groundPlane.originX - 60}
            y1={groundPlane.originY}
            x2={groundPlane.originX + 60}
            y2={groundPlane.originY}
            stroke={horizonColor}
            strokeWidth="2"
          />
        </g>
      )}

      {/* 6. ISOMETRIC DRAFTING GRID (30° / 60°) */}
      {config.mode === 'isometric' && (
        <g>
          {/* Vertical lines */}
          {Array.from({ length: 19 }).map((_, i) => {
            const x = i * 55;
            return (
              <line
                key={`iso-v-${i}`}
                x1={x}
                y1={0}
                x2={x}
                y2={540}
                stroke={strokeColor}
                strokeWidth="0.8"
              />
            );
          })}

          {/* 30° diagonals (slope = 0.577) */}
          {Array.from({ length: 30 }).map((_, i) => {
            const offset = (i - 10) * 55;
            return (
              <React.Fragment key={`iso-diag-${i}`}>
                {/* Right upward diagonal */}
                <line
                  x1={0}
                  y1={offset}
                  x2={960}
                  y2={offset + 960 * 0.577}
                  stroke={strokeColor}
                  strokeWidth="0.8"
                />
                {/* Left downward diagonal */}
                <line
                  x1={0}
                  y1={offset}
                  x2={960}
                  y2={offset - 960 * 0.577}
                  stroke={strokeColor}
                  strokeWidth="0.8"
                />
              </React.Fragment>
            );
          })}
        </g>
      )}

      {/* 7. INTERACTIVE MOVABLE HANDLES (pointer-events-auto) */}
      {showHandles && (
        <g className="pointer-events-auto">
          {/* Horizon Level Handle (Left edge) */}
          {config.mode !== 'isometric' && (
            <g
              transform={`translate(48, ${horizonY})`}
              className="cursor-ns-resize group"
              onPointerDown={(e) => handlePointerDown(e, 'horizon')}
            >
              <circle r="9" fill={handleFill} stroke={handleBorder} strokeWidth="2.5" filter="url(#handleShadow)" />
              <line x1="-4" y1="0" x2="4" y2="0" stroke="#fff" strokeWidth="1.5" />
              <line x1="0" y1="-4" x2="0" y2="4" stroke="#fff" strokeWidth="1.5" />
              <rect x="14" y="-10" width="80" height="20" rx="4" fill="#0f172a" fillOpacity="0.8" />
              <text x="18" y="4" fill="#fff" fontSize="9" fontFamily="monospace" fontWeight="bold">
                DRAG HORIZON
              </text>
            </g>
          )}

          {/* 1-Point Central Vanishing Point Handle */}
          {config.mode === '1-point' && (
            <g
              transform={`translate(${vp1.x}, ${vp1.y})`}
              className="cursor-move group"
              onPointerDown={(e) => handlePointerDown(e, 'vp1')}
            >
              <circle r="12" fill={handleFill} stroke={handleBorder} strokeWidth="3" filter="url(#handleShadow)" />
              <circle r="4" fill="#ffffff" />
              <rect x="-35" y="-28" width="70" height="18" rx="4" fill="#0f172a" fillOpacity="0.85" />
              <text x="0" y="-16" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="monospace" fontWeight="bold">
                1-PT VP
              </text>
            </g>
          )}

          {/* 2-Point and 3-Point Vanishing Point 1 (Left) */}
          {(config.mode === '2-point' || config.mode === '3-point') && (
            <g
              transform={`translate(${Math.max(16, Math.min(944, vp1.x))}, ${horizonY})`}
              className="cursor-ew-resize group"
              onPointerDown={(e) => handlePointerDown(e, 'vp1')}
            >
              <circle r="11" fill={handleFill} stroke={handleBorder} strokeWidth="2.5" filter="url(#handleShadow)" />
              <polygon points="-4,-4 4,0 -4,4" fill="#ffffff" />
              <rect x="-30" y="-26" width="60" height="18" rx="4" fill="#0f172a" fillOpacity="0.85" />
              <text x="0" y="-14" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="monospace" fontWeight="bold">
                VP 1 (L)
              </text>
            </g>
          )}

          {/* 2-Point and 3-Point Vanishing Point 2 (Right) */}
          {(config.mode === '2-point' || config.mode === '3-point') && (
            <g
              transform={`translate(${Math.max(16, Math.min(944, vp2.x))}, ${horizonY})`}
              className="cursor-ew-resize group"
              onPointerDown={(e) => handlePointerDown(e, 'vp2')}
            >
              <circle r="11" fill={handleFill} stroke={handleBorder} strokeWidth="2.5" filter="url(#handleShadow)" />
              <polygon points="4,-4 -4,0 4,4" fill="#ffffff" />
              <rect x="-30" y="-26" width="60" height="18" rx="4" fill="#0f172a" fillOpacity="0.85" />
              <text x="0" y="-14" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="monospace" fontWeight="bold">
                VP 2 (R)
              </text>
            </g>
          )}

          {/* 3-Point Vanishing Point 3 (Vertical Zenith / Nadir) */}
          {config.mode === '3-point' && (
            <g
              transform={`translate(${Math.max(20, Math.min(940, vp3.x))}, ${Math.max(20, Math.min(520, vp3.y))})`}
              className="cursor-move group"
              onPointerDown={(e) => handlePointerDown(e, 'vp3')}
            >
              <circle r="12" fill="#e11d48" stroke={handleBorder} strokeWidth="3" filter="url(#handleShadow)" />
              <circle r="4" fill="#ffffff" />
              <rect x="-32" y={vp3.y > horizonY ? 16 : -28} width="64" height="18" rx="4" fill="#0f172a" fillOpacity="0.85" />
              <text
                x="0"
                y={vp3.y > horizonY ? 28 : -16}
                textAnchor="middle"
                fill="#fff"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                VP 3 (VERT)
              </text>
            </g>
          )}

          {/* Ground Plane Origin Anchor Handle */}
          {config.mode === 'ground-grid' && (
            <g
              transform={`translate(${groundPlane.originX}, ${groundPlane.originY})`}
              className="cursor-move group"
              onPointerDown={(e) => handlePointerDown(e, 'ground')}
            >
              <rect
                x="-12"
                y="-12"
                width="24"
                height="24"
                rx="5"
                fill="#16a34a"
                stroke={handleBorder}
                strokeWidth="2.5"
                filter="url(#handleShadow)"
              />
              <circle r="4" fill="#ffffff" />
              <rect x="-42" y="16" width="84" height="18" rx="4" fill="#0f172a" fillOpacity="0.85" />
              <text x="0" y="28" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="monospace" fontWeight="bold">
                GROUND ANCHOR
              </text>
            </g>
          )}
        </g>
      )}
    </svg>
  );
};

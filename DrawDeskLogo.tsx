import React from 'react';

interface DrawDeskLogoProps {
  className?: string;
  size?: number | string;
  title?: string;
}

export const DrawDeskLogo: React.FC<DrawDeskLogoProps> = ({
  className = 'w-16 h-16',
  size = 64,
  title = 'DrawDesk',
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={`shrink-0 select-none ${className}`}
      fill="none"
      aria-label={title}
      role="img"
    >
      <title>{title}</title>

      {/* Stylized Vibrant Green 'D' Contour */}
      <path
        d="M 10,5.5
           C 17,7.2 24,9.2 30,9.2
           C 36,9.2 41,7.8 45,9.2
           C 49,10.6 54,14.5 54,20
           C 54,32 54,42 54,50
           C 54,55.5 49,58.8 44,59
           C 38,59.3 32,57 26,57
           C 20,57 15,58.5 10,59
           Z"
        fill="#13A030"
      />

      {/* Upper Counter Slot of 'D' */}
      <path
        d="M 29,18
           C 29,15 35,15 35,18
           L 35,26
           L 29,26
           Z"
        fill="#FFFFFF"
      />

      {/* Left Drafting Table Wing Accent */}
      <polygon points="17,24.5 10,30.5 12.5,32.5" fill="#FFFFFF" />

      {/* Main Drawing Table / Drafting Board Surface */}
      <polygon points="17,26 47,26 54,36.5 10,36.5" fill="#FFFFFF" />

      {/* Desk Legs & Lower Understructure */}
      {/* Outer Left Leg */}
      <rect x="15.5" y="36.5" width="2.5" height="11.5" fill="#FFFFFF" />

      {/* Inner Left Support Peg */}
      <rect x="23.5" y="36.5" width="1.6" height="3.5" fill="#FFFFFF" />

      {/* Center Lower Pillar (Continuation of 'D' counter, with contoured base) */}
      <path
        d="M 28.5,36.5
           L 34.5,36.5
           L 34.5,47.5
           C 34.5,50.5 32.5,51.8 28.5,51.8
           Z"
        fill="#FFFFFF"
      />

      {/* Inner Right Support Peg */}
      <rect x="39.5" y="36.5" width="1.6" height="3.5" fill="#FFFFFF" />

      {/* Outer Right Leg */}
      <rect x="46.5" y="36.5" width="2.5" height="11.5" fill="#FFFFFF" />
    </svg>
  );
};

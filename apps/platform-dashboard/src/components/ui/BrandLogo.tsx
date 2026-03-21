import React from 'react';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

const ICON_CONFIG = {
  sm: { size: 'w-6 h-6', radius: 'rounded-md' },
  md: { size: 'w-8 h-8', radius: 'rounded-lg' },
  lg: { size: 'w-24 h-24', radius: 'rounded-2xl' },
};

const TEXT_SIZE = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-2xl',
};

const BrandIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className={className}>
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#e8f5e9" />
        <stop offset="100%" stopColor="#c8e6c9" />
      </linearGradient>
      <filter id="shadowStr" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="3" dy="8" stdDeviation="6" floodColor="#001a12" floodOpacity="0.35" />
      </filter>
      <filter id="shadowMid" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="1" dy="4" stdDeviation="4" floodColor="#002a1c" floodOpacity="0.25" />
      </filter>
      <filter id="shadowLight" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="#002a1c" floodOpacity="0.2" />
      </filter>
      <clipPath id="innerCircleClip">
        <circle cx="196" cy="276" r="62" />
      </clipPath>
    </defs>
    <rect width="512" height="512" rx="110" ry="110" fill="url(#bg)" />
    <g filter="url(#shadowStr)">
      <path d="M 165 185 L 390 185 A 32 32 0 0 1 422 217 L 422 295 A 32 32 0 0 1 390 327 L 378 327 L 378 378 L 322 327 L 165 327 Z" fill="#83c658" stroke="#004b36" strokeWidth="26" strokeLinejoin="round" />
    </g>
    <g filter="url(#shadowLight)">
      <path d="M 148 108 L 226 130 L 148 152 Z" fill="#83c658" stroke="#83c658" strokeWidth="8" strokeLinejoin="round" />
    </g>
    <g filter="url(#shadowStr)">
      <circle cx="196" cy="276" r="88" fill="#004b36" />
      <rect x="138" y="90" width="22" height="142" rx="4" fill="#004b36" />
    </g>
    <g filter="url(#shadowMid)">
      <g clipPath="url(#innerCircleClip)">
        <circle cx="196" cy="276" r="62" fill="#e9ebd4" />
        <path d="M 130 292 Q 196 348 262 292 L 262 350 L 130 350 Z" fill="#83c658" />
      </g>
    </g>
  </svg>
);

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showName = true,
  className,
}) => {
  const icon = ICON_CONFIG[size];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <BrandIcon className={cn(icon.size, icon.radius)} />
      {showName && (
        <span
          className={cn('font-bold', TEXT_SIZE[size])}
          style={{ fontFamily: "'Outfit', 'Helvetica Neue', Arial, sans-serif" }}
        >
          <span className="text-white">Parkgolf</span>
          <span style={{ color: '#f5c842' }}>Mate</span>
        </span>
      )}
    </div>
  );
};

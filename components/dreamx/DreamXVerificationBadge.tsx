'use client';

import React from 'react';
import type { VerificationType } from '@/lib/dreamx/types';

export function VerifiedIcon({ className = 'h-[18px] w-[18px] shrink-0 inline-block' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 22 22"
      aria-label="Verified account"
      role="img"
      className={className}
      fill="currentColor"
    >
      <path d="M20.396 11a3.49 3.49 0 0 0-2.008-3.062 3.47 3.47 0 0 0-.742-3.584 3.47 3.47 0 0 0-3.584-.742A3.47 3.47 0 0 0 11 1.604a3.46 3.46 0 0 0-3.053 2.008 3.47 3.47 0 0 0-1.902-.14c-.635.13-1.22.436-1.69.882a3.46 3.46 0 0 0-.734 3.584A3.49 3.49 0 0 0 1.604 11a3.5 3.5 0 0 0 2.017 3.062 3.47 3.47 0 0 0 .733 3.584 3.49 3.49 0 0 0 3.584.742A3.49 3.49 0 0 0 11 20.396a3.48 3.48 0 0 0 3.062-2.007 3.335 3.335 0 0 0 4.326-4.327A3.49 3.49 0 0 0 20.396 11M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
    </svg>
  );
}

interface DreamXVerificationBadgeProps {
  type?: VerificationType | string | null;
  className?: string;
}

export function DreamXVerificationBadge({ type, className = 'h-[18px] w-[18px] shrink-0' }: DreamXVerificationBadgeProps) {
  if (!type || type === 'none') return null;

  switch (type) {
    case 'blue':
      return (
        <span title="Verified Account" className="inline-flex items-center align-middle">
          <VerifiedIcon className={`text-sky-500 ${className}`} />
        </span>
      );
    case 'gold':
      return (
        <span title="Verified Account" className="inline-flex items-center align-middle">
          <VerifiedIcon className={`text-amber-400 ${className}`} />
        </span>
      );
    case 'gray':
      return (
        <span title="Verified Account" className="inline-flex items-center align-middle">
          <VerifiedIcon className={`text-slate-400 ${className}`} />
        </span>
      );
    default:
      return null;
  }
}

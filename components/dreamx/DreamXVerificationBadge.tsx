'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { VerificationType } from '@/lib/dreamx/types';

interface DreamXVerificationBadgeProps {
  type?: VerificationType | string | null;
  className?: string;
}

export function DreamXVerificationBadge({ type, className = 'w-3.5 h-3.5' }: DreamXVerificationBadgeProps) {
  if (!type || type === 'none') return null;

  switch (type) {
    case 'blue':
      return (
        <span title="Verified Account (Notable/Public Figure)" className="inline-flex items-center align-middle">
          <CheckCircle2 className={`text-blue-400 fill-blue-500/20 flex-shrink-0 ${className}`} />
        </span>
      );
    case 'gray':
      return (
        <span title="Verified Account (Government/Institution)" className="inline-flex items-center align-middle">
          <CheckCircle2 className={`text-slate-400 fill-slate-500/20 flex-shrink-0 ${className}`} />
        </span>
      );
    case 'gold':
      return (
        <span title="Verified Account (Organization/Company)" className="inline-flex items-center align-middle">
          <CheckCircle2 className={`text-amber-400 fill-amber-500/20 flex-shrink-0 ${className}`} />
        </span>
      );
    default:
      return null;
  }
}

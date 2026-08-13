'use client';

import React from 'react';
import Link from 'next/link';

interface DreamXPostContentProps {
  content: string;
}

export function DreamXPostContent({ content }: DreamXPostContentProps) {
  if (!content) return null;

  // Split text by mention tokens while preserving separators
  // Regex matches @handle without trailing punctuation or email precursors
  const parts = content.split(/(?:^|(?<=[^a-zA-Z0-9_\.]))(@[a-zA-Z0-9_]+)/g);

  return (
    <span className="whitespace-pre-wrap break-words leading-relaxed text-sm">
      {parts.map((part, index) => {
        if (part.startsWith('@') && part.length > 1) {
          const cleanHandle = part.replace(/^@/, '');
          return (
            <Link
              key={index}
              href={`/dreamx/profile/${encodeURIComponent(cleanHandle)}`}
              onClick={(e) => e.stopPropagation()}
              className="text-blue-400 font-semibold hover:underline"
            >
              {part}
            </Link>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
}

import React from 'react';
import { DreamX } from '@/components/dreamx/DreamX';

export const metadata = {
  title: 'DreamX | Isolated Subsystem',
};

// Since api keys are usually passed down from the root layout or read from local storage in this app,
// we'll need a tiny client wrapper to read them from localStorage if they aren't provided by a global store.
// In the main app, `app/page.tsx` reads them. Let's create a client wrapper for page.tsx.
import { DreamXClientRoute } from './client-route';

export default function DreamXPage() {
  return (
    <div className="flex flex-col h-screen w-full bg-black">
      <DreamXClientRoute />
    </div>
  );
}

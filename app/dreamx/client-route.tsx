'use client';

import React, { useState, useEffect } from 'react';
import { DreamX } from '@/components/dreamx/DreamX';

export function DreamXClientRoute() {
  const [apiKeys, setApiKeys] = useState<any>({});
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setApiKeys({
      geminiKey: localStorage.getItem('dreamweaver_gemini_key') || '',
      groqKey: localStorage.getItem('dreamweaver_groq_key') || '',
      openrouterKey: localStorage.getItem('dreamweaver_openrouter_key') || ''
    });
    
    // We could read selected model if we want, but letting DreamX manage it or defaulting is fine.
    // We'll stick to a default for DreamX to keep it isolated from DreamWeaver's specific active provider unless needed.
    
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <DreamX apiKeys={apiKeys} selectedModel={selectedModel} />;
}

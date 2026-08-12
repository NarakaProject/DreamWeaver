'use client';

import React from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { AssetType } from '@/lib/gemini/image-prompt';
import { GenerateImageModal } from './GenerateImageModal';

interface ImagePickerWithPreviewProps {
  label?: string;
  value: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
  assetType?: AssetType;
  promptHint?: string;
  contextHint?: string;
}

export function ImagePickerWithPreview({
  label,
  value,
  onChange,
  placeholder = 'https://... or /uploads/image.png',
  assetType = 'general',
  promptHint = '',
  contextHint = '',
}: ImagePickerWithPreviewProps) {
  const [uploading, setUploading] = React.useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [imgError, setImgError] = React.useState(false);
  const [uploadError, setUploadError] = React.useState('');

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setImgError(false);
    setUploadError('');
  }, [value]);

  // Handle Local File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      onChange(data.url);
    } catch (err: any) {
      console.error('File Upload Error:', err);
      setUploadError(err.message || 'Failed to upload image file.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle FLUX AI Generation Submission
  const handleModalGenerate = async (promptText: string, stylePreset: string, aspectRatio: string) => {
    setIsGeneratingAI(true);
    setUploadError('');

    try {
      const res = await fetch('/api/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText.trim(),
          type: assetType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI image generation failed.');
      }

      onChange(data.imageUrl);
    } catch (err: any) {
      console.error('AI Image Generation Error:', err);
      setUploadError(err.message || 'Failed to generate AI image.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const initialPromptText = contextHint || promptHint || label || '';

  return (
    <div className="space-y-2 text-xs">
      {label && <label className="block font-semibold text-slate-300">{label}</label>}

      <div className="flex items-start gap-3">
        {/* Live Image Preview Box */}
        <div className="relative shrink-0 w-16 h-16 rounded-xl bg-[#090a0f] border border-[#262c3e] overflow-hidden flex items-center justify-center">
          {isGeneratingAI ? (
            <div className="flex flex-col items-center justify-center p-1 text-[9px] text-amber-400 text-center space-y-1">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span>FLUX Painting...</span>
            </div>
          ) : value && !imgError ? (
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : value && imgError ? (
            <div className="flex flex-col items-center justify-center p-1 text-[10px] text-rose-400 text-center">
              <AlertCircle className="w-4 h-4 mb-0.5" />
              <span>Broken Link</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-600">
              <ImageIcon className="w-5 h-5" />
              <span className="text-[9px] text-slate-500">No Image</span>
            </div>
          )}

          {value && !isGeneratingAI && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-0.5 top-0.5 p-0.5 rounded-full bg-black/70 text-slate-300 hover:text-white"
              title="Remove image"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Triple Controls: Text URL Input, Upload Button & ✨ Auto-Generate AI Image Button */}
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="flex-1 min-w-[140px] rounded-xl bg-[#090a0f] border border-[#262c3e] px-3 py-2 text-xs text-[#e2e8f0] focus:outline-none focus:border-amber-500"
            />

            {/* Native File Input Trigger */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/png, image/jpeg, image/webp, image/gif"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || isGeneratingAI}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#1c2233] border border-[#2a344d] hover:bg-[#252d45] text-amber-300 font-semibold text-xs transition-colors shrink-0 disabled:opacity-50"
              title="Upload image from computer"
            >
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>{uploading ? 'Uploading...' : 'Upload'}</span>
            </button>

            {/* ✨ Auto-Generate AI Image Button (Opens Custom Modal) */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              disabled={uploading || isGeneratingAI}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-purple-500/20 border border-purple-500/40 hover:bg-purple-500/30 text-purple-300 font-semibold text-xs transition-colors shrink-0 disabled:opacity-50"
              title="Generate asset with Hugging Face FLUX AI model"
            >
              {isGeneratingAI ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
              ) : (
                <Wand2 className="w-3.5 h-3.5 text-purple-400" />
              )}
              <span>{isGeneratingAI ? 'Painting...' : '✨ AI Image'}</span>
            </button>
          </div>

          {uploadError && <p className="text-[11px] text-rose-400 font-medium">{uploadError}</p>}
        </div>
      </div>

      {/* Custom In-App FLUX Image Generation Modal */}
      <GenerateImageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialPrompt={initialPromptText}
        assetType={assetType}
        onGenerate={handleModalGenerate}
        isGenerating={isGeneratingAI}
      />
    </div>
  );
}

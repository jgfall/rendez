'use client';

import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string | null) => void;
  folder?: 'tours' | 'blocks' | 'general';
  label?: string;
  hint?: string;
  className?: string;
  accept?: string;
  maxSizeMB?: number;
}

export function ImageUpload({
  value,
  onChange,
  folder = 'general',
  label = 'Image',
  hint,
  className,
  accept = 'image/jpeg,image/jpg,image/png,image/webp,image/gif',
  maxSizeMB = 5,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await response.json();
      onChange(data.url);
      setPreview(data.url);
    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
      setPreview(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    onChange(null);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value.trim();
    onChange(url || null);
    setPreview(url || null);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <label className="block text-sm font-medium text-sand-700">
        {label}
        {hint && <span className="text-xs text-sand-500 ml-2">({hint})</span>}
      </label>

      {/* Preview */}
      {preview && (
        <div className="relative w-full h-48 rounded-lg overflow-hidden border border-sand-200 bg-sand-50">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          {!uploading && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              aria-label="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-sand-900/50 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* Upload Button */}
      {!preview && (
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            icon={uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            className="flex-1"
          >
            {uploading ? 'Uploading...' : 'Upload Image'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* URL Input (Alternative) */}
      <div className="flex items-center gap-2 text-xs text-sand-500">
        <span>Or enter URL:</span>
        <input
          type="text"
          value={value || ''}
          onChange={handleUrlChange}
          placeholder="https://..."
          className="flex-1 px-2 py-1 border border-sand-200 rounded text-sand-700 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <X className="h-4 w-4" />
          {error}
        </p>
      )}

      {/* Hint */}
      {hint && !error && (
        <p className="text-xs text-sand-500">{hint}</p>
      )}
    </div>
  );
}


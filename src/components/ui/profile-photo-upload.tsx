'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, Loader2, Check } from 'lucide-react';
import Cropper, { Area } from 'react-easy-crop';
import { Button } from './button';
import { Modal } from './modal';
import { cn } from '@/lib/utils';

interface ProfilePhotoUploadProps {
  value?: string;
  onChange: (url: string | null) => void;
  label?: string;
  hint?: string;
  className?: string;
}

export function ProfilePhotoUpload({
  value,
  onChange,
  label = 'Profile Photo',
  hint,
  className,
}: ProfilePhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(value || null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync preview with value prop
  useEffect(() => {
    setPreview(value || null);
  }, [value]);

  const onCropComplete = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area
  ): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Set canvas size to match crop area
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Draw the cropped image
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    // Create a circular mask
    const circleCanvas = document.createElement('canvas');
    circleCanvas.width = pixelCrop.width;
    circleCanvas.height = pixelCrop.height;
    const circleCtx = circleCanvas.getContext('2d');

    if (!circleCtx) {
      throw new Error('Could not get circle canvas context');
    }

    // Draw white circle
    circleCtx.fillStyle = '#ffffff';
    circleCtx.beginPath();
    circleCtx.arc(
      pixelCrop.width / 2,
      pixelCrop.height / 2,
      Math.min(pixelCrop.width, pixelCrop.height) / 2,
      0,
      2 * Math.PI
    );
    circleCtx.fill();

    // Use destination-in to mask the image
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(circleCanvas, 0, 0);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/png',
        1.0
      );
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    // Read file and show crop modal
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageSrc(reader.result as string);
      setShowCropModal(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setShowCropModal(false);
    setUploading(true);
    setError(null);

    try {
      // Get cropped image as blob
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);

      // Upload cropped image
      const formData = new FormData();
      const file = new File([croppedBlob], 'profile-photo.png', {
        type: 'image/png',
      });
      formData.append('file', file);
      formData.append('folder', 'profiles');

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
      setImageSrc(null);
    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
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
    <>
      <div className={cn('space-y-3', className)}>
        <label className="block text-sm font-medium text-sand-700">
          {label}
          {hint && <span className="text-xs text-sand-500 ml-2">({hint})</span>}
        </label>

        {/* Circular Preview */}
        <div className="flex items-center gap-4">
          <div className="relative">
            {preview ? (
              <div className="relative group">
                <div 
                  className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-sand-200 bg-sand-50 cursor-pointer hover:border-primary-400 transition-colors"
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !uploading) {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                >
                  <img
                    src={preview}
                    alt="Profile preview"
                    className="w-full h-full object-cover"
                  />
                  {!uploading && (
                    <div className="absolute inset-0 bg-sand-900/0 group-hover:bg-sand-900/40 transition-colors flex items-center justify-center">
                    <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Replace
                    </span>
                  </div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-sand-900/50 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
                {!uploading && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove();
                    }}
                    className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg z-10"
                    aria-label="Remove photo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ) : (
              <div 
                className="h-24 w-24 rounded-full border-2 border-dashed border-sand-300 bg-sand-50 flex items-center justify-center cursor-pointer hover:border-sand-400 hover:bg-sand-100 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
              >
                <Upload className="h-6 w-6 text-sand-400" />
              </div>
            )}
          </div>

          <div className="flex-1">
            {!preview && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                icon={uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              >
                {uploading ? 'Uploading...' : 'Upload Photo'}
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <p className="text-xs text-sand-500 mt-2">
              PNG, JPG up to 5MB. Photo will be cropped to a circle.
            </p>
          </div>
        </div>

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

      {/* Crop Modal */}
      <Modal
        isOpen={showCropModal}
        onClose={() => {
          setShowCropModal(false);
          setImageSrc(null);
          setCroppedAreaPixels(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }}
        title="Crop Profile Photo"
        size="lg"
      >
        {imageSrc && (
          <div className="space-y-4">
            <div className="relative w-full h-96 bg-sand-900 rounded-lg overflow-hidden">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                style={{
                  containerStyle: {
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                  },
                }}
              />
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-sand-700 mb-2">
                  Zoom
                </label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCropModal(false);
                    setImageSrc(null);
                    setCroppedAreaPixels(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleCropComplete}
                  icon={<Check className="h-4 w-4" />}
                >
                  Apply Crop
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}


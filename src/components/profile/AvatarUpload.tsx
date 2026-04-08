import { useRef, useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Camera, Loader2, X, Check, ZoomIn } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface AvatarUploadProps {
  avatarUrl: string | null;
  fullName: string | null;
  onUpload: (file: File) => Promise<string | null>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** Crop the image to a square using canvas, return a File */
async function getCroppedFile(
  imageSrc: string,
  cropArea: Area,
  fileName: string,
): Promise<File> {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  const OUTPUT_SIZE = 512; // Always output 512x512 for consistent avatar size
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Canvas toBlob failed'));
        resolve(new File([blob], fileName, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.9,
    );
  });
}

export function AvatarUpload({
  avatarUrl,
  fullName,
  onUpload,
  size = 'lg',
  className,
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Crop state
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-20 w-20',
    lg: 'h-28 w-28',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    // Read file and open crop modal
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCropImageSrc(ev.target?.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedArea(null);
    };
    reader.readAsDataURL(file);

    // Reset input so picking the same file again triggers onChange
    e.target.value = '';
  };

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedAreaPixels);
  }, []);

  const handleCropCancel = () => {
    setCropImageSrc(null);
    setCroppedArea(null);
  };

  const handleCropSave = async () => {
    if (!cropImageSrc || !croppedArea) return;

    setIsUploading(true);
    try {
      const croppedFile = await getCroppedFile(
        cropImageSrc,
        croppedArea,
        `avatar-${Date.now()}.jpg`,
      );

      // Show preview immediately
      const blobUrl = URL.createObjectURL(croppedFile);
      setPreviewUrl(blobUrl);
      setCropImageSrc(null);

      const url = await onUpload(croppedFile);
      if (url) {
        URL.revokeObjectURL(blobUrl);
        setPreviewUrl(null); // Clear preview, use actual URL
      }
    } finally {
      setIsUploading(false);
    }
  };

  const displayUrl = previewUrl || avatarUrl;

  return (
    <>
      <div className={cn('relative inline-block', className)}>
        <button
          type="button"
          onClick={handleClick}
          disabled={isUploading}
          className="relative group focus:outline-none rounded-2xl"
        >
          <Avatar className={cn(sizeClasses[size], 'shadow-lg rounded-2xl')}>
            <AvatarImage src={displayUrl || undefined} alt={fullName || 'Profile'} className="rounded-2xl object-cover" />
            <AvatarFallback className="text-xl font-semibold bg-primary text-primary-foreground rounded-2xl">
              {getInitials(fullName)}
            </AvatarFallback>
          </Avatar>

          {/* Overlay */}
          <div
            className={cn(
              'absolute inset-0 rounded-2xl flex items-center justify-center transition-all',
              'bg-black/0 group-hover:bg-black/40',
              isUploading && 'bg-black/40'
            )}
          >
            {isUploading ? (
              <Loader2 className={cn(iconSizes[size], 'text-white animate-spin')} />
            ) : (
              <Camera
                className={cn(
                  iconSizes[size],
                  'text-white opacity-0 group-hover:opacity-100 transition-opacity'
                )}
              />
            )}
          </div>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Camera badge */}
        <div
          className={cn(
            'absolute bottom-0 right-0 rounded-full bg-primary text-primary-foreground p-1.5 shadow-md',
            'flex items-center justify-center'
          )}
        >
          <Camera className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Crop Modal */}
      {cropImageSrc && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm safe-top">
            <button
              onClick={handleCropCancel}
              className="flex items-center gap-1.5 text-white/80 active:text-white/50 text-sm font-medium py-2 px-1"
            >
              <X className="w-5 h-5" />
              Cancel
            </button>
            <p className="text-white font-bold text-sm">Move and Scale</p>
            <button
              onClick={handleCropSave}
              className="flex items-center gap-1.5 text-[#F0EE3A] active:text-[#F0EE3A]/50 text-sm font-bold py-2 px-1"
            >
              <Check className="w-5 h-5" />
              Choose
            </button>
          </div>

          {/* Crop area */}
          <div className="relative flex-1">
            <Cropper
              image={cropImageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              style={{
                containerStyle: { background: '#000' },
                cropAreaStyle: {
                  border: '2px solid rgba(255,255,255,0.6)',
                },
              }}
            />
          </div>

          {/* Zoom slider */}
          <div className="flex items-center gap-3 px-8 py-5 bg-black/80 backdrop-blur-sm safe-bottom">
            <ZoomIn className="w-4 h-4 text-white/50 shrink-0" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-1 appearance-none bg-white/20 rounded-full outline-none
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md"
            />
          </div>
        </div>
      )}
    </>
  );
}

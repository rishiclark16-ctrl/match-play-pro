import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface AvatarUploadProps {
  avatarUrl: string | null;
  fullName: string | null;
  onUpload: (file: File) => Promise<string | null>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    setIsUploading(true);
    try {
      const url = await onUpload(file);
      if (url) {
        setPreviewUrl(null); // Clear preview, use actual URL
      }
    } finally {
      setIsUploading(false);
    }
  };

  const displayUrl = previewUrl || avatarUrl;

  return (
    <div className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isUploading}
        className="relative group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
      >
        <Avatar className={cn(sizeClasses[size], 'border-4 border-background shadow-lg')}>
          <AvatarImage src={displayUrl || undefined} alt={fullName || 'Profile'} />
          <AvatarFallback className="text-xl font-semibold bg-primary text-primary-foreground">
            {getInitials(fullName)}
          </AvatarFallback>
        </Avatar>

        {/* Overlay */}
        <div
          className={cn(
            'absolute inset-0 rounded-full flex items-center justify-center transition-all',
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
  );
}

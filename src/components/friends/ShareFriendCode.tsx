import { useState } from 'react';
import { Share2, MessageCircle, Mail, Copy, Check, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FriendCodeQR } from './FriendCodeQR';

interface ShareFriendCodeProps {
  friendCode: string;
  userName?: string | null;
}

export function ShareFriendCode({ friendCode, userName }: ShareFriendCodeProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const shareMessage = `Add me as a friend on the golf app! My friend code is: ${friendCode}

Or click here: ${window.location.origin}/friends?add=${friendCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(friendCode);
      setCopied(true);
      hapticLight();
      toast.success('Friend code copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Add me as a golf buddy!',
          text: shareMessage,
        });
        hapticSuccess();
      } catch (err) {
        // User cancelled or share failed
        if ((err as Error).name !== 'AbortError') {
          toast.error('Failed to share');
        }
      }
    } else {
      // Fallback to copy
      await handleCopy();
    }
  };

  const handleSMS = () => {
    const smsUrl = `sms:?body=${encodeURIComponent(shareMessage)}`;
    window.open(smsUrl, '_blank');
    hapticLight();
  };

  const handleEmail = () => {
    const subject = encodeURIComponent('Add me on the golf app!');
    const body = encodeURIComponent(shareMessage);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    hapticLight();
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={handleCopy}
        className="shrink-0 border-2"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>

      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 border-2"
          >
            <QrCode className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-center">Your QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            <FriendCodeQR friendCode={friendCode} />
            <div className="mt-4 text-center">
              <p className="text-2xl font-mono font-black tracking-[0.3em] text-primary">
                {friendCode}
              </p>
              {userName && (
                <p className="text-sm text-muted-foreground mt-1">{userName}</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Button
        variant="default"
        size="sm"
        onClick={handleNativeShare}
        className="shrink-0 font-bold gap-2"
      >
        <Share2 className="h-4 w-4" />
        Share
      </Button>

      <Button
        variant="outline"
        size="icon"
        onClick={handleSMS}
        className="shrink-0 border-2"
        title="Share via SMS"
      >
        <MessageCircle className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        size="icon"
        onClick={handleEmail}
        className="shrink-0 border-2"
        title="Share via Email"
      >
        <Mail className="h-4 w-4" />
      </Button>
    </div>
  );
}

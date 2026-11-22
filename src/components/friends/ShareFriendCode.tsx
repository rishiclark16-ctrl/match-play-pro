import { useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, MessageCircle, Mail, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { hapticLight, hapticSuccess } from '@/lib/haptics';

interface ShareFriendCodeProps {
  friendCode: string;
  userName?: string | null;
}

export function ShareFriendCode({ friendCode, userName }: ShareFriendCodeProps) {
  const [copied, setCopied] = useState(false);

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

  const iconBtn = 'h-12 w-12 shrink-0 rounded-[14px] bg-muted text-primary flex items-center justify-center';

  return (
    <div className="flex items-center gap-2">
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleNativeShare}
        className="h-12 flex-1 rounded-[14px] bg-primary text-primary-foreground text-[15px] font-bold inline-flex items-center justify-center gap-2"
      >
        <Share2 className="h-[18px] w-[18px]" />
        Share code
      </motion.button>
      <motion.button whileTap={{ scale: 0.92 }} onClick={handleCopy} className={iconBtn} aria-label="Copy friend code">
        {copied ? <Check className="h-[18px] w-[18px]" /> : <Copy className="h-[18px] w-[18px]" />}
      </motion.button>
      <motion.button whileTap={{ scale: 0.92 }} onClick={handleSMS} className={iconBtn} aria-label="Share via SMS" title="Share via SMS">
        <MessageCircle className="h-[18px] w-[18px]" />
      </motion.button>
      <motion.button whileTap={{ scale: 0.92 }} onClick={handleEmail} className={iconBtn} aria-label="Share via Email" title="Share via Email">
        <Mail className="h-[18px] w-[18px]" />
      </motion.button>
    </div>
  );
}

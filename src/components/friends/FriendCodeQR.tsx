import { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';

const QRCodeSVG = lazy(() => import('qrcode.react').then(m => ({ default: m.QRCodeSVG })));

interface FriendCodeQRProps {
  friendCode: string;
}

export function FriendCodeQR({ friendCode }: FriendCodeQRProps) {
  // Generate a deep link URL that can be scanned
  const addFriendUrl = `${window.location.origin}/friends?add=${friendCode}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-3"
    >
      <div className="p-3 bg-white rounded-xl border-2 border-border shadow-lg">
        <Suspense fallback={<div className="w-[140px] h-[140px] bg-muted rounded-lg animate-pulse" />}>
          <QRCodeSVG
            value={addFriendUrl}
            size={140}
            level="M"
            includeMargin={false}
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </Suspense>
      </div>
      <p className="text-xs text-muted-foreground text-center max-w-[160px]">
        Scan to add as friend instantly
      </p>
    </motion.div>
  );
}

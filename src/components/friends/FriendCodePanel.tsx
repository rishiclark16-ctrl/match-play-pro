import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, ChevronDown } from 'lucide-react';
import { hapticLight } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { ShareFriendCode } from './ShareFriendCode';
import { FriendCodeQR } from './FriendCodeQR';

interface FriendCodePanelProps {
  friendCode: string | null;
  userName?: string | null;
  open: boolean;
  onToggle: () => void;
}

/** Collapsible "Your friend code" row with share actions and QR. */
export function FriendCodePanel({ friendCode, userName, open, onToggle }: FriendCodePanelProps) {
  return (
    <div id="friend-code-panel" className="scroll-mt-4 rounded-[20px] border border-border bg-card overflow-hidden">
      <motion.button
        whileTap={{ scale: 0.99 }}
        onClick={() => { onToggle(); hapticLight(); }}
        aria-expanded={open}
        className="w-full min-h-[68px] flex items-center gap-3 px-3.5 py-3 text-left"
      >
        <span className="h-11 w-11 flex-shrink-0 rounded-[14px] bg-primary flex items-center justify-center">
          <QrCode className="h-5 w-5 text-gold" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-muted-foreground leading-tight">Your friend code</span>
          <span className="mt-0.5 block font-mono text-[18px] font-extrabold tracking-[0.2em] text-foreground">
            {friendCode || '------'}
          </span>
        </span>
        <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </motion.button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-3.5 pb-4 pt-4">
              <div className="mb-3 rounded-[16px] bg-muted py-4 text-center font-mono text-3xl font-black tracking-[0.25em] text-foreground">
                {friendCode || '------'}
              </div>
              {friendCode && <ShareFriendCode friendCode={friendCode} userName={userName} />}
              {friendCode && (
                <div className="mt-4 flex justify-center">
                  <FriendCodeQR friendCode={friendCode} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

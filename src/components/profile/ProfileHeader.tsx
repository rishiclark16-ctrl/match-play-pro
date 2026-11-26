import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, LogOut, Loader2, Copy, Check, Crown, ChevronRight } from 'lucide-react';
import { AvatarUpload } from './AvatarUpload';

interface ProfileHeaderProps {
  fullName: string | null;
  email: string | null | undefined;
  avatarUrl: string | null;
  onAvatarUpload: (file: File) => Promise<string | null>;
  handicap: number | null | undefined;
  friendsCount: number;
  homeCourseName: string | null;
  isPro: boolean;
  friendCode: string | null | undefined;
  copied: boolean;
  isSigningOut: boolean;
  onBack: () => void;
  onSignOut: () => void;
  onCopyFriendCode: () => void;
  onOpenFriends: () => void;
}

const spring = { type: 'spring' as const, stiffness: 300, damping: 28 };

/**
 * Profile page title bar + Forest hero card (Fairway Day signature component).
 * Presentation only: every action is a callback owned by Profile.tsx.
 */
export function ProfileHeader({
  fullName,
  email,
  avatarUrl,
  onAvatarUpload,
  handicap,
  friendsCount,
  homeCourseName,
  isPro,
  friendCode,
  copied,
  isSigningOut,
  onBack,
  onSignOut,
  onCopyFriendCode,
  onOpenFriends,
}: ProfileHeaderProps) {
  return (
    <div className="px-5 pt-safe-content">
      {/* Title bar */}
      <div className="flex items-center justify-between h-14 mb-2">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          aria-label="Back"
          className="w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </motion.button>
        <h1 className="text-[17px] font-bold text-foreground">Profile</h1>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onSignOut}
          disabled={isSigningOut}
          aria-label="Sign out"
          className="w-11 h-11 rounded-full bg-card border border-border flex items-center justify-center"
        >
          {isSigningOut
            ? <Loader2 className="w-[18px] h-[18px] animate-spin text-muted-foreground" />
            : <LogOut className="w-[18px] h-[18px] text-muted-foreground" />}
        </motion.button>
      </div>

      {/* Forest hero card */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="bg-primary rounded-[28px] p-5 text-white"
      >
        <div className="flex items-center gap-4">
          <AvatarUpload avatarUrl={avatarUrl} fullName={fullName} onUpload={onAvatarUpload} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[26px] font-extrabold tracking-[-0.02em] leading-tight truncate">
                {fullName || 'Add your name'}
              </p>
              {isPro && (
                <span className="flex-shrink-0 inline-flex items-center gap-1 bg-gold text-gold-foreground rounded-full px-2 py-0.5 text-[11px] font-bold">
                  <Crown className="w-3 h-3" /> Pro
                </span>
              )}
            </div>
            <p className="text-[13px] text-on-forest-muted truncate mt-0.5">{email}</p>
          </div>
        </div>

        {/* Sub-tiles: the handicap is the "hot" number, so it gets the one lime tile */}
        <div className="grid grid-cols-3 gap-2 mt-5">
          <div className="bg-gold text-gold-foreground rounded-[16px] px-3 py-2.5">
            <p className="text-[12px] font-semibold">Handicap</p>
            <p className="text-[24px] font-extrabold tracking-[-0.02em] leading-tight tabular-nums">
              {handicap ?? '—'}
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onOpenFriends}
            className="bg-white/10 rounded-[16px] px-3 py-2.5 text-left"
          >
            <p className="text-[12px] font-semibold text-on-forest-muted flex items-center justify-between">
              Friends <ChevronRight className="w-3.5 h-3.5" />
            </p>
            <p className="text-[24px] font-extrabold tracking-[-0.02em] leading-tight tabular-nums">{friendsCount}</p>
          </motion.button>
          <div className="bg-white/10 rounded-[16px] px-3 py-2.5 min-w-0">
            <p className="text-[12px] font-semibold text-on-forest-muted">Course</p>
            <p className="text-[14px] font-bold leading-tight mt-1.5 line-clamp-2 break-words">
              {homeCourseName || <span className="text-on-forest-muted font-semibold">Not set</span>}
            </p>
          </div>
        </div>

        {/* Friend code */}
        <div className="mt-2 flex items-center gap-2 bg-white/10 rounded-[16px] pl-4 pr-1.5 h-14">
          <span className="text-[12px] font-semibold text-on-forest-muted">Friend code</span>
          <span className="ml-auto font-extrabold text-[18px] tracking-[0.14em] tabular-nums">
            {friendCode || '------'}
          </span>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onCopyFriendCode}
            aria-label="Copy friend code"
            className="w-11 h-11 rounded-[14px] bg-white/10 flex items-center justify-center flex-shrink-0"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Check className="w-[18px] h-[18px] text-gold" />
                </motion.span>
              ) : (
                <motion.span key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Copy className="w-[18px] h-[18px] text-white" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.section>
    </div>
  );
}

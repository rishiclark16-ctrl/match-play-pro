import { motion } from 'framer-motion';
import { UserPlus, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { buildInviteText, shareInvite } from '@/lib/inviteFriends';
import { capture as trackEvent } from '@/lib/posthog';

interface Props {
  name: string | null | undefined;
  friendCode: string | null | undefined;
}

/** Home-screen row that shares an App Store link + the user's friend code. */
export function InviteFriendsRow({ name, friendCode }: Props) {
  const onInvite = async () => {
    hapticLight();
    const outcome = await shareInvite(buildInviteText(name, friendCode));
    trackEvent('invite_shared', { outcome, surface: 'home' });
    if (outcome === 'copied') {
      hapticSuccess();
      toast.success('Invite copied. Paste it in a text to your group.');
    } else if (outcome === 'failed') {
      toast.error("Couldn't open sharing. Try again.");
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onInvite}
      aria-label="Invite friends to MATCH"
      className="w-full mt-2 bg-white rounded-2xl px-[22px] py-[14px] flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.06)] touch-manipulation cursor-pointer select-none"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-[34px] h-[34px] bg-[#BEF264] rounded-[9px] flex items-center justify-center flex-shrink-0">
          <UserPlus className="w-[16px] h-[16px] text-[#0F1F17]" />
        </div>
        <div className="text-left">
          <p className="text-[14px] font-semibold text-foreground tracking-[-0.01em]">Invite your group</p>
          <p className="text-[11px] text-muted-foreground">Send the app and your friend code</p>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </motion.button>
  );
}

import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { buildInviteText, shareInvite } from '@/lib/inviteFriends';
import { capture as trackEvent } from '@/lib/posthog';
import { HomeActionRow } from './HomeActionRow';

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
    <HomeActionRow
      highlight
      onClick={onInvite}
      ariaLabel="Invite friends to MATCH"
      icon={<UserPlus className="h-[19px] w-[19px]" />}
      title="Invite your group"
      subtitle="Send the app and your friend code"
    />
  );
}

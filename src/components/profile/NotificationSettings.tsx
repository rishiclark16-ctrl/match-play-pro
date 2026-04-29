import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Capacitor } from '@capacitor/core';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import { shouldPromptForPush, requestPushPermission } from '@/lib/pushUtils';
import type { NotificationPreferences } from '@/hooks/useProfile';
import { Card, Row, SectionLabel } from './ProfileRowPrimitives';

const spring = { type: 'spring' as const, stiffness: 300, damping: 28 };

const NOTIFICATION_OPTIONS: { key: keyof NotificationPreferences; label: string; desc: string }[] = [
  // Rounds
  { key: 'roundInvites', label: 'Round Invites', desc: "When someone adds you to a round" },
  { key: 'friendStartedRound', label: 'Friend Playing', desc: 'When a friend starts a round you can watch' },
  { key: 'watch_party', label: 'Watch Party', desc: 'When friends tee off — join the chat' },
  { key: 'roundCompleted', label: 'Match Results', desc: 'When a friend finishes a round' },
  { key: 'scoreEnteredForYou', label: 'Score Posted', desc: 'When someone logs a score on your behalf' },
  // Money / betting
  { key: 'pressTriggered', label: 'Auto-Press', desc: 'When an auto-press fires in your round' },
  { key: 'pressedBack', label: 'Pressed!', desc: 'When an opponent presses you manually' },
  { key: 'youWonBig', label: 'Payday', desc: "When you're owed money after a round" },
  { key: 'youLostBig', label: "Tab's Due", desc: 'When you owe money after a round' },
  { key: 'tabSettled', label: 'Tab Settled', desc: 'When group debts are settled' },
  { key: 'tabAddedTo', label: 'Tab Added', desc: 'When a round is added to your group tab' },
  // Hype
  { key: 'holeInOne', label: 'Hole-in-One 🏆', desc: 'When anyone in your round aces a hole' },
  { key: 'eagleLogged', label: 'Eagle Spotted', desc: 'When anyone in your round logs an eagle' },
  // Social
  { key: 'friendRequestReceived', label: 'New Friend Requests', desc: 'When someone sends you a request' },
  { key: 'friendRequestAccepted', label: 'Friend Accepted', desc: 'When someone accepts your request' },
  { key: 'groupInvite', label: 'Group Invites', desc: 'When you\'re added to a golf group' },
  // Digest
  { key: 'weeklyRecap', label: 'Weekly Recap', desc: 'Monday morning summary of your week on the course' },
];

interface NotificationSettingsProps {
  pushPermission: 'granted' | 'denied' | 'prompt' | null;
  setPushPermission: (s: 'granted' | 'denied' | 'prompt' | null) => void;
  notifPrefs: NotificationPreferences;
  setNotifPrefs: (p: NotificationPreferences) => void;
  onUpdateProfile: (patch: { notification_preferences: NotificationPreferences }) => void;
}

/**
 * Notifications section of the Profile page. Native-only — renders nothing
 * on web. Owns the per-channel toggle row but defers to the parent for
 * persistent state (so it survives page navigation without an extra fetch).
 */
export function NotificationSettings({
  pushPermission,
  setPushPermission,
  notifPrefs,
  setNotifPrefs,
  onUpdateProfile,
}: NotificationSettingsProps) {
  if (!Capacitor.isNativePlatform()) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.18 }}>
      <SectionLabel>Notifications</SectionLabel>
      <Card className="mb-5">
        <Row className={pushPermission === 'granted' ? '' : undefined}>
          <div className="flex-1">
            <p className="text-[14px] font-medium text-foreground">Push Notifications</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {pushPermission === 'granted' ? 'Enabled' : pushPermission === 'denied' ? 'Blocked in Settings' : 'Not enabled'}
            </p>
          </div>
          {pushPermission === 'granted' ? (
            <span className="text-[11px] font-black text-[#22C55E] bg-[#F0FFF4] px-2.5 py-1 rounded-full">On</span>
          ) : pushPermission === 'denied' ? (
            <button
              onClick={() => {
                hapticLight();
                import('@capacitor/core').then(({ Capacitor: Cap }) => {
                  if (Cap.isNativePlatform()) import('@capacitor/app').then(({ App }) => { App.openUrl({ url: 'app-settings:' }); });
                });
              }}
              className="text-[12px] font-bold text-primary flex items-center gap-1"
            >
              Open Settings <ExternalLink className="w-3 h-3" />
            </button>
          ) : shouldPromptForPush() ? (
            <button
              onClick={async () => {
                hapticLight();
                const granted = await requestPushPermission();
                setPushPermission(granted ? 'granted' : 'denied');
                if (granted) hapticSuccess();
              }}
              className="text-[12px] font-black text-foreground bg-[#F0EE3A] px-3 py-1.5 rounded-xl"
            >
              Enable
            </button>
          ) : null}
        </Row>
        {pushPermission === 'granted' && (
          <>
            {NOTIFICATION_OPTIONS.map(({ key, label, desc }, i, arr) => (
              <Row key={key} last={i === arr.length - 1}>
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-foreground">{label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
                </div>
                <Switch
                  checked={notifPrefs[key]}
                  onCheckedChange={(checked) => {
                    hapticLight();
                    const updated = { ...notifPrefs, [key]: checked };
                    setNotifPrefs(updated);
                    onUpdateProfile({ notification_preferences: updated });
                  }}
                  className="data-[state=checked]:bg-foreground"
                />
              </Row>
            ))}
          </>
        )}
      </Card>
    </motion.div>
  );
}

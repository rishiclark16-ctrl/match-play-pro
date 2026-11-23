import { motion } from 'framer-motion';
import { Check, Crown, Loader2 } from 'lucide-react';
import { Card } from './ProfileRowPrimitives';

const FREE_PLAN_PERKS = [
  'Nassau & Wolf games',
  'Full stats & records',
  'Unlimited friends',
  'Settlement tracking',
  'House Game AI builder',
  'All prop bets',
];

interface ProfilePlanCardProps {
  isPro: boolean;
  /** e.g. "Pro Annual" — only used when isPro */
  planName: string;
  /** e.g. "Nov 2027" — only used when isPro */
  renewsOn: string | null;
  isRestoring: boolean;
  onUpgrade: () => void;
  onManage: () => void;
  onRestore: () => void;
}

/** Subscription card on the Profile page. Presentation only. */
export function ProfilePlanCard({ isPro, planName, renewsOn, isRestoring, onUpgrade, onManage, onRestore }: ProfilePlanCardProps) {
  if (isPro) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-[14px] bg-gold flex items-center justify-center flex-shrink-0">
            <Crown className="w-6 h-6 text-gold-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-muted-foreground">Current plan</p>
            <p className="text-[22px] font-extrabold tracking-[-0.02em] leading-tight text-foreground">{planName}</p>
          </div>
          {renewsOn && <span className="text-[12px] text-muted-foreground flex-shrink-0">Renews {renewsOn}</span>}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onManage}
            className="h-11 rounded-full bg-muted text-[14px] font-semibold text-foreground"
          >
            Manage
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onRestore}
            disabled={isRestoring}
            className="h-11 rounded-full bg-muted text-[14px] font-semibold text-foreground flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {isRestoring && <Loader2 className="w-4 h-4 animate-spin" />}
            Restore
          </motion.button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold text-muted-foreground">Current plan</p>
          <p className="text-[26px] font-extrabold tracking-[-0.02em] leading-tight text-foreground">Free</p>
        </div>
        <span className="inline-flex items-center gap-1 bg-gold text-gold-foreground rounded-full px-2.5 py-1 text-[12px] font-bold">
          <Crown className="w-3.5 h-3.5" /> Pro
        </span>
      </div>
      <p className="text-[14px] text-muted-foreground mt-1">Upgrade to unlock:</p>
      <ul className="flex flex-wrap gap-1.5 mt-3">
        {FREE_PLAN_PERKS.map((perk) => (
          <li key={perk} className="inline-flex items-center gap-1 h-8 pl-2 pr-3 rounded-full bg-muted">
            <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" strokeWidth={3} />
            <span className="text-[12px] font-semibold text-foreground whitespace-nowrap">{perk}</span>
          </li>
        ))}
      </ul>
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onUpgrade}
        className="mt-5 w-full h-[52px] rounded-[14px] bg-ink text-ink-foreground text-[16px] font-bold"
      >
        Upgrade to Pro
      </motion.button>
      <button
        onClick={onRestore}
        disabled={isRestoring}
        className="mt-1 w-full h-11 text-[14px] font-semibold text-muted-foreground flex items-center justify-center gap-1.5"
      >
        {isRestoring && <Loader2 className="w-4 h-4 animate-spin" />}
        Restore purchases
      </button>
    </Card>
  );
}

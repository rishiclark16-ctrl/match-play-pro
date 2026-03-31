/**
 * JunkBetSheet — lightweight 2-tap junk bet logger.
 * Shows the 5 core junk bets (greenie, sandie, barkie, oozle, chippy).
 * Context-aware: greenie only on par 3s; sandie/barkie/greenie show
 * only eligible players (scored par or better on this hole).
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics';
import { PlayerWithScores, HoleInfo } from '@/types/golf';
import { PropBet, PROP_BET_TEMPLATES, getPropBetLabel, getPropBetIcon } from '@/types/betting';

const JUNK_TYPES = ['greenie', 'sandie', 'barkie', 'oozle', 'chippy'] as const;
type JunkType = typeof JUNK_TYPES[number];

// Bets that require the player to have scored par or better
const PAR_OR_BETTER_BETS: JunkType[] = ['greenie', 'sandie', 'barkie'];

interface JunkBetSheetProps {
  isOpen: boolean;
  onClose: () => void;
  roundId: string;
  currentHole: number;
  holeInfo: HoleInfo[];
  players: PlayerWithScores[];
  existingBets: PropBet[];
  defaultStakes: number;
}

export function JunkBetSheet({
  isOpen,
  onClose,
  roundId,
  currentHole,
  holeInfo,
  players,
  existingBets,
  defaultStakes,
}: JunkBetSheetProps) {
  const [pending, setPending] = useState<JunkType | null>(null);
  const [saving, setSaving] = useState(false);

  const hole = holeInfo.find(h => h.number === currentHole);
  const par = hole?.par ?? 4;
  const isPar3 = par === 3;

  // Bets available on this hole
  const availableTypes = JUNK_TYPES.filter(t => {
    if (t === 'greenie') return isPar3;
    return true;
  });

  const junkTemplates = PROP_BET_TEMPLATES.filter(
    t => availableTypes.includes(t.type as JunkType)
  );

  const holeBets = existingBets.filter(
    b => b.holeNumber === currentHole && JUNK_TYPES.includes(b.type as JunkType)
  );

  // Players who scored par or better on the current hole
  const parOrBetterPlayers = players.filter(p => {
    const score = p.scores.find(s => s.holeNumber === currentHole);
    return score && score.strokes <= par;
  });

  // For context-dependent bets, restrict to eligible players
  function eligiblePlayers(type: JunkType): PlayerWithScores[] {
    if (PAR_OR_BETTER_BETS.includes(type)) return parOrBetterPlayers;
    return players;
  }

  function eligibilityNote(type: JunkType): string | null {
    if (type === 'greenie') return 'Hit green on par 3, then made par or better';
    if (type === 'sandie') return 'Up and down from a bunker (par or better)';
    if (type === 'barkie') return 'Hit a tree, still made par or better';
    return null;
  }

  const handleTypeSelect = (type: JunkType) => {
    hapticLight();
    const candidates = eligiblePlayers(type);
    if (candidates.length === 0) {
      toast.error(`No eligible players — ${eligibilityNote(type) ?? 'check scores'}`);
      return;
    }
    // If only one eligible player, auto-select them
    if (candidates.length === 1) {
      handleWinnerSelect(type, candidates[0].id);
    } else {
      setPending(type);
    }
  };

  const handleWinnerSelect = async (type: JunkType, winnerId: string) => {
    setSaving(true);
    hapticLight();
    try {
      const { error } = await supabase.from('prop_bets').insert({
        round_id: roundId,
        type,
        hole_number: currentHole,
        stakes: defaultStakes,
        winner_id: winnerId,
      });
      if (error) throw error;
      hapticSuccess();
      const winner = players.find(p => p.id === winnerId);
      toast.success(
        `${getPropBetLabel(type)} — ${winner?.name.split(' ')[0]} wins $${defaultStakes}!`,
        { icon: getPropBetIcon(type) }
      );
      setPending(null);
    } catch {
      hapticError();
      toast.error('Failed to save junk bet');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (betId: string) => {
    hapticLight();
    try {
      const { error } = await supabase.from('prop_bets').delete().eq('id', betId);
      if (error) throw error;
    } catch {
      toast.error('Failed to remove bet');
    }
  };

  const spring = { type: 'spring' as const, stiffness: 380, damping: 32 };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={spring}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#F8F8F6] rounded-t-3xl pb-safe"
          >
            {/* Drag handle */}
            <div className="w-10 h-1 rounded-full bg-muted mx-auto mt-3 mb-4" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-4">
              <div>
                <h2 className="text-[20px] font-black tracking-[-0.04em] text-foreground">Any Junk?</h2>
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  Hole {currentHole} · Par {par}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 pb-6 space-y-4 max-h-[65vh] overflow-y-auto">
              {/* Logged bets for this hole */}
              {holeBets.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Logged</p>
                  {holeBets.map(bet => {
                    const winner = players.find(p => p.id === bet.winnerId);
                    return (
                      <div key={bet.id} className="flex items-center justify-between bg-white rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getPropBetIcon(bet.type)}</span>
                          <div>
                            <p className="text-[13px] font-bold text-foreground">{getPropBetLabel(bet.type)}</p>
                            {winner && (
                              <p className="text-[11px] text-[#22C55E] font-bold">
                                {winner.name.split(' ')[0]} +${bet.stakes}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(bet.id)}
                          className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bet type selector / winner selector */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2">
                  {pending ? 'Who won it?' : 'What happened?'}
                </p>

                <AnimatePresence mode="wait">
                  {!pending ? (
                    <motion.div
                      key="types"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {/* Greenie (par 3 only) shown first if applicable */}
                      <div className={`grid gap-2 ${availableTypes.length <= 4 ? 'grid-cols-4' : 'grid-cols-5'}`}>
                        {junkTemplates.map(t => {
                          const candidates = eligiblePlayers(t.type as JunkType);
                          const ineligible = PAR_OR_BETTER_BETS.includes(t.type as JunkType) && candidates.length === 0;
                          return (
                            <motion.button
                              key={t.type}
                              whileTap={{ scale: ineligible ? 1 : 0.94 }}
                              onClick={() => handleTypeSelect(t.type as JunkType)}
                              className={`flex flex-col items-center gap-1 bg-white rounded-2xl p-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] ${ineligible ? 'opacity-35' : ''}`}
                            >
                              <span className="text-2xl">{t.icon}</span>
                              <span className="text-[10px] font-bold text-foreground text-center leading-tight">{t.label}</span>
                              {ineligible && (
                                <span className="text-[9px] text-muted-foreground/60">no par+</span>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>

                      {/* Context hint */}
                      {isPar3 && (
                        <p className="text-[11px] text-muted-foreground mt-2 text-center">
                          🟢 Greenie: on green + par or better
                        </p>
                      )}
                      {parOrBetterPlayers.length > 0 && (
                        <p className="text-[11px] text-muted-foreground mt-1 text-center">
                          {parOrBetterPlayers.map(p => p.name.split(' ')[0]).join(', ')} made par or better
                        </p>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="winners"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      {/* Eligibility note */}
                      {eligibilityNote(pending) && (
                        <p className="text-[12px] text-muted-foreground mb-2">{eligibilityNote(pending)}</p>
                      )}
                      <div className="flex items-center gap-2 mb-3">
                        <button
                          onClick={() => setPending(null)}
                          className="text-[12px] text-muted-foreground underline"
                        >
                          ← Back
                        </button>
                        <span className="text-[13px] font-bold text-foreground">
                          {getPropBetIcon(pending)} {getPropBetLabel(pending)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {eligiblePlayers(pending).map(player => (
                          <motion.button
                            key={player.id}
                            whileTap={{ scale: 0.97 }}
                            disabled={saving}
                            onClick={() => handleWinnerSelect(pending, player.id)}
                            className="bg-foreground text-background rounded-2xl py-3 font-bold text-[14px] disabled:opacity-50"
                          >
                            {saving ? '…' : player.name.split(' ')[0]}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* No junk button */}
              {!pending && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { hapticLight(); onClose(); }}
                  className="w-full text-[13px] font-bold text-muted-foreground py-3"
                >
                  No junk this hole
                </motion.button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

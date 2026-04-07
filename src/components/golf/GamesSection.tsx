import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Player } from '@/types/golf';
import { calculateSkins, StrokesPerHoleMap } from '@/lib/games/skins';
import { calculateNassau, canPress, createPress } from '@/lib/games/nassau';
import { calculateStableford } from '@/lib/games/stableford';
import { calculateBestBall } from '@/lib/games/bestball';
import { calculateWolf } from '@/lib/games/wolf';
import { calculateMatchPlay } from '@/lib/games/matchPlay';
import { calculateVegas } from '@/lib/games/vegas';
import { calculateNines } from '@/lib/games/nines';
import { calculateDefender } from '@/lib/games/defender';
import { calculateSixes } from '@/lib/games/sixes';
import { calculateHouseGame } from '@/lib/games/houseGame';
import { buildScoringConfig } from '@/lib/houseGame/engine';
import { buildConfig } from '@/engine/HouseGameEngine';
import { isCustomPrimitive } from '@/types/houseGame';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { GamesSectionProps, GameCard, LiveDot, Divider } from './games/shared';
import { NassauSectionWithScores } from './games/NassauSectionWithScores';
import { SkinsSection } from './games/SkinsSection';
import { MatchPlaySection } from './games/MatchPlaySection';
import { StablefordSection } from './games/StablefordSection';
import { BestBallSection } from './games/BestBallSection';
import { WolfSection } from './games/WolfSection';
import { StrokePlaySection } from './games/StrokePlaySection';
import { PropBetsSection } from './games/PropBetsSection';
import { HouseGameSection } from './games/HouseGameSection';
import { VegasSection } from './games/VegasSection';
import { NinesSection } from './games/NinesSection';
import { DefenderSection } from './games/DefenderSection';
import { SixesSection } from './games/SixesSection';

export function GamesSection({ round, players, scores, currentHole, onAddPress, propBets = [] }: GamesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [pressConfirmPlayer, setPressConfirmPlayer] = useState<Player | null>(null);

  // Build the strokesPerHole map for net scoring
  const buildStrokesMap = useMemo((): StrokesPerHoleMap | undefined => {
    const map = new Map<string, Map<number, number>>();
    for (const player of players) {
      if (player.strokesPerHole) {
        map.set(player.id, player.strokesPerHole);
      }
    }
    return map.size > 0 ? map : undefined;
  }, [players]);

  const skinsGame = round.games?.find(g => g.type === 'skins');
  const nassauGame = round.games?.find(g => g.type === 'nassau');
  const stablefordGame = round.games?.find(g => g.type === 'stableford');
  const bestBallGame = round.games?.find(g => g.type === 'bestball');
  const wolfGame = round.games?.find(g => g.type === 'wolf');
  const matchGame = round.games?.find(g => g.type === 'match');
  const vegasGame = round.games?.find(g => g.type === 'vegas');
  const ninesGame = round.games?.find(g => g.type === 'nines');
  const defenderGame = round.games?.find(g => g.type === 'defender');
  const sixesGame = round.games?.find(g => g.type === 'sixes');
  const houseGameEntry = round.games?.find(g => g.type === 'house');
  const hasMatchPlay = matchGame || round.matchPlay;

  // Calculate the highest hole with all players scored
  const holesPlayed = useMemo(() => {
    let maxHole = 0;
    for (let hole = 1; hole <= round.holes; hole++) {
      const holeScores = scores.filter(s => s.holeNumber === hole);
      if (holeScores.length === players.length) {
        maxHole = hole;
      } else {
        break;
      }
    }
    return maxHole;
  }, [scores, players.length, round.holes]);

  const skinsResult = useMemo(() => {
    if (!skinsGame || players.length < 2) return null;
    const useStrokesMap = skinsGame.useNet ? buildStrokesMap : undefined;
    return calculateSkins(scores, players, holesPlayed, skinsGame.stakes, skinsGame.carryover ?? true, useStrokesMap);
  }, [skinsGame, scores, players, holesPlayed, buildStrokesMap]);

  const nassauResult = useMemo(() => {
    if (!nassauGame || players.length !== 2) return null;
    const useStrokesMap = nassauGame.useNet ? buildStrokesMap : undefined;
    return calculateNassau(scores, players, nassauGame.stakes, round.presses || [], round.holes, useStrokesMap);
  }, [nassauGame, scores, players, round.presses, round.holes, buildStrokesMap]);

  const stablefordResult = useMemo(() => {
    if (!stablefordGame || players.length < 2) return null;
    const useStrokesMap = stablefordGame.useNet ? buildStrokesMap : undefined;
    return calculateStableford(scores, players, round.holeInfo, stablefordGame.modifiedStableford ?? false, useStrokesMap);
  }, [stablefordGame, scores, players, round.holeInfo, buildStrokesMap]);

  const bestBallResult = useMemo(() => {
    if (!bestBallGame?.teams || bestBallGame.teams.length < 2) return null;
    const useStrokesMap = bestBallGame.useNet ? buildStrokesMap : undefined;
    return calculateBestBall(scores, players, bestBallGame.teams, round.holeInfo, holesPlayed, useStrokesMap);
  }, [bestBallGame, scores, players, round.holeInfo, holesPlayed, buildStrokesMap]);

  const wolfResult = useMemo(() => {
    if (!wolfGame || (players.length !== 3 && players.length !== 4)) return null;
    return calculateWolf(scores, players, wolfGame.wolfResults || [], wolfGame.stakes, wolfGame.carryover ?? true, round.holes);
  }, [wolfGame, scores, players, round.holes]);

  const vegasResult = useMemo(() => {
    if (!vegasGame || players.length !== 4) return null;
    return calculateVegas(scores, players, round.holeInfo, vegasGame.stakes, vegasGame.carryover ?? false);
  }, [vegasGame, scores, players, round.holeInfo]);

  const ninesResult = useMemo(() => {
    if (!ninesGame || players.length !== 3) return null;
    const useStrokesMap = ninesGame.useNet ? buildStrokesMap : undefined;
    return calculateNines(scores, players, round.holeInfo, ninesGame.stakes, useStrokesMap);
  }, [ninesGame, scores, players, round.holeInfo, buildStrokesMap]);

  const defenderResult = useMemo(() => {
    if (!defenderGame || (players.length !== 3 && players.length !== 4)) return null;
    const useStrokesMap = defenderGame.useNet ? buildStrokesMap : undefined;
    return calculateDefender(scores, players, round.holeInfo, defenderGame.stakes, useStrokesMap);
  }, [defenderGame, scores, players, round.holeInfo, buildStrokesMap]);

  const sixesResult = useMemo(() => {
    if (!sixesGame || players.length !== 4) return null;
    const useStrokesMap = sixesGame.useNet ? buildStrokesMap : undefined;
    return calculateSixes(scores, players, round.holeInfo, sixesGame.stakes, useStrokesMap);
  }, [sixesGame, scores, players, round.holeInfo, buildStrokesMap]);

  const matchPlayResult = useMemo(() => {
    if (!hasMatchPlay || players.length !== 2) return null;
    return calculateMatchPlay(scores, players, round.holeInfo, buildStrokesMap, round.holes);
  }, [hasMatchPlay, scores, players, round.holeInfo, buildStrokesMap, round.holes]);

  const pressablePlayer = useMemo(() => {
    if (!nassauResult || players.length !== 2) return null;
    const [p1, p2] = players;
    const p1Standing = nassauResult.overall.margin * (nassauResult.overall.winnerId === p1.id ? 1 : -1);
    const p2Standing = nassauResult.overall.margin * (nassauResult.overall.winnerId === p2.id ? 1 : -1);
    if (canPress(currentHole, p1Standing, round.presses || [], round.holes)) return { player: p1, standing: p1Standing };
    if (canPress(currentHole, p2Standing, round.presses || [], round.holes)) return { player: p2, standing: p2Standing };
    return null;
  }, [nassauResult, players, currentHole, round.presses, round.holes]);

  const houseGameResult = useMemo(() => {
    if (!houseGameEntry?.activePrimitives?.length || players.length < 2) return null;
    try {
      const config = buildScoringConfig(houseGameEntry.activePrimitives);
      return calculateHouseGame(scores, players, round.holeInfo, config, round.slope ?? 113, round.holes as 9 | 18, houseGameEntry.bbbResults);
    } catch {
      return null;
    }
  }, [houseGameEntry, scores, players, round.holeInfo, round.slope, round.holes]);

  const autoPressThreshold: number | null = useMemo(() => {
    if (!houseGameEntry?.activePrimitives?.length) return null;
    const config = buildConfig(houseGameEntry.activePrimitives);
    if (config.pressRules.trigger === 'x_down' && config.pressRules.threshold) return config.pressRules.threshold;
    return null;
  }, [houseGameEntry]);

  const propBetsSummary = useMemo(() => {
    if (!propBets || propBets.length === 0) return null;
    const wonBets = propBets.filter(pb => pb.winnerId);
    if (wonBets.length === 0) return null;
    const playerStats = new Map<string, { count: number; earnings: number; types: string[] }>();
    wonBets.forEach(bet => {
      const stats = playerStats.get(bet.winnerId!) || { count: 0, earnings: 0, types: [] };
      stats.count++;
      stats.earnings += bet.stakes * (players.length - 1);
      stats.types.push(bet.type);
      playerStats.set(bet.winnerId!, stats);
    });
    return { totalBets: wonBets.length, playerStats };
  }, [propBets, players.length]);

  const hasPropBets = propBets.length > 0;
  const hasStrokePlay = round.strokePlay;

  if (!skinsGame && !nassauGame && !stablefordGame && !bestBallGame && !wolfGame && !vegasGame && !ninesGame && !defenderGame && !sixesGame && !hasMatchPlay && !hasPropBets && !hasStrokePlay && !houseGameEntry)
    return null;

  const handleConfirmPress = () => {
    if (pressConfirmPlayer && nassauGame) {
      const press = createPress(pressConfirmPlayer.id, currentHole, nassauGame.stakes);
      onAddPress(press);
      setPressConfirmPlayer(null);
    }
  };

  // Collect visible sections to know where to insert dividers
  const sections: React.ReactNode[] = [];

  if (houseGameEntry && houseGameResult) {
    sections.push(
      <HouseGameSection key="house" result={houseGameResult} players={players} holeInfo={round.holeInfo} currentHole={currentHole} pressThreshold={autoPressThreshold} existingPresses={round.presses || []} totalHoles={round.holes} onAutoPress={onAddPress} />
    );
  }

  if (hasMatchPlay && matchPlayResult && players.length === 2) {
    sections.push(<MatchPlaySection key="match" matchGame={matchGame} matchPlayResult={matchPlayResult} players={players} />);
  }

  if (nassauGame && nassauResult) {
    sections.push(
      <NassauSectionWithScores key="nassau" nassauGame={nassauGame} nassauResult={nassauResult} players={players} round={round} scores={scores} currentHole={currentHole} pressablePlayer={pressablePlayer} onPressClick={setPressConfirmPlayer} />
    );
  }

  if (skinsGame && skinsResult) {
    sections.push(<SkinsSection key="skins" skinsGame={skinsGame} skinsResult={skinsResult} players={players} />);
  }

  if (stablefordGame && stablefordResult) {
    sections.push(<StablefordSection key="stableford" stablefordGame={stablefordGame} stablefordResult={stablefordResult} />);
  }

  if (bestBallGame && bestBallResult) {
    sections.push(<BestBallSection key="bestball" bestBallGame={bestBallGame} bestBallResult={bestBallResult} />);
  }

  if (wolfGame && wolfResult) {
    sections.push(<WolfSection key="wolf" wolfGame={wolfGame} wolfResult={wolfResult} players={players} currentHole={currentHole} />);
  }

  if (vegasGame && vegasResult) {
    sections.push(<VegasSection key="vegas" vegasGame={vegasGame} vegasResult={vegasResult} players={players} />);
  }

  if (ninesGame && ninesResult) {
    sections.push(<NinesSection key="nines" ninesGame={ninesGame} ninesResult={ninesResult} players={players} />);
  }

  if (defenderGame && defenderResult) {
    sections.push(<DefenderSection key="defender" defenderGame={defenderGame} defenderResult={defenderResult} players={players} currentHole={currentHole} />);
  }

  if (sixesGame && sixesResult) {
    sections.push(<SixesSection key="sixes" sixesGame={sixesGame} sixesResult={sixesResult} players={players} />);
  }

  if (hasStrokePlay && players.length > 0) {
    sections.push(<StrokePlaySection key="stroke" players={players} />);
  }

  // Custom rules reminder section (AI-created rules that need manual tracking)
  const customRules = (houseGameEntry?.activePrimitives ?? []).filter(isCustomPrimitive);
  if (customRules.length > 0) {
    sections.push(
      <div key="custom-rules">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 rounded-md bg-[#F0EE3A] flex items-center justify-center">
            <Sparkles className="w-2.5 h-2.5 text-[#0A0A0A]" />
          </div>
          <span className="text-[12px] font-bold text-foreground">Custom Rules</span>
          <span className="ml-auto text-[10px] font-bold text-muted-foreground">Settle manually</span>
        </div>
        <div className="space-y-1.5">
          {customRules.map(rule => {
            const label = rule.label ?? rule.id.replace('custom_', '').replace(/_/g, ' ');
            const desc = rule.description ?? '';
            const val = rule.value;
            return (
              <div key={rule.id} className="rounded-xl bg-[#F0EE3A]/10 border border-[#F0EE3A]/40 px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-[12px] font-bold text-foreground block">{label}</span>
                    {desc && <span className="text-[11px] text-muted-foreground leading-snug">{desc}</span>}
                  </div>
                  {val != null && (
                    <span className="text-[12px] font-black text-foreground flex-shrink-0">${val}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (hasPropBets && propBetsSummary) {
    sections.push(<PropBetsSection key="props" propBets={propBets} propBetsSummary={propBetsSummary} players={players} />);
  }

  return (
    <>
      <GameCard className="overflow-hidden p-0">
        <button onClick={() => setIsExpanded(!isExpanded)} className="w-full px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LiveDot />
            <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#0A0A0A]">Games</span>
            <span className="text-[11px] text-slate-400 font-medium">{sections.length} active</span>
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-0">
                {sections.map((section, i) => (
                  <div key={i}>
                    {i > 0 && <Divider />}
                    <div className={i > 0 ? 'pt-4' : 'pt-1'}>{section}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GameCard>

      <AlertDialog open={!!pressConfirmPlayer} onOpenChange={() => setPressConfirmPlayer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Press</AlertDialogTitle>
            <AlertDialogDescription>
              {pressConfirmPlayer?.name} wants to press for ${nassauGame?.stakes} starting from hole {currentHole}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPress}>Press</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

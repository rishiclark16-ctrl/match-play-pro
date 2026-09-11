// v02 Nassau is now data-driven through gamesData.ts + GameCarousel.
// This file just re-exports the component under its old name so any
// legacy imports keep working.
import { GameCarousel } from './GameCarousel';

export const NassauCarousel: React.FC = () => <GameCarousel gameId="v02" />;

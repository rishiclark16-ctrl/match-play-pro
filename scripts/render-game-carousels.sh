#!/usr/bin/env bash
# Render 6 slide stills for each game in the 13-betting-games series.
# Usage: bash scripts/render-game-carousels.sh [game-id ...]
# If no args, renders all games from remotion/gamesData.ts.
set -euo pipefail

cd "$(dirname "$0")/.."

# Parallel mapping of IDs to slugs (Bash 3 compatible).
IDS=(v02 v03 v04 v05 v06 v07 v08 v09 v10 v11 v12 v13 v14)
SLUGS=(nassau skins wolf vegas stableford best-ball match-play quota nines defender sixes rabbit prop-bets)

slug_for() {
  local want=$1
  for i in "${!IDS[@]}"; do
    if [ "${IDS[$i]}" = "$want" ]; then
      echo "${SLUGS[$i]}"
      return
    fi
  done
  return 1
}

FRAMES=(15 45 75 105 135 165)

if [ "$#" -gt 0 ]; then
  TARGETS=("$@")
else
  TARGETS=("${IDS[@]}")
fi

for id in "${TARGETS[@]}"; do
  slug=$(slug_for "$id")
  dir="content/${id}-${slug}-carousel"
  mkdir -p "$dir"
  for i in "${!FRAMES[@]}"; do
    frame=${FRAMES[$i]}
    slide=$((i + 1))
    echo "→ $id slide-$slide (frame $frame)"
    bunx remotion still "Game-${id}" "$dir/slide-${slide}.png" --frame="$frame" >/dev/null
  done
  echo "✓ $id rendered to $dir"
done

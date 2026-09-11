#!/usr/bin/env bash
# SFX for LaunchUIRoundA + LaunchUIRoundB — clips keep their native audio,
# stem stays low during clip beats and punches on UI sections.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/out"
DEST_A="$ROOT/remotion/public/launch-clips/sfx-round-a.mp3"
DEST_B="$ROOT/remotion/public/launch-clips/sfx-round-b.mp3"
TMP="$(mktemp -d -t matchsfxround.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$OUT"
cd "$TMP"

echo "→ Generating shared SFX sources..."

# Tick — short bright "tic" (score cells)
ffmpeg -y -loglevel error \
  -f lavfi -t 0.06 -i "sine=f=1800" \
  -af "afade=t=out:st=0.005:d=0.055,volume=0.5" \
  -ac 2 tick.wav

# Sparkle — shimmer (birdies)
ffmpeg -y -loglevel error \
  -f lavfi -t 0.25 -i "sine=f=2400" \
  -f lavfi -t 0.25 -i "sine=f=3200" \
  -filter_complex "[0]afade=t=out:st=0.05:d=0.2,volume=0.4[a];
                   [1]afade=t=out:st=0.08:d=0.17,volume=0.35[b];
                   [a][b]amix=inputs=2:duration=longest:normalize=0" \
  -ac 2 sparkle.wav

# Ching — money chime
ffmpeg -y -loglevel error \
  -f lavfi -t 0.5 -i "sine=f=1320" \
  -f lavfi -t 0.5 -i "sine=f=1980" \
  -filter_complex "[0]afade=t=out:st=0.05:d=0.45,volume=0.5[a];
                   [1]afade=t=out:st=0.08:d=0.42,volume=0.4[b];
                   [a][b]amix=inputs=2:duration=longest:normalize=0,aecho=0.6:0.4:60:0.25" \
  -ac 2 ching.wav

# Bass — section slam
ffmpeg -y -loglevel error \
  -f lavfi -t 0.6 -i "sine=f=52" \
  -f lavfi -t 0.05 -i "anoisesrc=color=white:a=0.7" \
  -filter_complex "[0]afade=t=out:st=0.08:d=0.5,volume=1.0[sub];
                   [1]highpass=f=1200,lowpass=f=4500,afade=t=out:st=0.005:d=0.045,volume=0.32[click];
                   [sub][click]amix=inputs=2:duration=longest:normalize=0" \
  -ac 2 bass.wav

# Whoosh — transition (softer — clips have native audio)
ffmpeg -y -loglevel error \
  -f lavfi -t 0.45 -i "anoisesrc=color=pink:a=0.45" \
  -af "highpass=f=500,lowpass=f=5000,afade=t=in:d=0.12,afade=t=out:st=0.22:d=0.23,volume=0.35" \
  -ac 2 whoosh.wav

# Stinger — PAID stamp
ffmpeg -y -loglevel error \
  -f lavfi -t 0.7 -i "sine=f=44" \
  -f lavfi -t 0.15 -i "anoisesrc=color=white:a=0.85" \
  -filter_complex "[0]afade=t=out:st=0.12:d=0.55,volume=1.0[sub];
                   [1]highpass=f=2800,afade=t=out:st=0.02:d=0.13,volume=0.38[shimmer];
                   [sub][shimmer]amix=inputs=2:duration=longest:normalize=0,aecho=0.8:0.9:120|260:0.5|0.35,afade=t=out:st=2.0:d=1.4" \
  -t 3.5 -ac 2 stinger.wav

# Sub-whoosh — under-clip texture (very low)
ffmpeg -y -loglevel error \
  -f lavfi -t 0.6 -i "sine=f=60" \
  -af "afade=t=in:d=0.15,afade=t=out:st=0.4:d=0.2,volume=0.22" \
  -ac 2 subhit.wav

build_stem() {
  local OUTFILE="$1"
  shift
  local CUES=("$@")

  local INPUTS=""
  local FILTER=""
  local STREAMS=""
  local IDX=0

  for pair in "${CUES[@]}"; do
    local FILE="${pair%%@*}"
    local DELAY="${pair##*@}"
    INPUTS="$INPUTS -i $FILE"
    FILTER="${FILTER}[${IDX}]adelay=${DELAY}|${DELAY}[s${IDX}];"
    STREAMS="${STREAMS}[s${IDX}]"
    IDX=$((IDX + 1))
  done

  local N=$IDX
  FILTER="${FILTER}${STREAMS}amix=inputs=${N}:duration=longest:normalize=0,volume=2.2,alimiter=limit=0.95:level=disabled"

  ffmpeg -y -loglevel error $INPUTS \
    -filter_complex "$FILTER" \
    -t 18.0 -ar 48000 -ac 2 "$TMP/sfx.wav"

  ffmpeg -y -loglevel error -i "$TMP/sfx.wav" -c:a libmp3lame -q:a 2 "$OUTFILE"
}

# ============================================================================
# ROUND A — Workweek
# Timeline (frames → ms @ 30fps, 1f = 33.33ms):
#   0         ClipBeat MONDAY   (0–2000ms)      → subhit at 0
#   60   2000 Scorecard         (2000–7000ms)   → whoosh at 2000, ticks every 333ms from 2466, totals chime
#   210  7000 ClipBeat TUESDAY  (7000–9000ms)   → subhit at 7000
#   270  9000 Money             (9000–12666ms)  → whoosh 9000, 8 chings
#   380  12666 ClipBeat WEDNES  (12666–14666ms) → subhit at 12666
#   440  14666 Settlement       (14666–17000ms) → whoosh 14666, 3 chings, stinger at stampAt=45 → 14666+1500 = 16166
#   510  17000 Outro            (17000–18000ms) → bass at 17000
# ============================================================================

echo "→ Building Round A stem..."
CUES_A=(
  "subhit.wav@0"

  "whoosh.wav@2000"
  # 9 score ticks at 333ms spacing starting ~2466
  "tick.wav@2466"
  "tick.wav@2800"
  "tick.wav@3133"
  "tick.wav@3466"
  "tick.wav@3800"
  "tick.wav@4133"
  "tick.wav@4466"
  "tick.wav@4800"
  "tick.wav@5133"
  # birdie sparkles
  "sparkle.wav@3133"
  "sparkle.wav@4800"
  # totals + chips
  "ching.wav@5466"
  "ching.wav@6000"

  "subhit.wav@7000"

  "whoosh.wav@9000"
  # 8 money chings at 110f money duration — spread events across ~3.5s
  "ching.wav@9166"
  "ching.wav@9566"
  "ching.wav@9966"
  "ching.wav@10366"
  "ching.wav@10766"
  "ching.wav@11166"
  "ching.wav@11566"
  "ching.wav@11966"

  "subhit.wav@12666"

  "whoosh.wav@14666"
  # Settlement rows at frames 14,24,34 relative → +466, +800, +1133ms
  "ching.wav@15133"
  "ching.wav@15466"
  "ching.wav@15800"
  # PAID stamp at stampAt=45 → +1500ms
  "stinger.wav@16166"

  "bass.wav@17000"
)
build_stem "$OUT/launch-round-a-sfx.mp3" "${CUES_A[@]}"
cp "$OUT/launch-round-a-sfx.mp3" "$DEST_A"

# ============================================================================
# ROUND B — Q&A
# Timeline identical structure, different feel (fewer ticks, more whooshes into questions)
#   0         ClipBeat "WHAT'S THE BET?"  (0–2000)    → subhit
#   60   2000 Scorecard                    (2–7000)   → whoosh + ticks + totals
#   210  7000 ClipBeat "WHO'S UP?"         (7–9000)   → subhit
#   270  9000 Money                        (9–13000)  → whoosh + 8 chings (120f money)
#   390  13000 ClipBeat "WHO PAYS?"        (13–15000) → subhit
#   450  15000 Settlement                   (15–17000) → whoosh + 3 chings + stinger at stampAt=38 → 15000+1266 = 16266
#   510  17000 Outro                        (17–18000) → bass
# ============================================================================

echo "→ Building Round B stem..."
CUES_B=(
  "subhit.wav@0"

  "whoosh.wav@2000"
  "tick.wav@2466"
  "tick.wav@2800"
  "tick.wav@3133"
  "tick.wav@3466"
  "tick.wav@3800"
  "tick.wav@4133"
  "tick.wav@4466"
  "tick.wav@4800"
  "tick.wav@5133"
  "sparkle.wav@3133"
  "sparkle.wav@4800"
  "ching.wav@5466"
  "ching.wav@6000"

  "subhit.wav@7000"

  "whoosh.wav@9000"
  "ching.wav@9166"
  "ching.wav@9600"
  "ching.wav@10033"
  "ching.wav@10466"
  "ching.wav@10900"
  "ching.wav@11333"
  "ching.wav@11766"
  "ching.wav@12200"

  "subhit.wav@13000"

  "whoosh.wav@15000"
  "ching.wav@15466"
  "ching.wav@15800"
  "ching.wav@16133"
  # PAID stamp at stampAt=38 → +1266ms
  "stinger.wav@16266"

  "bass.wav@17000"
)
build_stem "$OUT/launch-round-b-sfx.mp3" "${CUES_B[@]}"
cp "$OUT/launch-round-b-sfx.mp3" "$DEST_B"

echo ""
echo "Done:"
echo "  $DEST_A"
echo "  $DEST_B"

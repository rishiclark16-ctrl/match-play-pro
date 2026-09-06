#!/usr/bin/env bash
# Sound design for the 18s UI demo cut — fast, snappy, percussive
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/out"
DEST="$ROOT/remotion/public/launch-clips/sfx-uidemo.mp3"
TMP="$(mktemp -d -t matchsfxui.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$OUT"
cd "$TMP"

echo "→ Generating SFX sources..."

# Score tick — short bright "tic"
ffmpeg -y -loglevel error \
  -f lavfi -t 0.06 -i "sine=f=1800" \
  -af "afade=t=out:st=0.005:d=0.055,volume=0.5" \
  -ac 2 tick.wav

# Birdie sparkle — bright shimmer
ffmpeg -y -loglevel error \
  -f lavfi -t 0.25 -i "sine=f=2400" \
  -f lavfi -t 0.25 -i "sine=f=3200" \
  -filter_complex "[0]afade=t=out:st=0.05:d=0.2,volume=0.4[a];
                   [1]afade=t=out:st=0.08:d=0.17,volume=0.35[b];
                   [a][b]amix=inputs=2:duration=longest:normalize=0" \
  -ac 2 sparkle.wav

# Hook bass slam
ffmpeg -y -loglevel error \
  -f lavfi -t 0.6 -i "sine=f=52" \
  -f lavfi -t 0.05 -i "anoisesrc=color=white:a=0.7" \
  -filter_complex "[0]afade=t=out:st=0.08:d=0.5,volume=1.0[sub];
                   [1]highpass=f=1200,lowpass=f=4500,afade=t=out:st=0.005:d=0.045,volume=0.32[click];
                   [sub][click]amix=inputs=2:duration=longest:normalize=0" \
  -ac 2 bass.wav

# Money chime — short bright bell
ffmpeg -y -loglevel error \
  -f lavfi -t 0.5 -i "sine=f=1320" \
  -f lavfi -t 0.5 -i "sine=f=1980" \
  -filter_complex "[0]afade=t=out:st=0.05:d=0.45,volume=0.5[a];
                   [1]afade=t=out:st=0.08:d=0.42,volume=0.4[b];
                   [a][b]amix=inputs=2:duration=longest:normalize=0,aecho=0.6:0.4:60:0.25" \
  -ac 2 ching.wav

# Voice mic open — soft hum
ffmpeg -y -loglevel error \
  -f lavfi -t 0.4 -i "sine=f=180" \
  -af "afade=t=in:d=0.1,afade=t=out:st=0.25:d=0.15,volume=0.3" \
  -ac 2 mic.wav

# Settle stinger — deep slam + reverb tail
ffmpeg -y -loglevel error \
  -f lavfi -t 0.7 -i "sine=f=44" \
  -f lavfi -t 0.15 -i "anoisesrc=color=white:a=0.85" \
  -filter_complex "[0]afade=t=out:st=0.12:d=0.55,volume=1.0[sub];
                   [1]highpass=f=2800,afade=t=out:st=0.02:d=0.13,volume=0.38[shimmer];
                   [sub][shimmer]amix=inputs=2:duration=longest:normalize=0,aecho=0.8:0.9:120|260:0.5|0.35,afade=t=out:st=2.0:d=1.4" \
  -t 3.5 -ac 2 stinger.wav

# Whoosh — section transition
ffmpeg -y -loglevel error \
  -f lavfi -t 0.45 -i "anoisesrc=color=pink:a=0.55" \
  -af "highpass=f=500,lowpass=f=5000,afade=t=in:d=0.12,afade=t=out:st=0.22:d=0.23,volume=0.5" \
  -ac 2 whoosh.wav

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
  FILTER="${FILTER}${STREAMS}amix=inputs=${N}:duration=longest:normalize=0,volume=2.4,alimiter=limit=0.95:level=disabled"

  ffmpeg -y -loglevel error $INPUTS \
    -filter_complex "$FILTER" \
    -t 18.0 -ar 48000 -ac 2 "$TMP/sfx.wav"

  ffmpeg -y -loglevel error -i "$TMP/sfx.wav" -c:a libmp3lame -q:a 2 "$OUTFILE"
}

echo "→ Building 18s UI demo stem..."
# 18s timeline at 30fps. Frames → ms = frame * 33.33
# 0     bass    HOOK (frame 0)
# 800   whoosh  → SCORECARD (frame 24)
# 1400  tick × 36  (4 players × 9 holes from frame 42, every 10f = 333ms)
#       starts at 1400ms, every 333/3 ≈ 111ms (one tick per cell across players, ~3.3/sec)
# Actually columns fire all 4 players together each ~333ms — use 9 ticks at 333ms intervals
# Plus birdie sparkles on hole 8 (Mike birdie) etc.
# 5800  ching → SCORECARD chips appear (frame 174 - 1)
# 5800  whoosh → MONEY scene (frame 174)
# Then ching for each money event — 8 events
# 9800  whoosh → VOICE (frame 294)
# 9933  mic open
# Plus 4 voice clicks
# 13800 whoosh → SETTLEMENT (frame 414)
# Plus 3 row clicks
# 15800 stinger → PAID stamp (frame 474, t=15800)
# 16800 OUTRO bass (frame 504)

CUES=(
  # Hook
  "bass.wav@0"

  # Scorecard scene starts at frame 24 = 800ms
  "whoosh.wav@750"

  # Score ticks — 9 holes filling at frame 42 + i*10 → ms = 1400 + i*333
  "tick.wav@1400"
  "tick.wav@1733"
  "tick.wav@2066"
  "tick.wav@2400"
  "tick.wav@2733"
  "tick.wav@3066"
  "tick.wav@3400"
  "tick.wav@3733"
  "tick.wav@4066"
  # Birdie sparkle — Mike hole 8 (col 7) = frame 88, t≈2933ms (overlap with tick)
  "sparkle.wav@3733"
  # Eagle/double sparkle on You hole 3 col 2 frame 38 + 20 = 58 ≈ 1933
  "sparkle.wav@2066"

  # Totals reveal ≈ frame 24 + 113 = 137 → 4566ms
  "ching.wav@4566"
  # Chips appear ≈ frame 24 + 128 = 152 → 5066
  "ching.wav@5066"

  # Money scene start frame 174 → 5800ms
  "whoosh.wav@5800"
  # 8 money events at frames 178, 192, 204, 216, 228, 240, 252, 264 → ms
  "ching.wav@5933"
  "ching.wav@6400"
  "ching.wav@6800"
  "ching.wav@7200"
  "ching.wav@7600"
  "ching.wav@8000"
  "ching.wav@8400"
  "ching.wav@8800"

  # Voice scene start frame 294 → 9800ms
  "whoosh.wav@9800"
  "mic.wav@9866"
  # 4 voice events at frames 308, 330, 354, 378 → ms
  "tick.wav@10266"
  "sparkle.wav@10266"
  "tick.wav@11000"
  "sparkle.wav@11000"
  "tick.wav@11800"
  "tick.wav@12600"
  "sparkle.wav@12600"

  # Settlement frame 414 → 13800ms
  "whoosh.wav@13800"
  # 3 rows at frames 428, 442, 456 → ms
  "ching.wav@14266"
  "ching.wav@14733"
  "ching.wav@15200"
  # PAID stamp frame 474 → 15800ms
  "stinger.wav@15800"

  # Outro bass slam frame 504 → 16800
  "bass.wav@16800"
)
build_stem "$OUT/launch-uidemo-sfx.mp3" "${CUES[@]}"
cp "$OUT/launch-uidemo-sfx.mp3" "$DEST"

echo ""
echo "Done:"
echo "  $OUT/launch-uidemo-sfx.mp3 → $DEST"

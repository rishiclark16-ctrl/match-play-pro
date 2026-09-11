#!/usr/bin/env bash
# Sound design for the 15s "Day to Night" cinematic cut
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/out"
DEST="$ROOT/remotion/public/launch-clips/sfx-d2n.mp3"
TMP="$(mktemp -d -t matchsfxd2n.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$OUT"
cd "$TMP"

echo "→ Generating ambient bed + cues..."

# Continuous low sub-bass bed (15s) — quiet, pulsing
ffmpeg -y -loglevel error \
  -f lavfi -t 15 -i "sine=f=48" \
  -af "tremolo=f=0.25:d=0.4,afade=t=in:d=1.5,afade=t=out:st=13.0:d=2.0,volume=0.30" \
  -ac 2 bed.wav

# Soft transition whoosh
ffmpeg -y -loglevel error \
  -f lavfi -t 0.7 -i "anoisesrc=color=pink:a=0.5" \
  -af "highpass=f=400,lowpass=f=4500,afade=t=in:d=0.18,afade=t=out:st=0.32:d=0.38,volume=0.42" \
  -ac 2 whoosh.wav

# Section swell — sub bass roll into a soft hit
ffmpeg -y -loglevel error \
  -f lavfi -t 1.2 -i "sine=f=55" \
  -f lavfi -t 0.05 -i "anoisesrc=color=white:a=0.6" \
  -filter_complex "[0]afade=t=in:d=0.4,afade=t=out:st=0.7:d=0.5,volume=0.85[sub];
                   [1]highpass=f=1500,lowpass=f=4000,afade=t=out:st=0.005:d=0.045,volume=0.22[click];
                   [sub][click]amix=inputs=2:duration=longest:normalize=0" \
  -ac 2 swell.wav

# Payoff stinger — deep slam + shimmer + reverb tail
ffmpeg -y -loglevel error \
  -f lavfi -t 0.8 -i "sine=f=42" \
  -f lavfi -t 0.18 -i "anoisesrc=color=white:a=0.85" \
  -filter_complex "[0]afade=t=out:st=0.15:d=0.65,volume=1.0[sub];
                   [1]highpass=f=2800,afade=t=out:st=0.02:d=0.16,volume=0.35[shimmer];
                   [sub][shimmer]amix=inputs=2:duration=longest:normalize=0,aecho=0.8:0.92:120|280:0.55|0.4,afade=t=out:st=2.4:d=1.6" \
  -t 4.0 -ac 2 stinger.wav

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
  FILTER="${FILTER}${STREAMS}amix=inputs=${N}:duration=longest:normalize=0,volume=2.6,alimiter=limit=0.95:level=disabled"

  ffmpeg -y -loglevel error $INPUTS \
    -filter_complex "$FILTER" \
    -t 15.0 -ar 48000 -ac 2 "$TMP/sfx.wav"

  ffmpeg -y -loglevel error -i "$TMP/sfx.wav" -c:a libmp3lame -q:a 2 "$OUTFILE"
}

echo "→ Building 15s D2N stem..."
# 15s timeline at 30fps (ms):
# 0     bed         continuous ambient bed
# 3333  whoosh      → ROLLING OUT (frame 100)
# 6466  swell       → THE MOMENT (frame 194)
# 9933  whoosh      → THE CLOSE (frame 298)
# 10933 stinger     → THE TAB / SETTLE UP (frame 328)
# 12333 outro       (silence into outro lets stinger tail breathe)
CUES=(
  "bed.wav@0"
  "whoosh.wav@3200"
  "swell.wav@6300"
  "whoosh.wav@9800"
  "stinger.wav@10900"
)
build_stem "$OUT/launch-d2n-sfx.mp3" "${CUES[@]}"
cp "$OUT/launch-d2n-sfx.mp3" "$DEST"

echo ""
echo "Done:"
echo "  $OUT/launch-d2n-sfx.mp3 → $DEST"

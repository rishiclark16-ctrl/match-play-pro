#!/usr/bin/env bash
# Sound design for LaunchVideoV2 — sparser than v1 since natural clip audio
# is preserved. SFX only on text moments (opener, slams, tickers, split, outro).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/out"
DEST="$ROOT/remotion/public/launch-clips-v2/sfx.mp3"
TMP="$(mktemp -d -t matchsfx2.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$OUT"
cd "$TMP"

echo "→ Generating SFX sources..."

# Bass hit — punchy 55Hz thump
ffmpeg -y -loglevel error \
  -f lavfi -t 0.5 -i "sine=f=55" \
  -f lavfi -t 0.04 -i "anoisesrc=color=white:a=0.7" \
  -filter_complex "[0]afade=t=out:st=0.06:d=0.44,volume=1.0[sub];
                   [1]highpass=f=1500,lowpass=f=4000,afade=t=out:st=0.005:d=0.035,volume=0.28[click];
                   [sub][click]amix=inputs=2:duration=longest:normalize=0" \
  -ac 2 bass.wav

# Bass heavy — with reverb tail
ffmpeg -y -loglevel error \
  -i bass.wav -af "aecho=0.7:0.85:80|160:0.35|0.25,afade=t=out:st=0.9:d=0.6" \
  -t 1.5 bass_heavy.wav

# Whoosh — transition
ffmpeg -y -loglevel error \
  -f lavfi -t 0.55 -i "anoisesrc=color=pink:a=0.55" \
  -af "highpass=f=500,lowpass=f=5000,afade=t=in:d=0.14,afade=t=out:st=0.28:d=0.27,volume=0.5" \
  -ac 2 whoosh.wav

# Riser — upward pitch whoosh for ticker transitions
ffmpeg -y -loglevel error \
  -f lavfi -t 0.8 -i "anoisesrc=color=pink:a=0.5" \
  -af "highpass=f=800,lowpass=f=7000,afade=t=in:d=0.3,afade=t=out:st=0.65:d=0.15,volume=0.45" \
  -ac 2 riser.wav

# Clunk — mechanical stamp sound for Split reveal
ffmpeg -y -loglevel error \
  -f lavfi -t 0.25 -i "sine=f=110" \
  -f lavfi -t 0.08 -i "anoisesrc=color=white:a=0.6" \
  -filter_complex "[0]afade=t=out:st=0.05:d=0.2,volume=0.8[low];
                   [1]highpass=f=800,lowpass=f=3500,afade=t=out:st=0.015:d=0.065,volume=0.5[mid];
                   [low][mid]amix=inputs=2:duration=longest:normalize=0" \
  -ac 2 clunk.wav

# Stinger — final MATCH impact
ffmpeg -y -loglevel error \
  -f lavfi -t 0.6 -i "sine=f=45" \
  -f lavfi -t 0.15 -i "anoisesrc=color=white:a=0.9" \
  -filter_complex "[0]afade=t=out:st=0.1:d=0.5,volume=1.0[sub];
                   [1]highpass=f=3000,afade=t=out:st=0.02:d=0.13,volume=0.4[crash];
                   [sub][crash]amix=inputs=2:duration=longest:normalize=0,aecho=0.8:0.9:100|250:0.5|0.35,afade=t=out:st=1.8:d=1.2" \
  -t 3.0 -ac 2 stinger.wav

echo "→ Compositing SFX timeline..."

# Timeline (ms):
# 0      bass_heavy   — Bar opener impact
# 300    bass         — line 2 "TO THE TAB" landing
# 1500   whoosh       — into clip 1
# 5000   bass_heavy   — SLAM LIGHT "LIVE."
# 6200   whoosh       — into clip 2
# 9700   riser        — into Ticker 1
# 10700  whoosh       — into clip 3
# 14200  clunk        — Split reveal LEFT (REAL)
# 14400  clunk        — Split reveal RIGHT (PRESSURE.)
# 15700  whoosh       — into clip 4
# 19200  riser        — into Ticker 2
# 20200  whoosh       — into clip 5
# 23700  bass_heavy   — SLAM LIGHT "YOUR GAME."
# 25200  whoosh       — into clip 6
# 28700  stinger      — MATCH outro

INPUTS=""
FILTER=""
IDX=0
STREAMS=""

add_cue() {
  local FILE="$1"
  local DELAY="$2"
  INPUTS="$INPUTS -i $FILE"
  FILTER="${FILTER}[${IDX}]adelay=${DELAY}|${DELAY}[s${IDX}];"
  STREAMS="${STREAMS}[s${IDX}]"
  IDX=$((IDX + 1))
}

add_cue bass_heavy.wav 0
add_cue bass.wav 300
add_cue whoosh.wav 1500
add_cue bass_heavy.wav 5000
add_cue whoosh.wav 6200
add_cue riser.wav 9700
add_cue whoosh.wav 10700
add_cue clunk.wav 14200
add_cue clunk.wav 14400
add_cue whoosh.wav 15700
add_cue riser.wav 19200
add_cue whoosh.wav 20200
add_cue bass_heavy.wav 23700
add_cue whoosh.wav 25200
add_cue stinger.wav 28700

N=$IDX
FILTER="${FILTER}${STREAMS}amix=inputs=${N}:duration=longest:normalize=0,volume=2.8,alimiter=limit=0.95:level=disabled"

ffmpeg -y -loglevel error $INPUTS \
  -filter_complex "$FILTER" \
  -t 31.7 -ar 48000 -ac 2 "$TMP/sfx.wav"

ffmpeg -y -loglevel error -i "$TMP/sfx.wav" -c:a libmp3lame -q:a 2 "$OUT/launch-sfx-v2.mp3"
cp "$OUT/launch-sfx-v2.mp3" "$DEST"

echo ""
echo "Done:"
echo "  $OUT/launch-sfx-v2.mp3"
echo "  $DEST"

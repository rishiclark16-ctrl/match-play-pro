#!/usr/bin/env bash
# Sound design for the 10s TikTok/Reels shorts (v1 dark + v2 clean)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/out"
DEST_V1="$ROOT/remotion/public/launch-clips/sfx-short.mp3"
DEST_V2="$ROOT/remotion/public/launch-clips-v2/sfx-short.mp3"
TMP="$(mktemp -d -t matchsfxshort.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$OUT"
cd "$TMP"

echo "→ Generating SFX sources..."

ffmpeg -y -loglevel error \
  -f lavfi -t 0.5 -i "sine=f=55" \
  -f lavfi -t 0.04 -i "anoisesrc=color=white:a=0.7" \
  -filter_complex "[0]afade=t=out:st=0.06:d=0.44,volume=1.0[sub];
                   [1]highpass=f=1500,lowpass=f=4000,afade=t=out:st=0.005:d=0.035,volume=0.28[click];
                   [sub][click]amix=inputs=2:duration=longest:normalize=0" \
  -ac 2 bass.wav

ffmpeg -y -loglevel error \
  -i bass.wav -af "aecho=0.7:0.85:80|160:0.35|0.25,afade=t=out:st=0.9:d=0.6" \
  -t 1.5 bass_heavy.wav

ffmpeg -y -loglevel error \
  -f lavfi -t 0.45 -i "anoisesrc=color=pink:a=0.55" \
  -af "highpass=f=500,lowpass=f=5000,afade=t=in:d=0.12,afade=t=out:st=0.22:d=0.23,volume=0.5" \
  -ac 2 whoosh.wav

ffmpeg -y -loglevel error \
  -f lavfi -t 0.6 -i "sine=f=45" \
  -f lavfi -t 0.15 -i "anoisesrc=color=white:a=0.9" \
  -filter_complex "[0]afade=t=out:st=0.1:d=0.5,volume=1.0[sub];
                   [1]highpass=f=3000,afade=t=out:st=0.02:d=0.13,volume=0.4[crash];
                   [sub][crash]amix=inputs=2:duration=longest:normalize=0,aecho=0.8:0.9:100|250:0.5|0.35,afade=t=out:st=1.8:d=1.2" \
  -t 2.5 -ac 2 stinger.wav

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
  FILTER="${FILTER}${STREAMS}amix=inputs=${N}:duration=longest:normalize=0,volume=2.8,alimiter=limit=0.95:level=disabled"

  ffmpeg -y -loglevel error $INPUTS \
    -filter_complex "$FILTER" \
    -t 10.0 -ar 48000 -ac 2 "$TMP/sfx.wav"

  ffmpeg -y -loglevel error -i "$TMP/sfx.wav" -c:a libmp3lame -q:a 2 "$OUTFILE"
}

echo "→ Building v1 short SFX stem..."
# 10s timeline at 30fps (ms):
# 0      bass_heavy  — HOOK (PLAYING FOR)
# 1000   whoosh      — into clip SCORE
# 1000   bass        — SCORE slam
# 2500   bass        — BET slam
# 4000   bass_heavy  — SETTLE UP slam (gold)
# 5500   bass        — NO MATH slam
# 7000   bass_heavy  — JUST PLAY slam (gold)
# 8500   stinger     — MATCH outro
V1_CUES=(
  "bass_heavy.wav@0"
  "whoosh.wav@900"
  "bass.wav@1000"
  "whoosh.wav@2400"
  "bass.wav@2500"
  "whoosh.wav@3900"
  "bass_heavy.wav@4000"
  "whoosh.wav@5400"
  "bass.wav@5500"
  "whoosh.wav@6900"
  "bass_heavy.wav@7000"
  "stinger.wav@8500"
)
build_stem "$OUT/launch-short-v1-sfx.mp3" "${V1_CUES[@]}"
cp "$OUT/launch-short-v1-sfx.mp3" "$DEST_V1"

echo "→ Building v2 short SFX stem..."
# v2 is natural-audio-forward — lighter SFX
# 0      bass_heavy  — HOOK
# 1000   whoosh      — clip 01 LIVE
# 2270   whoosh      — clip 02
# 3533   whoosh      — clip 03
# 4800   bass        — YOUR GAME (gold)
# 6067   whoosh      — clip 05
# 7333   bass        — JUST PLAY (gold)
# 8600   stinger     — MATCH outro (Malbon)
V2_CUES=(
  "bass_heavy.wav@0"
  "whoosh.wav@1000"
  "whoosh.wav@2270"
  "whoosh.wav@3533"
  "whoosh.wav@4700"
  "bass.wav@4800"
  "whoosh.wav@6067"
  "whoosh.wav@7233"
  "bass.wav@7333"
  "stinger.wav@8600"
)
build_stem "$OUT/launch-short-v2-sfx.mp3" "${V2_CUES[@]}"
cp "$OUT/launch-short-v2-sfx.mp3" "$DEST_V2"

echo ""
echo "Done:"
echo "  $OUT/launch-short-v1-sfx.mp3 → $DEST_V1"
echo "  $OUT/launch-short-v2-sfx.mp3 → $DEST_V2"

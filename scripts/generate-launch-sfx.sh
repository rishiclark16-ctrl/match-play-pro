#!/usr/bin/env bash
# Generate sound design for the launch video and bake it into the silent render.
# Outputs:
#   out/launch-sfx.mp3          — SFX stem only (for layering with VO + music)
#   out/launch-video-sfx.mp4    — Video with SFX baked in (no VO yet)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/out"
TMP="$(mktemp -d -t matchsfx.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$OUT"
cd "$TMP"

echo "→ Generating SFX sources..."

# Bass hit — punchy 55Hz thump with quick decay (sub + click transient)
ffmpeg -y -loglevel error \
  -f lavfi -t 0.5 -i "sine=f=55" \
  -f lavfi -t 0.04 -i "anoisesrc=color=white:a=0.7" \
  -filter_complex "[0]afade=t=out:st=0.06:d=0.44,volume=0.95[sub];
                   [1]highpass=f=1500,lowpass=f=4000,afade=t=out:st=0.005:d=0.035,volume=0.25[click];
                   [sub][click]amix=inputs=2:duration=longest:normalize=0,volume=1.0" \
  -ac 2 bass.wav

# Bass heavy — bass with tail reverb for big-moment slams (SETTLE UP, PLAY., MATCH)
ffmpeg -y -loglevel error \
  -i bass.wav -af "aecho=0.7:0.85:80|160:0.35|0.25,afade=t=out:st=0.9:d=0.6,volume=1.0" \
  -t 1.5 bass_heavy.wav

# Whoosh — pink-noise transition, mid-band
ffmpeg -y -loglevel error \
  -f lavfi -t 0.55 -i "anoisesrc=color=pink:a=0.55" \
  -af "highpass=f=500,lowpass=f=5000,afade=t=in:d=0.14,afade=t=out:st=0.28:d=0.27,volume=0.5" \
  -ac 2 whoosh.wav

# Whoosh soft — quieter, shorter (for subtle transitions)
ffmpeg -y -loglevel error \
  -f lavfi -t 0.4 -i "anoisesrc=color=pink:a=0.35" \
  -af "highpass=f=800,lowpass=f=4500,afade=t=in:d=0.1,afade=t=out:st=0.2:d=0.2,volume=0.3" \
  -ac 2 whoosh_soft.wav

# Typewriter click — crisp 40ms mechanical click
ffmpeg -y -loglevel error \
  -f lavfi -t 0.04 -i "anoisesrc=color=white:a=0.8" \
  -af "highpass=f=2000,lowpass=f=7000,afade=t=out:st=0.008:d=0.032,volume=0.28" \
  -ac 2 click.wav

# Stinger — big impact with long reverb tail for MATCH outro
ffmpeg -y -loglevel error \
  -f lavfi -t 0.6 -i "sine=f=45" \
  -f lavfi -t 0.15 -i "anoisesrc=color=white:a=0.9" \
  -filter_complex "[0]afade=t=out:st=0.1:d=0.5,volume=1.0[sub];
                   [1]highpass=f=3000,afade=t=out:st=0.02:d=0.13,volume=0.4[crash];
                   [sub][crash]amix=inputs=2:duration=longest:normalize=0,aecho=0.8:0.9:100|250:0.5|0.35,afade=t=out:st=1.8:d=1.2" \
  -t 3.0 -ac 2 stinger.wav

# Drone pad — subtle low sustained tone for atmosphere (whole video)
ffmpeg -y -loglevel error \
  -f lavfi -t 35 -i "sine=f=55" \
  -f lavfi -t 35 -i "sine=f=82.4" \
  -f lavfi -t 35 -i "sine=f=110" \
  -filter_complex "[0][1][2]amix=inputs=3:duration=longest:weights='0.6 0.3 0.2',tremolo=f=0.3:d=0.25,afade=t=in:d=1.5,afade=t=out:st=33:d=2,volume=0.06" \
  -ac 2 drone.wav

echo "→ Compositing SFX timeline..."

# Timeline (ms):
# 0      bass          — opener slam (PLAYING FOR)
# 1500   click x6      — typewriter 1
# 3300   whoosh        — into clip 4
# 7100   bass          — SCORE.
# 7800   bass          — BET.
# 8500   bass_heavy    — SETTLE UP.
# 9300   whoosh        — into clip 3
# 13100  whoosh_soft   — tag sweep
# 15100  whoosh        — into clip 1
# 18900  click x6      — typewriter 2
# 21400  whoosh        — into clip 2
# 25200  bass          — NO MATH.
# 25700  bass          — NO ARGUMENTS.
# 26700  whoosh        — into clip 5
# 30500  bass          — JUST
# 31000  bass_heavy    — PLAY.
# 31900  stinger       — MATCH outro

# Typewriter click patterns — slightly irregular for human feel
TW1=(1500 1680 1860 2040 2260 2460 2660 2860 3060)
TW2=(18900 19080 19260 19460 19680 19900 20140 20380 20620 20880 21140)

# Build -i args and filter_complex
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

add_cue bass.wav 0
for t in "${TW1[@]}"; do add_cue click.wav "$t"; done
add_cue whoosh.wav 3300
add_cue bass.wav 7100
add_cue bass.wav 7800
add_cue bass_heavy.wav 8500
add_cue whoosh.wav 9300
add_cue whoosh_soft.wav 13100
add_cue whoosh.wav 15100
for t in "${TW2[@]}"; do add_cue click.wav "$t"; done
add_cue whoosh.wav 21400
add_cue bass.wav 25200
add_cue bass.wav 25700
add_cue whoosh.wav 26700
add_cue bass.wav 30500
add_cue bass_heavy.wav 31000
add_cue stinger.wav 31900
add_cue drone.wav 0

N=$IDX
FILTER="${FILTER}${STREAMS}amix=inputs=${N}:duration=longest:normalize=0"

ffmpeg -y -loglevel error $INPUTS \
  -filter_complex "${FILTER},volume=3.2,alimiter=limit=0.95:level=disabled" \
  -t 34.95 -ar 48000 -ac 2 "$OUT/launch-sfx.wav"

# Also export as MP3 stem
ffmpeg -y -loglevel error -i "$OUT/launch-sfx.wav" -c:a libmp3lame -q:a 2 "$OUT/launch-sfx.mp3"

echo "→ Baking SFX into silent launch video..."

# Merge SFX audio into the existing silent video
ffmpeg -y -loglevel error \
  -i "$OUT/launch-video.mp4" \
  -i "$OUT/launch-sfx.wav" \
  -c:v copy -c:a aac -b:a 192k -shortest \
  "$OUT/launch-video-sfx.mp4"

# Clean up temp wav
rm -f "$OUT/launch-sfx.wav"

echo ""
echo "Done:"
echo "  $OUT/launch-sfx.mp3         (SFX stem for your editor)"
echo "  $OUT/launch-video-sfx.mp4   (video with SFX baked in, ready for VO+music layer)"

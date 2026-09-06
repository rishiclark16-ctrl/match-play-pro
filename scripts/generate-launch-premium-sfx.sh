#!/usr/bin/env bash
# Premium ad-style SFX for LaunchUIVersus + LaunchUIOddsBoard.
# Richer palette than round-a/b: layered impacts, synth risers, FM bells,
# coin/chime polybell, ticker clicks, casino slam. Timings tuned to each scene.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/out"
DEST_V="$ROOT/remotion/public/launch-clips/sfx-versus.mp3"
DEST_O="$ROOT/remotion/public/launch-clips/sfx-oddsboard.mp3"
TMP="$(mktemp -d -t matchsfxprem.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$OUT"
cd "$TMP"

echo "→ Generating premium SFX sources..."

# -----------------------------------------------------------------------------
# impact.wav — cinematic ad slam (sub + mid thump + shimmer click + tail)
# -----------------------------------------------------------------------------
ffmpeg -y -loglevel error \
  -f lavfi -t 1.5 -i "sine=f=48" \
  -f lavfi -t 0.9 -i "sine=f=92" \
  -f lavfi -t 0.08 -i "anoisesrc=color=white:a=0.9" \
  -filter_complex "
    [0]afade=t=out:st=0.18:d=1.2,volume=1.0[sub];
    [1]afade=t=out:st=0.08:d=0.7,volume=0.45[mid];
    [2]highpass=f=2000,lowpass=f=7500,afade=t=out:st=0.01:d=0.07,volume=0.55[click];
    [sub][mid][click]amix=inputs=3:duration=longest:normalize=0,
      aecho=0.75:0.55:110|240:0.32|0.18
  " -t 1.5 -ac 2 impact.wav

# -----------------------------------------------------------------------------
# riser.wav — 1s synth build (rising pink noise + ascending sine sweep)
# -----------------------------------------------------------------------------
ffmpeg -y -loglevel error \
  -f lavfi -t 1.0 -i "anoisesrc=color=pink:a=0.6" \
  -f lavfi -t 1.0 -i "sine=f=200" \
  -filter_complex "
    [0]highpass=f=700,lowpass=f=6000,
       volume='min(1, t/0.95)':eval=frame,
       afade=t=out:st=0.95:d=0.05,
       volume=0.55[sw];
    [1]asetrate=48000,
       volume='min(1, t/0.9)':eval=frame,
       afade=t=out:st=0.95:d=0.05,
       volume=0.28[tone];
    [sw][tone]amix=inputs=2:duration=longest:normalize=0
  " -t 1.0 -ac 2 riser.wav

# -----------------------------------------------------------------------------
# whoosh.wav — fast transition (band-passed noise sweep, 400ms)
# -----------------------------------------------------------------------------
ffmpeg -y -loglevel error \
  -f lavfi -t 0.45 -i "anoisesrc=color=pink:a=0.65" \
  -af "
    highpass=f=400,lowpass=f=5200,
    afade=t=in:d=0.10,
    afade=t=out:st=0.28:d=0.17,
    volume=0.55
  " -ac 2 whoosh.wav

# -----------------------------------------------------------------------------
# bell.wav — polysynth FM-ish bell (fundamental + 2x + 3x with fast decay)
# -----------------------------------------------------------------------------
ffmpeg -y -loglevel error \
  -f lavfi -t 0.9 -i "sine=f=880" \
  -f lavfi -t 0.9 -i "sine=f=1760" \
  -f lavfi -t 0.9 -i "sine=f=2640" \
  -filter_complex "
    [0]afade=t=out:st=0.02:d=0.85,volume=0.55[f0];
    [1]afade=t=out:st=0.02:d=0.55,volume=0.35[f1];
    [2]afade=t=out:st=0.02:d=0.35,volume=0.20[f2];
    [f0][f1][f2]amix=inputs=3:duration=longest:normalize=0,
      aecho=0.6:0.35:80|180:0.25|0.15
  " -t 1.0 -ac 2 bell.wav

# -----------------------------------------------------------------------------
# coin.wav — bright metallic chime (two bells stacked, 0.7s)
# -----------------------------------------------------------------------------
ffmpeg -y -loglevel error \
  -f lavfi -t 0.7 -i "sine=f=1568" \
  -f lavfi -t 0.7 -i "sine=f=2352" \
  -f lavfi -t 0.7 -i "sine=f=3136" \
  -filter_complex "
    [0]afade=t=out:st=0.04:d=0.66,volume=0.55[a];
    [1]afade=t=out:st=0.05:d=0.55,volume=0.42[b];
    [2]afade=t=out:st=0.06:d=0.35,volume=0.22[c];
    [a][b][c]amix=inputs=3:duration=longest:normalize=0,
      aecho=0.7:0.4:55:0.25
  " -t 0.8 -ac 2 coin.wav

# -----------------------------------------------------------------------------
# tick.wav — sharp ticker click (0.05s, high sine + tiny noise)
# -----------------------------------------------------------------------------
ffmpeg -y -loglevel error \
  -f lavfi -t 0.05 -i "sine=f=2200" \
  -f lavfi -t 0.04 -i "anoisesrc=color=white:a=0.6" \
  -filter_complex "
    [0]afade=t=out:st=0.005:d=0.045,volume=0.45[s];
    [1]highpass=f=4000,afade=t=out:st=0.005:d=0.035,volume=0.25[n];
    [s][n]amix=inputs=2:duration=longest:normalize=0
  " -ac 2 tick.wav

# -----------------------------------------------------------------------------
# flip.wav — card flip (low puff + soft click)
# -----------------------------------------------------------------------------
ffmpeg -y -loglevel error \
  -f lavfi -t 0.18 -i "anoisesrc=color=pink:a=0.55" \
  -f lavfi -t 0.06 -i "sine=f=900" \
  -filter_complex "
    [0]lowpass=f=1400,afade=t=in:d=0.01,afade=t=out:st=0.10:d=0.07,volume=0.35[p];
    [1]afade=t=out:st=0.01:d=0.05,volume=0.28[t];
    [p][t]amix=inputs=2:duration=longest:normalize=0
  " -ac 2 flip.wav

# -----------------------------------------------------------------------------
# clap.wav — punchy clap (transient + bright band noise)
# -----------------------------------------------------------------------------
ffmpeg -y -loglevel error \
  -f lavfi -t 0.18 -i "anoisesrc=color=white:a=0.85" \
  -af "
    highpass=f=1400,lowpass=f=4500,
    afade=t=out:st=0.03:d=0.15,
    volume=0.45,
    aecho=0.6:0.3:25:0.2
  " -ac 2 clap.wav

# -----------------------------------------------------------------------------
# stinger.wav — casino-style PAID slam (deep sub + bright shimmer + long tail)
# -----------------------------------------------------------------------------
ffmpeg -y -loglevel error \
  -f lavfi -t 1.0 -i "sine=f=44" \
  -f lavfi -t 0.6 -i "sine=f=120" \
  -f lavfi -t 0.15 -i "anoisesrc=color=white:a=0.95" \
  -f lavfi -t 0.8 -i "sine=f=2640" \
  -filter_complex "
    [0]afade=t=out:st=0.15:d=0.85,volume=1.0[sub];
    [1]afade=t=out:st=0.1:d=0.5,volume=0.5[mid];
    [2]highpass=f=2600,afade=t=out:st=0.02:d=0.13,volume=0.45[sh];
    [3]afade=t=in:d=0.02,afade=t=out:st=0.1:d=0.7,volume=0.22[bell];
    [sub][mid][sh][bell]amix=inputs=4:duration=longest:normalize=0,
      aecho=0.85:0.85:140|300|500:0.55|0.35|0.2,
      afade=t=out:st=2.2:d=1.6
  " -t 3.8 -ac 2 stinger.wav

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
  FILTER="${FILTER}${STREAMS}amix=inputs=${N}:duration=longest:normalize=0,volume=2.0,alimiter=limit=0.95:level=disabled"

  ffmpeg -y -loglevel error $INPUTS \
    -filter_complex "$FILTER" \
    -t 18.0 -ar 48000 -ac 2 "$TMP/sfx.wav"

  ffmpeg -y -loglevel error -i "$TMP/sfx.wav" -c:a libmp3lame -q:a 2 "$OUTFILE"
}

# ============================================================================
# LAUNCH UI VERSUS — timing map (30fps, 1f = 33.33ms)
# 0-45     Clip "SETTLE IT"                0–1500ms       subhit, whoosh out at 1333
# 45-225   BattleCard (180f)               1500–7500ms
#   intro slam at 1500
#   9 flip cards at holeStart=20 + i*16 → frame 65..193 → ms 2166,2700,3233,3766,4300,4833,5366,5900,6433
#   winner chimes at +6f after each flip → +200ms
#   final slam at frame 45+ (20+144+6)=215 → ms 7166
# 225-285  Clip "DOWN TO THE WIRE"         7500–9500ms    whoosh at 7466
# 285-435  HeatMap (150f)                  9500–14500ms
#   intro impact at 9500
#   tiles at tileStart=16 + i*10 → frame 301..381 → ms 10033,10366,10700,11033,11366,11700,12033,12366,12700
#   total slam at 285+16+90+8 = 399 → ms 13300
# 435-495  Clip "WINNER TAKES IT"          14500–16500ms  whoosh at 14466
# 495-540  Outro                           16500–18000ms  stinger at 16500
# ============================================================================
echo "→ Building Versus stem..."
CUES_V=(
  "whoosh.wav@0"

  "impact.wav@1500"
  # Flip cards — flip+tick, every 533ms
  "flip.wav@2166"
  "tick.wav@2366"
  "flip.wav@2700"
  "coin.wav@2900"
  "flip.wav@3233"
  "tick.wav@3433"
  "flip.wav@3766"
  "tick.wav@3966"
  "flip.wav@4300"
  "coin.wav@4500"
  "flip.wav@4833"
  "tick.wav@5033"
  "flip.wav@5366"
  "coin.wav@5566"
  "flip.wav@5900"
  "coin.wav@6100"
  "flip.wav@6433"
  "coin.wav@6633"
  # Pre-slam riser
  "riser.wav@6300"
  # Score slam
  "clap.wav@7166"
  "impact.wav@7166"

  "whoosh.wav@7466"

  "impact.wav@9500"
  # Heat tiles
  "tick.wav@10033"
  "tick.wav@10366"
  "tick.wav@10700"
  "tick.wav@11033"
  "tick.wav@11366"
  "tick.wav@11700"
  "tick.wav@12033"
  "tick.wav@12366"
  "tick.wav@12700"
  # Standout tiles (big deltas): h1(-5), h4(-5), h6(-8), h8(-12), h3(+3), h7(+2), h9(+3)
  "coin.wav@10700"
  "coin.wav@12366"
  "coin.wav@11700"
  # Running total slam
  "riser.wav@12800"
  "impact.wav@13300"

  "whoosh.wav@14466"

  "stinger.wav@16500"
)
build_stem "$OUT/launch-versus-sfx.mp3" "${CUES_V[@]}"
cp "$OUT/launch-versus-sfx.mp3" "$DEST_V"

# ============================================================================
# LAUNCH UI ODDSBOARD — timing map
# 0-30     Hook "THE ODDS."                0–1000ms       impact at 0, riser 0-1000
# 30-210   Ticker (180f)                   1000–7000ms
#   rows enter at rowStart=8 + i*5 → f=38,43,48,53 → ms 1266,1433,1600,1766
#   price ticks every 12f starting at f=12 in scene → f=42,54,66,78,90,102,114,126
#     → absolute ms: 1400,1800,2200,2600,3000,3400,3800,4200
#   leader highlight at f=140 in scene → absolute 170 → ms 5666
#   scrolling tape: faint rhythmic tick under (4 per second)
# 210-270  Clip "MARKETS OPEN"             7000–9000ms    whoosh at 6966
# 270-420  OddsBoard (150f)                9000–14000ms
#   intro impact at 9000
#   rows at rowStart=16 + i*12 → f=16,28,40,52,64 in scene → 286,298,310,322,334
#     → absolute ms: 9533,9933,10333,10733,11133
#   pulse coins per row at row+8..16 frames
#   final CTA slam at 270+16+60+8 = 354 → ms 11800
# 420-480  Clip "MARKETS CLOSE"            14000–16000ms  whoosh at 13966
# 480-540  Outro                           16000–18000ms  stinger at 16000
# ============================================================================
echo "→ Building OddsBoard stem..."
CUES_O=(
  "impact.wav@0"
  "riser.wav@0"

  # Row entrances
  "whoosh.wav@1133"
  "flip.wav@1266"
  "flip.wav@1433"
  "flip.wav@1600"
  "flip.wav@1766"
  # Price ticks (9 per player at 12f = every 400ms)
  "tick.wav@1400"
  "tick.wav@1800"
  "tick.wav@2200"
  "tick.wav@2600"
  "tick.wav@3000"
  "tick.wav@3400"
  "tick.wav@3800"
  "tick.wav@4200"
  # Subtle tape rhythm — every ~800ms to feel live
  "tick.wav@2000"
  "tick.wav@2800"
  "tick.wav@3600"
  "tick.wav@4400"
  "tick.wav@5200"
  "tick.wav@6000"
  "tick.wav@6600"
  # Leader gold highlight
  "coin.wav@5666"
  "coin.wav@5900"

  "whoosh.wav@6966"

  "impact.wav@9000"
  # Odds row reveals (5 rows)
  "flip.wav@9533"
  "coin.wav@9600"
  "flip.wav@9933"
  "coin.wav@10000"
  "flip.wav@10333"
  "coin.wav@10400"
  "flip.wav@10733"
  "coin.wav@10800"
  "flip.wav@11133"
  "coin.wav@11200"
  # CTA slam
  "riser.wav@11000"
  "clap.wav@11800"
  "impact.wav@11800"

  "whoosh.wav@13966"

  "stinger.wav@16000"
)
build_stem "$OUT/launch-oddsboard-sfx.mp3" "${CUES_O[@]}"
cp "$OUT/launch-oddsboard-sfx.mp3" "$DEST_O"

echo ""
echo "Done:"
echo "  $DEST_V"
echo "  $DEST_O"

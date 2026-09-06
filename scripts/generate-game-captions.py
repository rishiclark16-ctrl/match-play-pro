#!/usr/bin/env python3
"""Generate caption-instagram.txt + caption-tiktok.txt + post-notes.md for
each game in the 13-betting-games carousel series (v03-v14).

Idempotent — re-run any time to regenerate from the CAPTIONS dict.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

GAMES = [
    ("v03", "skins",      "Skins",       "Win a hole outright. That's a skin. Tie it — it rolls over. Sometimes a single birdie pays the whole round."),
    ("v04", "wolf",       "Wolf",        "Rotating pick. The wolf goes last, watches everyone tee off, and picks a partner — or goes alone for double the points."),
    ("v05", "vegas",      "Vegas",       "Pair your team's two scores into one number (low digit first). The difference is the points. Birdies flip the loser. Eagles flip AND double."),
    ("v06", "stableford", "Stableford",  "Points beat strokes. Bogey 1, par 2, birdie 3, eagle 4. Blow up a hole? Pick up, bank zero, move on. High score wins."),
    ("v07", "best-ball",  "Best Ball",   "Everyone plays their own ball. The team takes the low score per hole. The worse player gets free swings all day."),
    ("v08", "match-play", "Match Play",  "Forget strokes — count holes won. Win a hole go 1 up, lose go 1 down. Impossible to catch = match over. Dormie is real."),
    ("v09", "quota",      "Quota",       "Quota = 36 minus your handicap. Beat it. Birdies pay quadruple. Better golfer gets a harder target — everyone plays their own game."),
    ("v10", "nines",      "Nines",       "Three players. Nine points per hole. Best score = 5, middle = 3, worst = 1. Ties split cleanly. Every hole matters. Also called 5-3-1."),
    ("v11", "defender",   "Defender",    "One vs field. Defender wins outright: +3. Ties: +1 defender. Attackers win: +1 each. Defender rotates every hole. Nobody sits out."),
    ("v12", "sixes",      "Sixes",       "Four players. Three six-hole segments. Partners rotate every segment so everyone partners with everyone. Best ball per team. Also called Round Robin."),
    ("v13", "rabbit",     "Rabbit",      "Win a hole outright — you've got the rabbit. Tie a hole — it escapes. Whoever's holding the rabbit at the turn (and at 18) cashes the pot."),
    ("v14", "prop-bets",  "Prop Bets",   "CTP, greenie, sandie, barkie, snake. The bets that catch the moments the scorecard misses. Stack them on top of your main game."),
]

IG_HASHTAG_BASE = (
    "#golf #golfbetting #{tag} #golfrules #golftips #mensgolf "
    "#matchgolf #golfapp #golflife #golfersofinstagram #golfbuddies "
    "#weekendgolfer #golfgame #golfswing #pga"
)
TT_HASHTAG_BASE = (
    "#golf #golftok #golfbetting #{tag} #golfrules #fyp #golfapp #golfbuddies"
)

SERIES_FOLLOW = (
    "Follow @matchgolf for the full series — 13 betting games, "
    "13 carousels. MATCH runs every format automatically. Auto-press, "
    "real-time scoring, settled to the dollar. Download free — link in bio."
)


def tag_for(slug: str) -> str:
    return slug.replace("-", "")


def ig_caption(name: str, slug: str, hook: str) -> str:
    tag = tag_for(slug)
    return (
        f"{name} in 6 slides. 👇\n\n"
        f"{hook}\n\n"
        f"Save this for the next time someone at the tee says "
        f'"wait, how does {name.lower()} actually work?"\n\n'
        f"{SERIES_FOLLOW}\n\n"
        ".\n.\n.\n\n"
        + IG_HASHTAG_BASE.format(tag=tag)
        + "\n"
    )


def tt_caption(name: str, slug: str, hook: str) -> str:
    tag = tag_for(slug)
    return (
        f"{name} in 6 slides. Save this before your next round.\n\n"
        f"{hook}\n\n"
        f"matchgolf.app — app runs it automatically.\n\n"
        + TT_HASHTAG_BASE.format(tag=tag)
        + "\n"
    )


def post_notes(video_id: str, slug: str, name: str) -> str:
    return f"""# Post Notes — {video_id} {name} Carousel

## Files
- `slide-1.png` through `slide-6.png` — 1080×1350, Instagram portrait 4:5
- `caption-instagram.txt`
- `caption-tiktok.txt`

## Format
Instagram feed carousel (6 slides). Cross-post slide 1 to TikTok, or
convert all 6 to a 12s slideshow video for TikTok native feed.

## Instagram setup
1. New post → Post (not Reel)
2. Select all 6 slides in order: slide-1 → slide-6
3. Paste `caption-instagram.txt`
4. Pin slide 1 as cover
5. First comment: "Swipe through — if your group plays {name}, save this."
6. Best posting time: Tue/Thu 11am–1pm ET (educational content performs best mid-morning)

## TikTok setup
Single image post of slide 1 with caption pointing to IG — OR convert
the 6 slides into a 12-second slideshow (2s per slide). Slideshow video
typically outperforms single image on TikTok.

## Series context
Part of the 13-game educational carousel series. Generated from the
locked `GameCarousel.tsx` template + `gamesData.ts` content. To rerun:

```
bash scripts/render-game-carousels.sh {video_id}
python3 scripts/generate-game-captions.py
```

## Metrics to watch
- Saves (primary — educational content lives or dies on saves)
- Swipe-through rate (aim for >60% completion to slide 6)
- Profile visits from post
- Comments asking about other games — demand signal for the next carousel
"""


def main() -> None:
    for video_id, slug, name, hook in GAMES:
        folder = ROOT / "content" / f"{video_id}-{slug}-carousel"
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "caption-instagram.txt").write_text(ig_caption(name, slug, hook))
        (folder / "caption-tiktok.txt").write_text(tt_caption(name, slug, hook))
        (folder / "post-notes.md").write_text(post_notes(video_id, slug, name))
        print(f"✓ {video_id} {name} → {folder.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""MATCH Golf content log generator.

Rebuilds content/MATCH_Golf_Content_Log.docx from the structured data below.
Run this script any time a new video is added — update the VIDEOS list and
re-run. Keeping the source of truth in code means the doc can be regenerated
deterministically without manually editing a binary file.
"""
from datetime import date
from pathlib import Path

from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "content" / "MATCH_Golf_Content_Log.docx"

GOLD = RGBColor(0xEB, 0xE4, 0x22)
INK = RGBColor(0x0A, 0x0A, 0x0A)
MUTED = RGBColor(0x6B, 0x6B, 0x6B)

VIDEOS = [
    {
        "id": "v01",
        "title": "Winners Play on MATCH",
        "status": "Delivered (v2 — no icon, tightened spacing)",
        "created": "2026-04-15",
        "duration": "8.0s",
        "format": "1080x1920 MP4 (Reel / TikTok)",
        "folder": "content/v01-winners-play-on-match/",
        "concept": (
            "Brand launch cinematic. Positions MATCH as the app for golfers "
            "who bet and compete. Cold open → hook line → scorecard reveal → "
            "rapid montage → wordmark → CTA. Progress bar along bottom edge."
        ),
        "script": [
            ("0.0-0.6s", "Cold open: \"GOLF.\" slam"),
            ("0.6-1.8s", "\"Isn't just a game.\""),
            ("1.8-3.6s", "Scorecard rises: \"It's a bet.\" (gold accent)"),
            ("3.6-4.1s", "Quick cut: money tracker — TRACK"),
            ("4.1-4.7s", "Quick cut: leaderboard — EVERY GAME"),
            ("4.7-5.2s", "Quick cut: settlement — EVERY DOLLAR"),
            ("5.2-6.8s", "Wordmark: \"Winners play MATCH.\""),
            ("6.8-8.0s", "Gold CTA pill + matchgolf.app"),
        ],
        "ig_caption": (
            "Golf isn't just a game. It's a bet. 💸\n\n"
            "MATCH tracks every format — Nassau, Skins, Wolf, Vegas, "
            "Stableford — and settles the money for you. No more napkin "
            "math. No more arguments on the 19th hole.\n\n"
            "Winners play on MATCH. Link in bio."
        ),
        "ig_hashtags": (
            "#golf #golfbetting #nassau #skins #matchgolf #golfing "
            "#golftips #mensgolf #golfapp #golflife #golfreels "
            "#golfbuddies #golfbets #golfsquad #golfersofinstagram"
        ),
        "tt_caption": (
            "POV: your foursome still does math with a pencil ✏️ "
            "meanwhile we're settling 4 games at once 💰\n\n"
            "matchgolf.app"
        ),
        "tt_hashtags": (
            "#golf #golftok #golfbetting #nassau #skins #wolf "
            "#golfbuddies #golfing #fyp #golfapp"
        ),
        "notes": (
            "No baked audio — add cinematic cold/villain-arc sound in "
            "IG/TikTok editor before publishing. Pinned first comment: "
            "\"Currently on iOS → matchgolf.app\". Best slot: Tue/Wed/Thu "
            "11am-1pm ET for Reels, Tue/Thu evening for TikTok."
        ),
    },
    {
        "id": "v02",
        "title": "Nassau, explained in 6 slides",
        "status": "Delivered",
        "created": "2026-04-15",
        "duration": "Instagram carousel (static)",
        "format": "1080x1350 PNG × 6 (IG portrait 4:5)",
        "folder": "content/v02-nassau-carousel/",
        "concept": (
            "Launch of the 13-game educational series. Editorial serif "
            "typography (Fraunces) over near-black + chartreuse palette. "
            "Template locks in for v03-v14. Teaches Nassau rules in 6 "
            "swipeable slides with worked example and CTA."
        ),
        "script": [
            ("Slide 1", "Cover — \"The Golf Bet / Nassau / Explained in 6 slides.\""),
            ("Slide 2", "\"Most people think Nassau is one bet. It's actually three.\""),
            ("Slide 3", "Bet 1 of 3: Win the front 9 (with worked Mike/Dave example)"),
            ("Slide 4", "Bet 2 of 3: Win the back 9 (\"Same rules. Fresh bet.\")"),
            ("Slide 5", "Bet 3 of 3: Total 18 + The Press sidebar"),
            ("Slide 6", "CTA — \"Or you can just let the app run it.\" Gold pill CTA."),
        ],
        "ig_caption": (
            "Nassau is the most-played bet in golf. And half the guys who "
            "play it can't explain it.\n\nHere's the whole thing in 6 slides 👇\n\n"
            "Save this for the next time someone at the tee box says \"wait, "
            "how does the press work?\"\n\nFollow @matchgolf for the rest of "
            "the series — 13 betting games, 13 posts. Next up: Skins.\n\n"
            "MATCH runs every format automatically. Auto-press, real-time "
            "scoring, settled to the dollar. Download free — link in bio."
        ),
        "ig_hashtags": (
            "#golf #golfbetting #nassau #golfrules #golftips #mensgolf "
            "#matchgolf #golfapp #golflife #golfersofinstagram #golfbuddies "
            "#weekendgolfer #golfgame #golfswing #pga"
        ),
        "tt_caption": (
            "Nassau in 6 slides. Save this before your next round.\n\n"
            "matchgolf.app — app runs it automatically (auto-press and all)."
        ),
        "tt_hashtags": (
            "#golf #golftok #golfbetting #nassau #golfrules #fyp #golfapp "
            "#golfbuddies"
        ),
        "notes": (
            "First carousel in the 13-game educational series. Template is "
            "now locked and v03-v14 can be produced in ~15 min each by "
            "swapping content. Best post time: Tue/Thu 11am-1pm ET. First "
            "comment: \"Swipe through — if your group plays Nassau, save "
            "this.\" Also works on Pinterest for evergreen search traffic."
        ),
    },
]

# v03–v14 are generated from the shared GameCarousel template + gamesData.ts.
# Entries below are appended to VIDEOS via a loop so captions stay in sync
# with the generator script (`scripts/generate-game-captions.py`).
GAMES_BATCH = [
    # (id, slug, title, concept_line, script_rules)
    ("v03", "skins", "Skins — explained in 6 slides",
     "Low score wins the skin. Ties roll. Stacked skins on a single birdie.",
     [("Rule 1", "Low score takes the skin (example: Mike birdies, Dave/Paul par)"),
      ("Rule 2", "Ties cancel the skin — nobody wins the hole"),
      ("Rule 3", "Carryover — cancelled skins pile up on the next winning hole")]),
    ("v04", "wolf", "Wolf — explained in 6 slides",
     "Rotating pick. Partner, pass, or go alone (Blind Wolf + catch-up).",
     [("Rule 1", "Tee order picks the wolf — rotation shifts each hole"),
      ("Rule 2", "Pick a partner or pass — Blind Wolf = 2× if you skip everyone"),
      ("Rule 3", "Lone Wolf wins = 4 pts. Catch-up mechanic on holes 17-18.")]),
    ("v05", "vegas", "Vegas — explained in 6 slides",
     "Paired digits (low first). Birdies flip. Eagles flip AND double.",
     [("Rule 1", "Pair team scores low-digit first (45 vs 56 = 11 pts)"),
      ("Rule 2", "Birdie on losing team flips their number"),
      ("Rule 3", "Eagle flips and doubles the whole pot; ties carry over")]),
    ("v06", "stableford", "Stableford — explained in 6 slides",
     "Point-based. Blow-ups don't bury you. Pace-of-play fix.",
     [("Rule 1", "Point table: eagle=4, birdie=3, par=2, bogey=1, double=0"),
      ("Rule 2", "Pick up any time — bank zero, keep moving"),
      ("Rule 3", "Most points wins; Modified Stableford ramps birdies/eagles")]),
    ("v07", "best-ball", "Best Ball — explained in 6 slides",
     "Own ball per player. Team takes the best score per hole.",
     [("Rule 1", "Everyone plays their own ball — low ball sets the team score"),
      ("Rule 2", "Worse player gets free swings (no downside)"),
      ("Rule 3", "Net handicaps apply per hole — Ryder Cup morning format")]),
    ("v08", "match-play", "Match Play — explained in 6 slides",
     "Count holes won, not strokes. Dormie + closeout notation.",
     [("Rule 1", "Win hole +1, lose -1, tie 0"),
      ("Rule 2", "Blowups cost one hole only — no stroke penalty"),
      ("Rule 3", "Dormie = can't catch up; closeout notation (4 and 3)")]),
    ("v09", "quota", "Quota / Chicago — explained in 6 slides",
     "36 − handicap = your target. Birdies quadruple the payout.",
     [("Rule 1", "Quota = 36 − course handicap"),
      ("Rule 2", "Points: eagle=8, birdie=4, par=2, bogey=1"),
      ("Rule 3", "Beat your quota — biggest margin over quota wins")]),
    ("v10", "nines", "Nines (5-3-1) — explained in 6 slides",
     "3 players. 9 points per hole split by finish.",
     [("Rule 1", "Best=5, middle=3, worst=1 (total always 9)"),
      ("Rule 2", "Two-way tie low = 4/4/1. Three-way tie = 3/3/3"),
      ("Rule 3", "No carryover — high total after 18 takes the pot")]),
    ("v11", "defender", "Defender — explained in 6 slides",
     "1-vs-field rotation. Defender always has skin in the game.",
     [("Rule 1", "Defender wins outright = +3"),
      ("Rule 2", "Tie = defender +1, attackers 0"),
      ("Rule 3", "Any attacker wins = +1 each for all attackers")]),
    ("v12", "sixes", "Sixes / Round Robin — explained in 6 slides",
     "4 players, 3 six-hole segments, rotating 2v2 partners.",
     [("Segment 1", "Holes 1-6: A+B vs C+D (best ball)"),
      ("Segment 2", "Holes 7-12: A+C vs B+D"),
      ("Segment 3", "Holes 13-18: A+D vs B+C")]),
    ("v13", "rabbit", "Rabbit — explained in 6 slides",
     "Chase the rabbit. Ties set it free. Two rabbits per round.",
     [("Rule 1", "Win a hole outright — grab the rabbit"),
      ("Rule 2", "Tie a hole — rabbit goes free"),
      ("Rule 3", "Rabbit resets at hole 9 — two pots (front / back)")]),
    ("v14", "prop-bets", "Prop Bets — explained in 6 slides",
     "Side bets the scorecard can't measure. Stacks on top of main game.",
     [("Round 1", "CTP (closest to pin) + greenie (par 3, on in reg, closest)"),
      ("Round 2", "Sandie / barkie / snake"),
      ("Round 3", "Stack on top of Nassau or Skins — independent pots")]),
]

GAMES_HOOKS = {
    "v03": "Low score wins the skin. Ties roll over. Stacked skins on one birdie.",
    "v04": "Rotating pick. Wolf goes last, picks a partner, or goes alone for 2×.",
    "v05": "Paired digits (low first). Birdies flip the loser. Eagles flip and double.",
    "v06": "Points, not strokes. Blow-ups don't bury you. High score wins.",
    "v07": "Own ball per player. Team takes the low ball every hole.",
    "v08": "Win holes, not strokes. Dormie is real. Blowups cost one hole.",
    "v09": "Quota = 36 − handicap. Birdies pay quadruple. Beat your target.",
    "v10": "3 players, 9 points per hole. Best=5, middle=3, worst=1.",
    "v11": "1-vs-field rotation. Defender wins +3, ties favor the defender.",
    "v12": "4 players, 3 segments, rotating partners. Everyone partners with everyone.",
    "v13": "Win outright = grab the rabbit. Tie = set it free. Hold it at 18 to cash.",
    "v14": "CTP, greenie, sandie, barkie, snake. Side bets the scorecard can't measure.",
}


def _build_game_entry(video_id: str, slug: str, title: str, concept: str, rules: list) -> dict:
    folder = f"content/{video_id}-{slug}-carousel/"
    name = title.split(" — ")[0]
    hook = GAMES_HOOKS[video_id]
    tag = slug.replace("-", "")
    return {
        "id": video_id,
        "title": title,
        "status": "Delivered",
        "created": "2026-04-15",
        "duration": "Instagram carousel (static)",
        "format": "1080x1350 PNG × 6 (IG portrait 4:5)",
        "folder": folder,
        "concept": (
            f"{name} carousel in the 13-betting-games series. Generated from "
            f"the locked GameCarousel template + gamesData.ts content. "
            f"Editorial serif typography (Fraunces) on near-black + chartreuse. "
            f"Concept: {concept}"
        ),
        "script": [
            ("Slide 1", f"Cover — \"The Golf Bet / {name} / Explained in 6 slides.\""),
            ("Slide 2", f"Hook — \"{hook}\""),
            *[(f"Slide {i + 3}", f"{label}: {body}") for i, (label, body) in enumerate(rules)],
            ("Slide 6", "CTA — \"Or you can just let the app run it.\" Gold pill CTA."),
        ],
        "ig_caption": (
            f"{name} in 6 slides. 👇\n\n{hook}\n\n"
            f"Save this for the next time someone at the tee says "
            f'"wait, how does {name.lower()} actually work?"\n\n'
            f"Follow @matchgolf for the full series — 13 betting games, 13 carousels. "
            f"MATCH runs every format automatically. Auto-press, real-time scoring, "
            f"settled to the dollar. Download free — link in bio."
        ),
        "ig_hashtags": (
            f"#golf #golfbetting #{tag} #golfrules #golftips #mensgolf "
            f"#matchgolf #golfapp #golflife #golfersofinstagram #golfbuddies "
            f"#weekendgolfer #golfgame #golfswing #pga"
        ),
        "tt_caption": (
            f"{name} in 6 slides. Save this before your next round.\n\n"
            f"{hook}\n\nmatchgolf.app — app runs it automatically."
        ),
        "tt_hashtags": (
            f"#golf #golftok #golfbetting #{tag} #golfrules #fyp #golfapp #golfbuddies"
        ),
        "notes": (
            "Generated via shared GameCarousel template. To re-render: "
            f"bash scripts/render-game-carousels.sh {video_id}. "
            "Best post time: Tue/Thu 11am-1pm ET. First comment: "
            f'"Swipe through — if your group plays {name}, save this."'
        ),
    }


for _g in GAMES_BATCH:
    VIDEOS.append(_build_game_entry(*_g))


PIPELINE = [
    ("v15", "iMessage Hijack Reel", "Pattern 1 from ad library: group chat argument → MATCH settles it. Highest-unlock concept from the ad study."),
    ("v16", "Game Name Slam Reel", "Pattern 3: hard type-slam of all 13 game names, pulls out to app running all"),
    ("v17", "AI Custom Game Builder", "Feature reel for /07-ai-game-builder screen — describe any game in plain English"),
]


def add_heading(doc, text, size=28, color=INK, bold=True, after=6):
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.font.size = Pt(size)
    run.font.color.rgb = color
    run.bold = bold
    p.paragraph_format.space_after = Pt(after)
    return p


def add_body(doc, text, size=11, color=INK, bold=False, italic=False):
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.font.size = Pt(size)
    run.font.color.rgb = color
    run.bold = bold
    run.italic = italic
    return p


def add_kv(doc, key, value):
    p = doc.add_paragraph()
    k = p.add_run(f"{key}: ")
    k.bold = True
    k.font.size = Pt(11)
    v = p.add_run(value)
    v.font.size = Pt(11)
    return p


def build():
    doc = Document()

    # Global font tweak
    style = doc.styles["Normal"]
    style.font.name = "Helvetica Neue"
    style.font.size = Pt(11)

    # Cover
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title.add_run("MATCH GOLF")
    run.bold = True
    run.font.size = Pt(36)
    run.font.color.rgb = INK

    sub = doc.add_paragraph()
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = sub.add_run("Content Log")
    r.font.size = Pt(20)
    r.font.color.rgb = GOLD
    r.bold = True

    meta = doc.add_paragraph()
    meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = meta.add_run(f"Last updated: {date.today().isoformat()}   ·   Platforms: Instagram Reels, TikTok")
    r.font.size = Pt(10)
    r.font.color.rgb = MUTED

    doc.add_paragraph()

    # Index
    add_heading(doc, "Index", size=18)
    for v in VIDEOS:
        add_body(doc, f"• {v['id']} — {v['title']}  ({v['status']})")
    for pid, ptitle, _ in PIPELINE:
        add_body(doc, f"• {pid} — {ptitle}  (Planned)", color=MUTED)

    doc.add_page_break()

    # Per-video
    for v in VIDEOS:
        add_heading(doc, f"{v['id']} — {v['title']}", size=22)
        add_kv(doc, "Status", v["status"])
        add_kv(doc, "Created", v["created"])
        add_kv(doc, "Duration", v["duration"])
        add_kv(doc, "Format", v["format"])
        add_kv(doc, "Folder", v["folder"])

        doc.add_paragraph()
        add_heading(doc, "Concept", size=14)
        add_body(doc, v["concept"])

        doc.add_paragraph()
        add_heading(doc, "Script / Shot list", size=14)
        for timing, action in v["script"]:
            p = doc.add_paragraph()
            t = p.add_run(f"{timing}  ")
            t.bold = True
            t.font.color.rgb = GOLD
            t.font.size = Pt(10)
            a = p.add_run(action)
            a.font.size = Pt(11)

        doc.add_paragraph()
        add_heading(doc, "Instagram caption", size=14)
        add_body(doc, v["ig_caption"])
        add_body(doc, v["ig_hashtags"], color=MUTED, italic=True)

        doc.add_paragraph()
        add_heading(doc, "TikTok caption", size=14)
        add_body(doc, v["tt_caption"])
        add_body(doc, v["tt_hashtags"], color=MUTED, italic=True)

        doc.add_paragraph()
        add_heading(doc, "Notes", size=14)
        add_body(doc, v["notes"], italic=True)

        doc.add_page_break()

    # Pipeline
    add_heading(doc, "Upcoming Pipeline", size=22)
    for pid, ptitle, pdesc in PIPELINE:
        add_heading(doc, f"{pid} — {ptitle}", size=14)
        add_body(doc, pdesc, color=MUTED)
        doc.add_paragraph()

    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(OUT)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    build()

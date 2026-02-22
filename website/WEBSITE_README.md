# 3 of Spades — Championship Tracker Website

A React + Vite web application that visualises all tournament data from this repository.
It imports directly from `utils/` — no manual porting — so any change to the core logic
is automatically reflected the next time `process_data.py` is run.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Charts | Recharts |
| Routing | Wouter |
| Build | Vite 7 |
| Package manager | pnpm |

---

## Pages

| Page | Route | Description |
|---|---|---|
| Dashboard | `/` | Hero, current rankings, rating history chart, all-time stats |
| Rankings | `/rankings` | Full player cards, win-rate chart, radar profiles |
| Tournaments | `/tournaments` | All 28 tournaments, filterable by type, most-recent-first |
| Tournament Detail | `/tournaments/:id` | Standings, timeseries, win-ratio, pair/trio stats, bid & won, post-tournament leaderboard |
| Head to Head | `/head-to-head` | Interactive pair selector, per-tournament breakdown, all-rivalry cards |

---

## How to Add a New Tournament

**Step 1 — Add the CSV**

Drop the score file into `tourney_data/raw_scores/` following the naming convention:
```
championship_9.csv
mini_championship_8.csv
tiny_championship_10.csv
international_friendly_5.csv
```

**Step 2 — Register it in `utils/constants.py`**

Append the new entry to `TOURNAMENT_LIST_CHRONOLOGICAL` (last item = most recent):
```python
TOURNAMENT_LIST_CHRONOLOGICAL = [
    ...
    (TournamentTypes.CHAMPIONSHIP, 9),  # ← add here
]
```

**Step 3 — Regenerate the data**

Run from the **repo root** (not from `website/`):
```bash
python process_data.py
```

This produces `website/client/public/game_data.json` with updated Elo ratings,
standings, pairwise stats, trio stats, bid & won, and career stats for all players.

**Step 4 — Preview locally**

```bash
cd website
pnpm install   # first time only
pnpm dev
```

Open `http://localhost:5173` to verify the new tournament appears correctly.

**Step 5 — Commit and push**

```bash
git add tourney_data/raw_scores/championship_9.csv
git add utils/constants.py
git add website/client/public/game_data.json
git commit -m "Add Championship #9"
git push
```

> **Note:** `game_data.json` is gitignored by default to keep the repo lightweight.
> If you want to commit it so the deployed site updates automatically on push,
> remove `client/public/game_data.json` from `website/.gitignore`.

---

## Core Player Threshold

Any player with **more than 200 total games** across all tournaments is automatically
classified as a "core player" and appears in the global Elo leaderboard, rating history
chart, and all-time stats. Players below this threshold are shown as guests in the
tournaments they participated in, but do not appear in the global rankings.

Current core players (as of the last run): Akash, Nats, Prateek, Abhi, Ani, Naati, Skanda.

To change the threshold, edit `CORE_PLAYER_GAME_THRESHOLD` in `process_data.py`.

---

## Rating System

The Elo-style rating system is identical to `utils/ranking_system.py` (`UniversalRatingSystem`).
`process_data.py` calls `urs.addTournamentData(tournament)` directly — there is no manual port.

Key parameters:
- **Base rating:** 1000
- **Denominator:** 200
- **Championship / Friendly weight:** 1.0
- **Mini / Tiny Championship weight:** 0.75

---

## Local Development

```bash
cd website
pnpm install
pnpm dev        # starts Vite dev server on http://localhost:5173
pnpm build      # production build → website/dist/
```

---

## Deploying

The site is hosted on [Manus](https://manus.im). To deploy:
1. Run `python process_data.py` from the repo root
2. Open the Manus project and click **Publish** in the Management UI

Alternatively, the `website/` directory is a standard Vite project and can be deployed
to any static hosting provider (Vercel, Netlify, Cloudflare Pages, etc.) by pointing
the build command to `pnpm build` and the output directory to `dist/`.

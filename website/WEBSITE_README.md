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
| Tournaments | `/tournaments` | All tournaments, filterable by type, most-recent-first |
| Tournament Detail | `/tournaments/:id` | Standings, timeseries, win-ratio, pair/trio stats, bid & won, post-tournament leaderboard |
| Head to Head | `/head-to-head` | Interactive pair selector, per-tournament breakdown, all-rivalry cards |

---

## How to Add a New Tournament

See [`AGENTS.md`](../AGENTS.md) at the repo root for the full guide — CSV column
contract, the files to touch, and the known traps. The short version:

**Step 1 — Add the CSV**

Drop the score file into `tourney_data/raw_scores/` following the naming convention:
```
championship_9.csv
mini_championship_8.csv
tiny_championship_10.csv
international_friendly_5.csv
```

**Step 2 — Register it in `utils/constants.py`**

Append the new entry to `TOURNAMENT_LIST_CHRONOLOGICAL` (last item = most recent).
Order matters: Elo is computed by walking this list in sequence.
```python
TOURNAMENT_LIST_CHRONOLOGICAL = [
    ...
    (TournamentTypes.CHAMPIONSHIP, 9),  # ← add here
]
```

**Step 3 — Add a row to `tourney_data/metadata.csv`**

This drives the display name, location, flag, and dates on the site. The `id` must
match the CSV filename without `.csv`:
```
id,name,location,flag,dates,year
championship_9,My Tournament Name,London,🇬🇧,"March 1-3rd",2026
```

**Step 4 — Regenerate the data**

Run from the **repo root** (not from `website/`):
```bash
pip install -r requirements.txt   # first time only
python3 website/process_data.py
```

This produces `website/client/public/game_data.json` with updated Elo ratings,
standings, pairwise stats, trio stats, bid & won, and career stats for all players.
Check the console output — your tournament should appear with the right player count,
game count, and winner.

> Run `website/process_data.py`, **not** the `process_data.py` at the repo root. The
> root copy is stale: it hardcodes `/home/ubuntu/...` paths and carries its own frozen
> tournament list.

**Step 5 — Preview locally**

```bash
cd website
pnpm install   # first time only
pnpm dev
```

Open `http://localhost:3000` to verify the new tournament appears correctly.

**Step 6 — Commit and push**

```bash
git add tourney_data/raw_scores/championship_9.csv
git add tourney_data/metadata.csv
git add utils/constants.py
git commit -m "Add Championship #9"
git push
```

> **Note:** `game_data.json` is gitignored and must **not** be committed. Netlify
> regenerates it on every deploy by running `process_data.py` as part of the build,
> so pushing the three source files above is enough to update the live site.

---

## Core Player Threshold

Any player with **more than 200 total games** across all tournaments is automatically
classified as a "core player" and appears in the global Elo leaderboard, rating history
chart, and all-time stats. Players below this threshold are shown as guests in the
tournaments they participated in, but do not appear in the global rankings.

Current core players (as of the last run): Akash, Nats, Prateek, Abhi, Ani, Naati, Skanda.

To change the threshold, edit `CORE_PLAYER_GAME_THRESHOLD` in `website/process_data.py`.

---

## Rating System

The Elo-style rating system matches `utils/ranking_system.py` (`UniversalRatingSystem`).
`website/process_data.py` imports `getAdjustmentMultiplier`, `BASE_RATING`, and
`DENOMINATOR` from that module and replicates its per-game loop, rather than calling
`UniversalRatingSystem` itself — it needs pre/post rating snapshots and milestone deltas
for the website, which that class doesn't expose. The maths is the same; see the comment
at `website/process_data.py:291`.

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
pnpm dev        # starts Vite dev server on http://localhost:3000
pnpm build      # production build → website/dist/public
```

The dev server uses `strictPort: false`, so if 3000 is busy Vite will pick the next
free port — check the console output for the actual URL.

If you're only changing the frontend, you still need `game_data.json` to exist. Generate
it once from the repo root with `python3 website/process_data.py`.

---

## Deploying

The site is hosted on **Netlify** and deploys automatically — pushing to `main` triggers
a build. No manual publish step.

The build is defined in [`netlify.toml`](../netlify.toml) at the repo root:

```toml
[build]
  base = "."
  command = "pip install -r requirements.txt && python3 website/process_data.py && cd website && pnpm install && pnpm run build"
  publish = "website/dist/public"
```

Netlify runs `process_data.py` as part of every build, which is why `game_data.json`
is gitignored — the deployed site always regenerates it from the CSVs in
`tourney_data/`. The build runs from the repo root so the script can reach both
`tourney_data/` and `utils/`.

The `website/` directory is otherwise a standard Vite project and can be deployed to any
static host by pointing the build command at `pnpm build` and the publish directory at
`dist/public`.

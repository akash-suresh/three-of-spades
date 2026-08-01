# AGENT.md — Updating tournament scores

Guide for an AI agent asked to **add a new tournament** or **fix scores in an existing
one**. Read this plus the file table below; you do not need to read the notebooks.

## What this repo is

A card-game (3 of Spades) record keeper. Raw per-hand scores live as CSVs; a Python
pipeline derives Elo ratings, standings, and head-to-head stats into a JSON file that a
React dashboard renders. Jupyter notebooks are a separate, per-tournament analysis view.

## The data contract

One CSV per tournament: `tourney_data/raw_scores/<type>_<n>.csv`. One **row per hand**.

```
Bidder,Nats,Prateek,Akash,Discard,Margin
Prateek,200,0,220,25,30
```

- **Player columns** — any column that is *not* `Bidder`, `Discard`, `Margin`, or
  `Game ID`. Player names come from the CSV header, so they must be spelled
  **identically to every other CSV** (`Akash`, `Prateek`, `Nats`, `Abhi`, `Ani`,
  `Naati`). A typo silently creates a new player.
- **A score `> 0` means that player was on the winning side of that hand**; `0` means
  they lost it. That is the only thing the win-rate and pairwise math looks at.
- **`Bidder`, `Discard`, `Margin` are optional** and vary by era — `championship_1.csv`
  has none of them, `mini_championship_9.csv` has `Bidder` + `Margin` but no `Discard`.
  Match the shape of the tournament you are editing; don't add columns to old files.
- `Bidder` must be one of the player column names. Its presence is what enables named
  bid stats (`hasBidderData`); without it the pipeline falls back to a heuristic.
- **Tournament winner is derived, never written down**: highest total points wins. Ties
  produce a `winners` array. Do not try to record a winner anywhere.

Valid types: `championship`, `mini_championship`, `tiny_championship`,
`international_friendly`. Championship and Friendly carry Elo weight 1.0; Mini and Tiny
carry 0.75.

## Files to touch

| File | Change |
|---|---|
| `tourney_data/raw_scores/<type>_<n>.csv` | The scores themselves |
| `tourney_data/metadata.csv` | One row: `id,name,location,flag,dates,year` — `id` **must** equal the CSV filename without `.csv` |
| `utils/constants.py` → `TOURNAMENT_LIST_CHRONOLOGICAL` | Append `(TournamentTypes.X, n)` **in chronological order** |

That is the whole change for a new tournament — see commit `c2b14e6` ("added tiny 17"),
which touched exactly these three files. For a **score correction**, only the CSV changes.

Ordering in `TOURNAMENT_LIST_CHRONOLOGICAL` is not cosmetic: Elo is computed by walking
that list in sequence, so inserting a tournament in the wrong slot silently changes every
subsequent rating.

## Steps

1. Write/edit the CSV. Keep the header identical to the tournament's existing shape.
2. Add the `metadata.csv` row (new tournaments only). Quote `dates` if it contains a
   comma: `"March 1-3rd"`.
3. Append to `TOURNAMENT_LIST_CHRONOLOGICAL` in `utils/constants.py` (new tournaments only).
4. Verify (below).
5. Commit. Do **not** open a PR unless asked.

## Verify

```bash
pip install -r requirements.txt      # numpy, pandas, matplotlib
python3 website/process_data.py      # ~4s
```

Expect a per-tournament line, then final rankings. Confirm your tournament appears with
the right player count, hand count, and winner:

```
Processed tiny_championship_17: 3 players, 69 games, winner: Akash
...
Total tournaments: 38
```

Sanity check that the total went up by one, and that Elo for uninvolved players did not
move if you only appended to the end of the list.

Consistency check for metadata drift:

```bash
python3 -c "
import csv,os
ids={r['id'] for r in csv.DictReader(open('tourney_data/metadata.csv'))}
files={f[:-4] for f in os.listdir('tourney_data/raw_scores') if f.endswith('.csv')}
print('missing csv:', sorted(ids-files)); print('missing metadata:', sorted(files-ids))
"
```

Both lists must be empty.

## Traps

- **Run `website/process_data.py`, not the root `process_data.py`.** The root copy is
  stale and dead: it hardcodes `/home/ubuntu/...` paths and carries its own frozen
  tournament list that stops at `international_friendly_4`. `netlify.toml` builds with
  `python3 website/process_data.py`. (The README still points at the root file — it is
  wrong.)
- **`game_data.json` is generated, gitignored, and must not be committed.** Netlify
  regenerates it on every deploy. If you want to inspect it, write it elsewhere:
  `python3 website/process_data.py /tmp/game_data.json`.
- **Regenerating notebooks is optional and expensive.** `notebook_gen.ipynb` re-executes
  *every* tournament notebook from `template.ipynb`, rewriting ~40 files of ~250KB each.
  Only run it when `template.ipynb` itself changed. A score update does not need it.
- **The `Players` enum in `utils/constants.py` is currently unused by any code path.**
  Player identity comes from CSV headers. Adding a new player there changes nothing
  functionally — but update it anyway so the enum and `tourney_data/nomenclature.md`
  stay honest.
- Blank score cells coerce to `0`, which reads as "lost this hand". Write explicit `0`s.

# three-of-spades
## Past tournaments and winners 
[wiki-link](https://github.com/akash-suresh/three-of-spades/wiki)

## Championship Tracker Website
A live web dashboard tracking Elo ratings, tournament standings, head-to-head stats, and more.
The site is powered by [`website/process_data.py`](./website/process_data.py), which imports directly from `utils/` and outputs the data file consumed by the website.
See [`website/WEBSITE_README.md`](./website/WEBSITE_README.md) for full setup and local development instructions.

> **Adding scores?** [`AGENTS.md`](./AGENTS.md) is the detailed guide — CSV column
> contract, the exact files to touch, how to verify, and the known traps. Written for AI
> coding agents, but it reads fine for humans too.

## Creating new tournament notebook
1. Add tournament scores in csv format into [tourney_data/raw_scores](https://github.com/akash-suresh/three-of-spades/tree/main/tourney_data/raw_scores). (follow same naming convention for the csv file as earlier tournaments)
2. Add tournament entry in [TOURNAMENT_LIST_CHRONOLOGICAL](https://github.com/akash-suresh/three-of-spades/blob/main/utils/constants.py#L79) list — **in chronological order**, since Elo is computed by walking this list in sequence.
3. Add a row to [`tourney_data/metadata.csv`](https://github.com/akash-suresh/three-of-spades/blob/main/tourney_data/metadata.csv) with the tournament's display name, location, flag emoji, dates, and year:
   ```
   id,name,location,flag,dates,year
   championship_9,My Tournament Name,London,🇬🇧,"March 1-3rd",2026
   ```
   The `id` must match the CSV filename (e.g. `championship_9.csv` → `championship_9`).
4. _(Optional)_ Run the notebook — [notebook_gen.ipynb](https://github.com/akash-suresh/three-of-spades/blob/main/notebook_gen.ipynb) — to generate all tournament notebooks. Note this re-executes **every** notebook, not just the new one, and rewrites ~40 large files. Notebooks haven't been generated since `tiny_championship_9`; the website is the live view now.
5. Verify the data pipeline picks up the new tournament:
   ```bash
   pip install -r requirements.txt
   python3 website/process_data.py
   ```
   This recomputes Elo ratings, standings, pairwise stats, trio stats, bid & won, and career stats, and writes `website/client/public/game_data.json`. Check that your tournament appears in the output with the right player count, game count, and winner.

   `game_data.json` is **generated and gitignored — don't commit it.** Netlify regenerates it on every deploy ([`netlify.toml`](./netlify.toml)).
6. Commit the CSV, `metadata.csv`, and `constants.py` changes, then raise a Pull request!


## Adding additional analysis
1. Create a new branch.
2. Make changes to `template.ipynb`.
3. Run the notebook — [notebook_gen.ipynb](https://github.com/akash-suresh/three-of-spades/blob/main/notebook_gen.ipynb) — to generate all tournament notebooks!
4. Commit and raise a Pull request!
# three-of-spades
## Past tournaments and winners 
[wiki-link](https://github.com/akash-suresh/three-of-spades/wiki)

## Championship Tracker Website
A live web dashboard tracking Elo ratings, tournament standings, head-to-head stats, and more.
The site is powered by [`process_data.py`](./process_data.py), which imports directly from `utils/` and outputs the data file consumed by the website.
See [`website/WEBSITE_README.md`](./website/WEBSITE_README.md) for full setup and local development instructions.

## Creating new tournament notebook
1. Add tournament scores in csv format into [tourney_data/raw_scores](https://github.com/akash-suresh/three-of-spades/tree/main/tourney_data/raw_scores). (follow same naming convention for the csv file as earlier tournaments)
2. Add tournament entry in [TOURNAMENT_LIST_CHRONOLOGICAL](https://github.com/akash-suresh/three-of-spades/blob/main/utils/constants.py#L52) list.
3. Run the notebook — [notebook_gen.ipynb](https://github.com/akash-suresh/three-of-spades/blob/main/notebook_gen.ipynb) — to generate all tournament notebooks!
4. Run the data pipeline to update the website:
   ```bash
   python process_data.py
   ```
   This regenerates `website/client/public/game_data.json` with updated Elo ratings, standings, pairwise stats, trio stats, bid & won, and career stats.
5. Commit and raise a Pull request!


## Adding additional analysis
1. Create a new branch.
2. Make changes to `template.ipynb`.
3. Run the notebook — [notebook_gen.ipynb](https://github.com/akash-suresh/three-of-spades/blob/main/notebook_gen.ipynb) — to generate all tournament notebooks!
4. Commit and raise a Pull request!
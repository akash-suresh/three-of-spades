# 3 of Spades Tracker — Todo List

## Pending (User Action Required)

- [ ] **Add tournament dates** — Add a `date` field to each tournament's CSV or a separate dates lookup file. Once done, the site can display when each tournament was played and show a proper timeline.

## Feature Ideas

- [ ] **"Latest" badge** — Add a small "Latest" pill to the most recent tournament card on the Tournaments page
- [ ] **Career Stats page** — Dedicated page showing each player's all-time bid success rate, career streaks, total Fivples/Tenples/FiveMottes (data already in the JSON via `careerStats`)
- [ ] **Player profile pages** — Clicking a player name opens a dedicated page with their full tournament history, best/worst performances, and streaks
- [ ] **Mobile sidebar** — Slide-in drawer with hamburger toggle for a better phone experience
- [ ] **Export to GitHub** — Push project to GitHub repo via Settings → GitHub in the Management UI

## Completed

- [x] Build initial website with Dashboard, Rankings, Tournaments, Head-to-Head pages
- [x] Implement Elo-style per-game rating system from `ScoreOverTime.ipynb`
- [x] Fix standings denominator to match notebook (TotalGames = all rounds, same for all players)
- [x] Add Win Ratio Over Time chart to Tournament Detail page
- [x] Add Pair Performance section (same-team stats with Wins + Losses + AvgPoints)
- [x] Add Trio Performance section (3-player combination stats)
- [x] Add Bid & Won section to Tournament Detail page
- [x] Add Post-Tournament Leaderboard with Elo rating changes, rank movement, streaks, Fivples/Tenples/FiveMottes
- [x] Display tournaments most-recent-first on Tournaments page

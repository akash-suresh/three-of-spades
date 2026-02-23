# 3 of Spades Tracker — Todo List

## Pending (User Action Required)

- [ ] **Add tournament dates** — Add a `date` field to each tournament's CSV or a separate dates lookup file. Once done, the site can display when each tournament was played and show a proper timeline.

## Feature Ideas

- [ ] **#3 — Bid & Won: add denominator context** — Show "8 bids won out of X total bids" rather than a raw count. The `bidAndWonPct` field exists in the snapshot; total bids attempted needs to be surfaced from the data pipeline (bid attempts vs. bid wins).

- [x] **#5 — Overall Rankings table: collapse streak/milestone columns** — The table has 11 columns and overflows on normal viewports. Collapse Win Streak, Loss Streak, Fivples, Tenples, FiveMottes into a single "Milestones" cell showing compact badges, e.g. 🔥×14 ⚡×1 💀×4.

- [ ] **Biggest Rivalry card** — 5th highlight card on the tournament detail page showing the most evenly contested pair (closest to 50/50 win rate with high game count), as a counterpart to Best Pair.

- [ ] **Tournaments list filter** — Filter bar on the Tournaments list page (28+ entries) by tournament type (Championship / Friendly / Special) or by winner.

- [ ] **Comeback badge on Tournaments list** — Small "comeback" tag next to any tournament in the list where the winner trailed at the midpoint.

- [ ] **Wiki-style tournament history page** — Create a dedicated page (or section on the Tournaments page) that mirrors the GitHub wiki layout: a rich table per tournament type (Championships, Mini, Tiny, Friendlies) with columns for #, Name, Location 🏴, Dates, Year, #Games, Champion 🏆, Second, Third, Other players. Include trophy counts next to player names (e.g. "Akash 🏆6") and emoji flags for location. Data for names, locations, and dates will need to be sourced from the wiki or added to the data pipeline.

- [ ] **More tournament widgets** — Build additional per-tournament widgets: biggest winning margin per round, most dominant game (highest single-round score), longest win/loss streak within the tournament, score distribution histogram, and a "momentum" chart showing rolling win rate across the tournament.

- [ ] **Fix Head-to-Head page data representation** — The current H2H page has display issues. Review the pairwise data structure (same-team stats, not direct matchups), fix the rivalry cards and per-tournament breakdown chart, and ensure the matchup selector correctly reflects who played together vs. against each other.

- [ ] **"Latest" badge** — Add a small "Latest" pill to the most recent tournament card on the Tournaments page
- [ ] **Career Stats page** — Dedicated page showing each player's all-time bid success rate, career streaks, total Fivples/Tenples/FiveMottes (data already in the JSON via `careerStats`)
- [ ] **Player profile pages** — Clicking a player name opens a dedicated page with their full tournament history, best/worst performances, and streaks
- [ ] **Mobile sidebar** — Slide-in drawer with hamburger toggle for a better phone experience
- [ ] **GitHub Actions CI/CD** — Add `.github/workflows/deploy-website.yml` and `requirements.txt` to the repo. The workflow runs `python process_data.py` → `pnpm build` → deploys to Cloudflare Pages on every push to `main`. Requires two GitHub Secrets: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. See the workflow file content in the conversation history.
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

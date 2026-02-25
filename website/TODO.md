# 3 of Spades Tracker — Todo List

## Pending (User Action Required)

- [ ] **Add tournament dates** — Add a `date` field to each tournament's CSV or a separate dates lookup file. Once done, the site can display when each tournament was played and show a proper timeline.

## Feature Ideas

- [ ] **Bid & Won: add denominator context** — Show "8 bids won out of X total bids" rather than a raw count.

- [ ] **Biggest Rivalry card** — 5th highlight card on the tournament detail page showing the most evenly contested pair (closest to 50/50 win rate with high game count), as a counterpart to Best Pair.

- [ ] **"Latest" badge** — Add a small "Latest" pill to the most recent tournament card on the Tournaments page.

- [ ] **Wiki-style tournament history page** — Rich table per type (Championships, Mini, Tiny, Friendlies) with columns for #, Name, Location, Dates, Year, #Games, Champion, Second, Third, Other players.

- [ ] **GitHub Actions CI/CD** — Add `.github/workflows/deploy-website.yml` and `requirements.txt`. Workflow: `python process_data.py` → `pnpm build` → deploy. Requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets.

## Completed

- [x] Build initial website with Dashboard, Rankings, Tournaments, Head-to-Head pages
- [x] Implement Elo-style per-game rating system from `ScoreOverTime.ipynb`
- [x] Fix standings denominator to match notebook
- [x] Add Win Ratio Over Time chart to Tournament Detail page
- [x] Add Pair Performance and Trio Performance sections
- [x] Add Bid & Won section to Tournament Detail page
- [x] Add Post-Tournament Leaderboard with Elo rating changes, rank movement, streaks, milestones
- [x] Display tournaments most-recent-first on Tournaments page
- [x] Overall Rankings table: collapse streak/milestone columns into badges
- [x] Rebuild Head-to-Head page with clearer W–L layout
- [x] Bid stats: bidAttempts/bidWins/bidWinRate in pipeline and UI
- [x] Milestone Achievements section on tournament detail pages
- [x] Career Stats page
- [x] Player Profile pages
- [x] Display numbering uses CSV filename numbers (TC#11 not TC#10)
- [x] Best Bid Rate hero card requires ≥10 attempts
- [x] Low-sample bid rates show attempt count instead of ~75%* asterisk
- [x] Dashboard Rating History shows full 34-tournament history
- [x] Career Stats Win Rate & Bid Rate bar charts render with player colours
- [x] Player Profile chart x-axis: C#1, TC#7 instead of T2/T4/T6

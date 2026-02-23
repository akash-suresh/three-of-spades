"""
process_data.py — Generates game_data.json for the 3 of Spades tracker website.

All logic is ported directly from the utils/ source code in the GitHub repo:
  - data_preprocessor.py  → load CSV, build timeseries (CumSum, WinRatio)
  - data_cruncher.py       → get_player_stats, get_pairwise_stats, get_tri_stats, get_bid_and_won_stats
  - ranking_system.py      → UniversalRatingSystem (Elo-style per-game)
  - Player.py              → PlayerProfile (streaks, Fivples, Tenples, FiveMottes, bidAndWon)
  - constants.py           → TOURNAMENT_LIST_CHRONOLOGICAL, weights
"""

import pandas as pd
import numpy as np
import json
import os
import copy

DATA_DIR = "/home/ubuntu/tourney_data"

# ── Constants (mirrors constants.py) ─────────────────────────────────────────

NON_PLAYER_COLS = {"Bidder", "Discard", "Margin", "Game ID"}

PLAYER_NAME_MAP = {}  # No name merging — Naati and Nats are separate people

CORE_PLAYER_GAME_THRESHOLD = 200  # Players with > this many total games are "core"
CORE_PLAYERS = []  # Populated dynamically in main() after counting games


def compute_core_players():
    """First pass: count total games per player across all CSVs, return those >200."""
    game_counts = {}
    for tourney_type, number in TOURNAMENT_LIST_CHRONOLOGICAL:
        raw_df, players = load_tournament_raw(tourney_type, number)
        if raw_df is None:
            continue
        n_games = len(raw_df)
        for p in players:
            game_counts[p] = game_counts.get(p, 0) + n_games
    core = sorted(
        [p for p, count in game_counts.items() if count > CORE_PLAYER_GAME_THRESHOLD],
        key=lambda p: -game_counts[p]
    )
    print(f"\nDynamic CORE_PLAYERS (>{CORE_PLAYER_GAME_THRESHOLD} games):")
    for p in core:
        print(f"  {p}: {game_counts[p]} games")
    others = {p: c for p, c in game_counts.items() if p not in core}
    if others:
        print(f"  Guests: {', '.join(f'{p}({c})' for p, c in sorted(others.items(), key=lambda x: -x[1]))}")
    return core

TOURNAMENT_LIST_CHRONOLOGICAL = [
    ("championship", 1),
    ("championship", 2),
    ("championship", 3),
    ("championship", 4),
    ("championship", 5),
    ("mini_championship", 1),
    ("championship", 6),
    ("championship", 7),
    ("international_friendly", 1),
    ("mini_championship", 2),
    ("championship", 8),
    ("mini_championship", 3),
    ("international_friendly", 2),
    ("tiny_championship", 1),
    ("mini_championship", 4),
    ("tiny_championship", 2),
    ("tiny_championship", 3),
    ("tiny_championship", 4),
    ("tiny_championship", 5),
    ("mini_championship", 5),
    ("mini_championship", 6),
    ("international_friendly", 3),
    ("tiny_championship", 6),
    ("tiny_championship", 7),
    ("tiny_championship", 8),
    ("mini_championship", 7),
    ("tiny_championship", 9),
    ("international_friendly", 4),
]

TOURNAMENT_WEIGHTS = {
    "championship": 1.0,
    "mini_championship": 0.75,
    "tiny_championship": 0.75,
    "international_friendly": 1.0,
}

TOURNAMENT_DISPLAY_NAMES = {
    "championship": "Championship",
    "mini_championship": "Mini Championship",
    "tiny_championship": "Tiny Championship",
    "international_friendly": "International Friendly",
}

BASE_RATING = 1000
DENOMINATOR = 200


# ── Data loading (mirrors data_preprocessor.py) ───────────────────────────────

def load_tournament_raw(tourney_type, number):
    """Load CSV, normalise player names, insert Game ID column.
    Returns (raw_df, player_cols) or (None, None) if file missing.
    """
    path = os.path.join(DATA_DIR, f"{tourney_type}_{number}.csv")
    if not os.path.exists(path):
        return None, None

    df = pd.read_csv(path)

    # Naati and Nats are separate players — no merging needed

    # Insert Game ID (1-indexed) as first column — mirrors get_tourney_data_v2
    df.insert(0, "Game ID", np.arange(1, len(df) + 1))

    # Convert player columns to int
    player_cols = [c for c in df.columns if c not in NON_PLAYER_COLS]
    for col in player_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int)

    return df, player_cols


def build_timeseries(raw_df, players):
    """Mirrors get_game_data_as_timeseries() in data_preprocessor.py.
    Adds CumSum_<p>, WinRatio_<p> columns.
    """
    gd = raw_df.copy()
    for p in players:
        gd[f"CumSum_{p}"] = gd[p].cumsum()
        gd[f"{p}_Won"] = (gd[p] > 0).astype(int)
        gd[f"NumGamesWon_{p}"] = gd[f"{p}_Won"].cumsum()
        gd[f"WinRatio_{p}"] = gd[f"NumGamesWon_{p}"] / gd["Game ID"]
    return gd


# ── Player stats (mirrors get_player_stats in data_cruncher.py) ───────────────

def get_player_stats(raw_df, players):
    """
    Mirrors data_cruncher.get_player_stats() exactly:
      - Melt so every player appears in every game row (including 0-score rows)
      - TotalGames = count of all game rows  (= total rounds, same for all players)
      - AvgPoints  = mean over ALL rows (zeros included)
      - WinPercentage = Wins / TotalGames
    """
    melted = raw_df.melt(
        id_vars=["Game ID"],
        value_vars=players,
        var_name="Player",
        value_name="Points",
    )
    melted["Wins"] = (melted["Points"] > 0).astype(int)

    stats = (
        melted.groupby("Player")
        .agg(
            Wins=pd.NamedAgg(column="Wins", aggfunc="sum"),
            TotalGames=pd.NamedAgg(column="Game ID", aggfunc="count"),
            AvgPoints=pd.NamedAgg(column="Points", aggfunc="mean"),
            TotalPoints=pd.NamedAgg(column="Points", aggfunc="sum"),
        )
        .reset_index()
    )
    stats["WinPercentage"] = 100.0 * stats["Wins"] / stats["TotalGames"]
    stats = stats.sort_values(by=["TotalPoints", "Wins"], ascending=False)
    stats = stats.round({"AvgPoints": 1, "WinPercentage": 1})
    return stats


# ── Pairwise stats (mirrors get_pairwise_stats in data_cruncher.py) ───────────

def get_pairwise_stats(raw_df, players, min_num_games=10):
    """
    SAME-TEAM stats: finds games where two players were on the same side
    (both won together OR both lost together).
    Mirrors data_cruncher.get_pairwise_stats() exactly.
    Columns: Player_x, Player_y, Wins, Losses, TotalGames, AvgPoints, WinPercentage
    """
    melted = raw_df.melt(
        id_vars=["Game ID"],
        value_vars=players,
        var_name="Player",
        value_name="Points",
    )
    melted["Result"] = melted["Points"].apply(lambda x: "Win" if x > 0 else "Lose")

    # Self-join on (Game ID, Result) — same side
    result = melted.merge(
        melted, left_on=["Game ID", "Result"], right_on=["Game ID", "Result"], how="inner"
    )
    result = result[result["Player_x"] != result["Player_y"]]
    result = result[result["Player_x"] < result["Player_y"]]
    result["Wins"] = (result["Result"] == "Win").astype(int)
    result["Losses"] = (result["Result"] == "Lose").astype(int)
    result["Points"] = result[["Points_x", "Points_y"]].min(axis=1)

    agg = (
        result.groupby(["Player_x", "Player_y"])
        .agg(
            Wins=pd.NamedAgg(column="Wins", aggfunc="sum"),
            Losses=pd.NamedAgg(column="Losses", aggfunc="sum"),
            TotalGames=pd.NamedAgg(column="Game ID", aggfunc="count"),
            AvgPoints=pd.NamedAgg(column="Points", aggfunc="mean"),
        )
        .reset_index()
    )
    agg["WinPercentage"] = 100.0 * agg["Wins"] / (agg["Wins"] + agg["Losses"])
    agg = agg.round({"AvgPoints": 1, "WinPercentage": 1})
    agg = agg.sort_values(by="WinPercentage", ascending=False)
    agg = agg[agg["TotalGames"] >= min_num_games]
    return agg


# ── Trio stats (mirrors get_tri_stats in data_cruncher.py) ────────────────────

def get_tri_stats(raw_df, players, min_num_games=5):
    """
    SAME-TEAM stats for 3-player combinations.
    Mirrors data_cruncher.get_tri_stats() exactly.
    """
    melted = raw_df.melt(
        id_vars=["Game ID"],
        value_vars=players,
        var_name="Player",
        value_name="Points",
    )
    melted["Result"] = melted["Points"].apply(lambda x: "Win" if x > 0 else "Lose")

    # Triple self-join on (Game ID, Result)
    r = melted.merge(melted, on=["Game ID", "Result"], how="inner")
    r = r.merge(melted, on=["Game ID", "Result"], how="inner")
    r = r.rename(columns={"Player": "Player_z", "Points": "Points_z"})

    # Deduplicate: enforce strict alphabetical order
    r = r[r["Player_x"] != r["Player_y"]]
    r = r[r["Player_y"] != r["Player_z"]]
    r = r[r["Player_x"] != r["Player_z"]]
    r = r[r["Player_x"] < r["Player_y"]]
    r = r[r["Player_y"] < r["Player_z"]]
    r = r[r["Player_x"] < r["Player_z"]]

    r["Wins"] = (r["Result"] == "Win").astype(int)
    r["Losses"] = (r["Result"] == "Lose").astype(int)
    r["Points"] = r[["Points_x", "Points_y", "Points_z"]].min(axis=1)

    agg = (
        r.groupby(["Player_x", "Player_y", "Player_z"])
        .agg(
            Wins=pd.NamedAgg(column="Wins", aggfunc="sum"),
            Losses=pd.NamedAgg(column="Losses", aggfunc="sum"),
            TotalGames=pd.NamedAgg(column="Game ID", aggfunc="count"),
            AvgPoints=pd.NamedAgg(column="Points", aggfunc="mean"),
        )
        .reset_index()
    )
    agg["WinPercentage"] = 100.0 * agg["Wins"] / (agg["Wins"] + agg["Losses"])
    agg = agg.round({"AvgPoints": 1, "WinPercentage": 1})
    agg = agg.sort_values(by="WinPercentage", ascending=False)
    agg = agg[agg["TotalGames"] >= min_num_games]
    return agg


# ── Bid and Won (mirrors get_bid_and_won_stats in data_cruncher.py) ───────────

def get_bid_and_won_stats(raw_df, players):
    """
    Detects bid-and-won rounds using the modulo trick:
      if sum(scores) % max(score) != 0  →  someone bid and won extra
      the player with max score gets credited.
    Mirrors data_cruncher.get_bid_and_won_stats() exactly.
    """
    bid_and_win = {p: 0 for p in players}
    for _, row in raw_df.iterrows():
        scores = row[players]
        total = int(scores.sum())
        max_score = int(scores.max())
        if max_score > 0 and total % max_score != 0:
            winner = scores.idxmax()
            bid_and_win[winner] += 1

    result = (
        pd.DataFrame(list(bid_and_win.items()), columns=["Player", "BidAndWon"])
        .sort_values(by="BidAndWon", ascending=False)
    )
    return result


# ── Elo rating system (mirrors ranking_system.py + Player.py) ─────────────────

class PlayerProfile:
    """Mirrors Player.py — tracks rating, streaks, milestones, bidAndWon."""

    def __init__(self, name, rating=BASE_RATING):
        self.name = name
        self.rating = float(rating)
        self.bidAndWon = 0
        self.bidAttempts = 0   # rounds where this player was the named bidder
        self.bidWins = 0       # rounds where they bid AND scored > 0
        self.careerGames = 0
        self.careerWins = 0
        self.winStreak = 0
        self.bestWinStreak = 0
        self.lossStreak = 0
        self.worstLossStreak = 0
        self.currentTournament = None
        self.numFivles = 0
        self.numTenples = 0
        self.fiveMottes = 0

    def new_tournament_start(self, tourney_key):
        self.currentTournament = tourney_key
        self.winStreak = 0
        self.lossStreak = 0

    def register_game(self, tourney_key, adjusted_points, is_win, bid_and_won=False,
                       is_named_bidder=False, named_bid_won=False):
        if tourney_key != self.currentTournament:
            self.new_tournament_start(tourney_key)
        if is_win:
            self.careerGames += 1
            self.careerWins += 1
            self.rating += adjusted_points
            self.rating = round(self.rating, 2)
            if bid_and_won:
                self.bidAndWon += 1
        else:
            self.careerGames += 1
            self.rating -= adjusted_points
            self.rating = round(self.rating, 2)
        # Track named-bidder stats (only for tournaments with a Bidder column)
        if is_named_bidder:
            self.bidAttempts += 1
            if named_bid_won:
                self.bidWins += 1
        self._record_streaks(is_win)

    def _record_streaks(self, is_win):
        if is_win:
            self.lossStreak = 0
            self.winStreak += 1
            self.bestWinStreak = max(self.winStreak, self.bestWinStreak)
            if self.winStreak == 5:
                self.numFivles += 1
            if self.winStreak == 10:
                self.numTenples += 1
        else:
            self.winStreak = 0
            self.lossStreak += 1
            self.worstLossStreak = max(self.lossStreak, self.worstLossStreak)
            if self.lossStreak == 5:
                self.fiveMottes += 1

    def win_percentage(self):
        return int(100.0 * self.careerWins / self.careerGames) if self.careerGames else 0

    def bid_and_won_percentage(self):
        return int(100.0 * self.bidAndWon / self.careerGames) if self.careerGames else 0

    def bid_win_rate(self):
        """Win rate when the player is the named bidder (None if no bid data)."""
        if self.bidAttempts == 0:
            return None
        return round(100.0 * self.bidWins / self.bidAttempts, 1)

    def snapshot(self):
        return copy.copy(self)


def _get_adjustment_multiplier(rating_diff, weight):
    """Mirrors getAdjustmentMultiplier() in ranking_system.py."""
    winsorized = max(-0.5, min(0.5, rating_diff / BASE_RATING))
    adjustment_factor = 1 - winsorized
    return (weight / DENOMINATOR) * adjustment_factor


def compute_overall_rankings(tournaments_raw):
    """
    Full Elo-style per-game rating system mirroring UniversalRatingSystem.
    Also computes per-tournament pre/post rating snapshots and streak stats.

    Returns:
      rankings          — final sorted list [{player, rating, rank}]
      rating_history    — {player: [rating_after_each_tourney]}
      tourney_snapshots — {tourney_id: {player: {ratingBefore, ratingAfter, rankBefore, rankAfter, ...}}}
      player_profiles   — {player: PlayerProfile} (career stats)
    """
    player_map = {}  # name → PlayerProfile (all players incl. guests)

    def get_profile(name):
        if name not in player_map:
            player_map[name] = PlayerProfile(name)
        return player_map[name]

    rating_history = {p: [float(BASE_RATING)] for p in CORE_PLAYERS}
    tourney_snapshots = {}

    for tourney in tournaments_raw:
        tourney_id = tourney["id"]
        tourney_key = tourney["displayName"]
        weight = TOURNAMENT_WEIGHTS[tourney["type"]]
        players = tourney["players"]

        raw_df = tourney["_raw_df"]

        # Snapshot BEFORE
        before_snapshot = {
            name: prof.snapshot() for name, prof in player_map.items()
        }
        # Ensure all players in this tourney are registered
        for p in players:
            get_profile(p)

        # Determine if this tournament has a named Bidder column
        has_bidder_col = "Bidder" in raw_df.columns

        # Process game by game
        for _, row in raw_df.iterrows():
            winning_team = []
            winning_points = []
            losing_team = []
            named_bidder = str(row["Bidder"]).strip() if has_bidder_col else None

            for p in players:
                score = int(row[p])
                if score > 0:
                    winning_team.append(get_profile(p))
                    winning_points.append(score)
                else:
                    losing_team.append(get_profile(p))

            if not winning_team or not losing_team:
                continue

            avg_win_r = sum(pl.rating for pl in winning_team) / len(winning_team)
            avg_lose_r = sum(pl.rating for pl in losing_team) / len(losing_team)
            rating_diff = avg_win_r - avg_lose_r
            adj_mult = _get_adjustment_multiplier(rating_diff, weight)
            bid = min(winning_points)

            for pl, pts in zip(winning_team, winning_points):
                is_named_bidder = has_bidder_col and (pl.name == named_bidder)
                pl.register_game(tourney_key, pts * adj_mult, is_win=True,
                                  bid_and_won=(pts > bid),
                                  is_named_bidder=is_named_bidder,
                                  named_bid_won=is_named_bidder)  # won = scored > 0
            for pl in losing_team:
                is_named_bidder = has_bidder_col and (pl.name == named_bidder)
                pl.register_game(tourney_key, bid * adj_mult, is_win=False,
                                  is_named_bidder=is_named_bidder,
                                  named_bid_won=False)  # bidder lost this round

        # Snapshot AFTER
        after_snapshot = {
            name: prof.snapshot() for name, prof in player_map.items()
        }

        # Build per-tournament rank-change table (core players only for rank tracking)
        def rank_core(snapshot):
            ranked = sorted(
                [(n, s.rating) for n, s in snapshot.items() if n in CORE_PLAYERS],
                key=lambda x: -x[1]
            )
            return {n: i + 1 for i, (n, _) in enumerate(ranked)}

        before_ranks = rank_core(before_snapshot)
        after_ranks = rank_core(after_snapshot)

        # All players to include in snapshot: core players + guests who played this tournament
        guest_players = [p for p in players if p not in CORE_PLAYERS]
        snapshot_players = CORE_PLAYERS + guest_players

        snap = {}
        for p in snapshot_players:
            if p not in after_snapshot:
                continue
            before_r = before_snapshot.get(p)
            after_r = after_snapshot[p]
            old_rating = int(before_r.rating) if before_r else BASE_RATING
            new_rating = int(after_r.rating)
            rating_change = new_rating - old_rating
            is_guest = p in guest_players
            # Guests don't have a persistent rank in the core leaderboard
            old_rank = before_ranks.get(p, "-") if not is_guest else "-"
            new_rank = after_ranks.get(p, "-") if not is_guest else "-"
            rank_change = (old_rank - new_rank) if isinstance(old_rank, int) and isinstance(new_rank, int) else 0
            snap[p] = {
                "ratingBefore": old_rating,
                "ratingAfter": new_rating,
                "ratingChange": rating_change,
                "rankBefore": old_rank,
                "rankAfter": new_rank,
                "rankChange": rank_change,
                "careerGames": after_r.careerGames,
                "winPct": after_r.win_percentage(),
                "bidAndWonPct": after_r.bid_and_won_percentage(),
                "bidAttempts": after_r.bidAttempts,
                "bidWins": after_r.bidWins,
                "bidWinRate": after_r.bid_win_rate(),
                "bestWinStreak": after_r.bestWinStreak,
                "worstLossStreak": after_r.worstLossStreak,
                "numFivles": after_r.numFivles,
                "numTenples": after_r.numTenples,
                "fiveMottes": after_r.fiveMottes,
                "isGuest": is_guest,
            }
        tourney_snapshots[tourney_id] = snap

        # Append to history
        for p in CORE_PLAYERS:
            prof = player_map.get(p)
            rating_history[p].append(round(prof.rating if prof else BASE_RATING, 1))

    # Final rankings
    sorted_ratings = sorted(
        [(p, player_map.get(p, PlayerProfile(p)).rating) for p in CORE_PLAYERS],
        key=lambda x: -x[1]
    )
    rankings = [
        {"player": p, "rating": round(r, 1), "rank": i + 1}
        for i, (p, r) in enumerate(sorted_ratings)
    ]

    return rankings, rating_history, tourney_snapshots, player_map


# ── Main tournament processing ────────────────────────────────────────────────

def process_all_tournaments():
    tournaments = []
    type_counters = {}

    for tourney_type, number in TOURNAMENT_LIST_CHRONOLOGICAL:
        raw_df, players = load_tournament_raw(tourney_type, number)
        if raw_df is None:
            print(f"Skipping {tourney_type}_{number} — file not found")
            continue

        type_counters[tourney_type] = type_counters.get(tourney_type, 0) + 1
        display_num = type_counters[tourney_type]
        tourney_id = f"{tourney_type}_{number}"
        display_name = f"{TOURNAMENT_DISPLAY_NAMES[tourney_type]} #{display_num}"

        # ── Player stats (correct denominator) ──
        player_stats_df = get_player_stats(raw_df, players)
        player_stats = player_stats_df.to_dict(orient="records")

        # ── Timeseries ──
        gd = build_timeseries(raw_df, players)
        game_data = []
        for _, row in gd.iterrows():
            pt = {"game": int(row["Game ID"])}
            for p in players:
                pt[f"cumsum_{p}"] = int(row[f"CumSum_{p}"])
                pt[f"winratio_{p}"] = round(float(row[f"WinRatio_{p}"]), 4)
                pt[f"won_{p}"] = int(row[f"{p}_Won"])  # 1 if player scored > 0 this round
            game_data.append(pt)

        # ── Pairwise (same-team) stats ──
        pw_df = get_pairwise_stats(raw_df, players, min_num_games=10)
        pairwise = pw_df.to_dict(orient="records")

        # ── Trio stats ──
        trio_df = get_tri_stats(raw_df, players, min_num_games=5)
        trio_stats = trio_df.to_dict(orient="records")

        # ── Bid and Won (heuristic) ──
        baw_df = get_bid_and_won_stats(raw_df, players)
        bid_and_won = baw_df.to_dict(orient="records")

        # ── Per-tournament named-bidder stats (only when Bidder column exists) ──
        bid_stats_by_player = {}  # player → {attempts, wins, winRate}
        if "Bidder" in raw_df.columns:
            for p in players:
                attempts = (raw_df["Bidder"] == p).sum()
                wins = ((raw_df["Bidder"] == p) & (raw_df[p] > 0)).sum()
                bid_stats_by_player[p] = {
                    "bidAttempts": int(attempts),
                    "bidWins": int(wins),
                    "bidWinRate": round(100.0 * wins / attempts, 1) if attempts > 0 else None,
                }

        # ── Per-round scores (diff of cumsum) and consistency stats ──
        round_scores = {}  # player -> list of per-round scores
        for p in players:
            scores = []
            prev = 0
            for row in game_data:
                curr = row.get(f"cumsum_{p}", prev)
                scores.append(curr - prev)
                prev = curr
            round_scores[p] = scores

        consistency_stats = {}
        for p, scores in round_scores.items():
            if len(scores) > 1:
                import statistics
                # Include ALL rounds (zeros for losses) — this gives a truer picture
                # of consistency. A player who always scores ~200 is more consistent
                # than one who alternates 0 and 400, even if their win-only avg is similar.
                mean_all = sum(scores) / len(scores)
                std_all = statistics.stdev(scores)
                cv_all = round(std_all / mean_all, 3) if mean_all > 0 else 0
                # Also keep win-only stats for display context
                win_scores = [s for s in scores if s > 0]
                mean_wins = round(sum(win_scores) / len(win_scores), 1) if win_scores else 0
                std_wins = round(statistics.stdev(win_scores), 1) if len(win_scores) > 1 else 0
                consistency_stats[p] = {
                    "mean": round(mean_all, 1),
                    "std": round(std_all, 1),
                    "cv": cv_all,
                    "meanWins": mean_wins,
                    "stdWins": std_wins,
                    "scores": scores,
                }

        # ── Winner (top by TotalPoints) ──
        winner = player_stats[0]["Player"] if player_stats else None

        core_in_tourney = [p for p in players if p in CORE_PLAYERS]
        guests_in_tourney = [p for p in players if p not in CORE_PLAYERS]

        tournaments.append({
            "id": tourney_id,
            "type": tourney_type,
            "number": number,
            "displayNumber": display_num,
            "displayName": display_name,
            "weight": TOURNAMENT_WEIGHTS[tourney_type],
            "players": players,
            "corePlayers": core_in_tourney,
            "guestPlayers": guests_in_tourney,
            "totalGames": len(raw_df),
            "winner": winner,
            "playerStats": player_stats,
            "gameData": game_data,
            "pairwiseStats": pairwise,
            "trioStats": trio_stats,
            "bidAndWon": bid_and_won,
            "bidStatsByPlayer": bid_stats_by_player,
            "hasBidderData": "Bidder" in raw_df.columns,
            "consistencyStats": consistency_stats,
            # Keep raw_df for Elo processing (will be stripped before JSON output)
            "_raw_df": raw_df,
        })

        print(f"Processed {tourney_id}: {len(players)} players, {len(raw_df)} games, winner: {winner}")

    return tournaments


def compute_all_time_stats(tournaments):
    all_time = {p: {"wins": 0, "totalGames": 0, "totalPoints": 0, "tournamentWins": 0} for p in CORE_PLAYERS}
    for tourney in tournaments:
        for stat in tourney["playerStats"]:
            p = stat["Player"]
            if p in all_time:
                all_time[p]["wins"] += stat["Wins"]
                all_time[p]["totalGames"] += stat["TotalGames"]
                all_time[p]["totalPoints"] += stat["TotalPoints"]
        if tourney["winner"] and tourney["winner"] in all_time:
            all_time[tourney["winner"]]["tournamentWins"] += 1

    result = []
    for p, s in all_time.items():
        tg = s["totalGames"]
        result.append({
            "player": p,
            "wins": s["wins"],
            "totalGames": tg,
            "totalPoints": s["totalPoints"],
            "tournamentWins": s["tournamentWins"],
            "winPercentage": round(100.0 * s["wins"] / tg, 1) if tg else 0,
            "avgPoints": round(s["totalPoints"] / tg, 1) if tg else 0,
        })
    return sorted(result, key=lambda x: -x["tournamentWins"])


def compute_all_time_pairwise(tournaments):
    pair_stats = {}
    for tourney in tournaments:
        for pw in tourney["pairwiseStats"]:
            p1, p2 = pw["Player_x"], pw["Player_y"]
            if p1 > p2:
                p1, p2 = p2, p1
                pw = {**pw, "Player_x": p1, "Player_y": p2,
                      "Wins": pw["Wins"], "Losses": pw["Losses"]}
            key = (p1, p2)
            if key not in pair_stats:
                pair_stats[key] = {"player1": p1, "player2": p2,
                                   "wins": 0, "losses": 0, "totalGames": 0}
            pair_stats[key]["wins"] += pw["Wins"]
            pair_stats[key]["losses"] += pw["Losses"]
            pair_stats[key]["totalGames"] += pw["TotalGames"]

    result = []
    for s in pair_stats.values():
        total = s["wins"] + s["losses"]
        s["winPct"] = round(100.0 * s["wins"] / total, 1) if total else 0
        result.append(s)
    return result


def main():
    global CORE_PLAYERS

    print("Computing core players from game counts...")
    CORE_PLAYERS = compute_core_players()

    print("\nProcessing tournament data...")
    tournaments = process_all_tournaments()

    print("\nComputing Elo ratings...")
    rankings, rating_history, tourney_snapshots, player_profiles = compute_overall_rankings(tournaments)

    print("\nComputing all-time stats...")
    all_time_stats = compute_all_time_stats(tournaments)

    print("\nComputing all-time pairwise stats...")
    all_time_pairwise = compute_all_time_pairwise(tournaments)

    # Rating history for chart
    max_len = max(len(v) for v in rating_history.values())
    rating_history_data = []
    for i in range(max_len):
        pt = {"tournament": i}
        for p in CORE_PLAYERS:
            hist = rating_history[p]
            pt[p] = hist[i] if i < len(hist) else hist[-1]
        rating_history_data.append(pt)

    # Strip _raw_df before serialising
    for t in tournaments:
        t.pop("_raw_df", None)

    # Tournament summary (lightweight list view)
    tournament_summary = [
        {k: v for k, v in t.items() if k not in ("gameData", "pairwiseStats", "trioStats", "bidAndWon")}
        for t in tournaments
    ]

    # Career stats from player profiles (for Rankings page)
    career_stats = {}
    for p, prof in player_profiles.items():
        if p in CORE_PLAYERS:
            career_stats[p] = {
                "careerGames": prof.careerGames,
                "careerWins": prof.careerWins,
                "winPct": prof.win_percentage(),
                "bidAndWon": prof.bidAndWon,
                "bidAndWonPct": prof.bid_and_won_percentage(),
                "bidAttempts": prof.bidAttempts,
                "bidWins": prof.bidWins,
                "bidWinRate": prof.bid_win_rate(),
                "bestWinStreak": prof.bestWinStreak,
                "worstLossStreak": prof.worstLossStreak,
                "numFivles": prof.numFivles,
                "numTenples": prof.numTenples,
                "fiveMottes": prof.fiveMottes,
            }

    output = {
        "tournaments": tournaments,
        "tournamentSummary": tournament_summary,
        "tournamentSnapshots": tourney_snapshots,
        "rankings": rankings,
        "ratingHistory": rating_history_data,
        "allTimeStats": all_time_stats,
        "allTimePairwise": all_time_pairwise,
        "careerStats": career_stats,
        "players": CORE_PLAYERS,
        "totalTournaments": len(tournaments),
    }

    output_path = "/home/ubuntu/three-of-spades-tracker/client/public/game_data.json"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nData written to {output_path}")
    print(f"Total tournaments: {len(tournaments)}")
    print("\nFinal Rankings:")
    for r in rankings:
        print(f"  #{r['rank']} {r['player']}: {r['rating']}")
    print("\nAll-time stats:")
    for s in all_time_stats:
        print(f"  {s['player']}: {s['tournamentWins']} tourney wins, {s['winPercentage']}% win rate")


if __name__ == "__main__":
    main()

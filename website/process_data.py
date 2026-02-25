"""
process_data.py — Generates game_data.json for the 3 of Spades tracker website.

Imports shared logic from utils/:
  - utils.data_preprocessor  → load CSV helpers
  - utils.data_cruncher       → get_player_stats, get_pairwise_stats, get_tri_stats,
                                 get_bid_and_won_stats, get_named_bid_stats,
                                 get_timeseries_with_won
  - utils.ranking_system      → getAdjustmentMultiplier, BASE_RATING, DENOMINATOR
  - utils.Player              → PlayerProfile (streaks, Fivples, Tenples, FiveMottes,
                                 bidAttempts, bidWins, bidWinRate)
  - utils.constants           → TournamentTypes

Website-specific logic kept here:
  - load_tournament_raw       — CSV loading with Game ID injection (no Tournament object)
  - compute_core_players      — dynamic core player detection by game count
  - process_all_tournaments   — builds per-tournament dicts with all website fields
  - compute_overall_rankings  — Elo loop with pre/post snapshots + milestone deltas
  - compute_all_time_stats    — career aggregates
  - compute_all_time_pairwise — all-time pair records
  - main                      — orchestrates and writes game_data.json
"""

import copy
import json
import os
import statistics
import sys

import numpy as np
import pandas as pd

# ── Imports from utils/ ───────────────────────────────────────────────────────
from utils.Player import PlayerProfile
from utils.ranking_system import getAdjustmentMultiplier, BASE_RATING, DENOMINATOR
from utils.constants import TournamentTypes, TOURNAMENT_LIST_CHRONOLOGICAL as _TOURNEY_LIST_ENUM, NON_PLAYER_COLUMNS
from utils.data_cruncher import (
    get_player_stats,
    get_pairwise_stats,
    get_tri_stats,
    get_bid_and_won_stats,
    get_named_bid_stats,
    get_timeseries_with_won,
)

# ── Constants ──────────────────────────────────────────────────────────────────

# Resolve paths relative to this file so the script works from any cwd.
_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(_REPO_ROOT, "tourney_data", "raw_scores")

# NON_PLAYER_COLUMNS from utils.constants covers Bidder/Discard/Margin.
# We also exclude "Game ID" which we inject ourselves.
NON_PLAYER_COLS = NON_PLAYER_COLUMNS | {"Game ID"}

CORE_PLAYER_GAME_THRESHOLD = 200  # Players with > this many total games are "core"
CORE_PLAYERS = []  # Populated dynamically in main() after counting games

# String-to-enum lookup — needed when working with raw CSV filenames / type strings.
_TOURNEY_TYPE_ENUM = {t.value: t for t in TournamentTypes}


# ── Data loading ──────────────────────────────────────────────────────────────

def load_tournament_raw(tourney_type, number):
    """Load CSV, insert Game ID column, return (raw_df, player_cols).
    Returns (None, None) if the file is missing.
    Player columns are all columns except those in NON_PLAYER_COLS.
    """
    path = os.path.join(DATA_DIR, f"{tourney_type}_{number}.csv")
    if not os.path.exists(path):
        return None, None

    df = pd.read_csv(path)

    # Insert Game ID (1-indexed) as first column — mirrors get_tourney_data_v2
    df.insert(0, "Game ID", np.arange(1, len(df) + 1))

    # Identify player columns (everything that is not a metadata column)
    player_cols = [c for c in df.columns if c not in NON_PLAYER_COLS]

    # Convert player columns to int (coerce bad values to 0)
    for col in player_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0).astype(int)

    return df, player_cols


# ── Core player detection ─────────────────────────────────────────────────────

def compute_core_players():
    """First pass: count total games per player across all CSVs.
    Returns players with > CORE_PLAYER_GAME_THRESHOLD games, sorted by game count desc.
    """
    game_counts = {}
    for t, number in _TOURNEY_LIST_ENUM:
        tourney_type = t.value
        raw_df, players = load_tournament_raw(tourney_type, number)
        if raw_df is None:
            continue
        n_games = len(raw_df)
        for p in players:
            game_counts[p] = game_counts.get(p, 0) + n_games

    core = sorted(
        [p for p, count in game_counts.items() if count > CORE_PLAYER_GAME_THRESHOLD],
        key=lambda p: -game_counts[p],
    )
    print(f"\nDynamic CORE_PLAYERS (>{CORE_PLAYER_GAME_THRESHOLD} games):")
    for p in core:
        print(f"  {p}: {game_counts[p]} games")
    others = {p: c for p, c in game_counts.items() if p not in core}
    if others:
        print(f"  Guests: {', '.join(f'{p}({c})' for p, c in sorted(others.items(), key=lambda x: -x[1]))}")
    return core


# ── Main tournament processing ────────────────────────────────────────────────

def _load_metadata():
    """Load tourney_data/metadata.csv and return a dict keyed by tournament id."""
    meta_path = os.path.join(_REPO_ROOT, "tourney_data", "metadata.csv")
    if not os.path.exists(meta_path):
        return {}
    import csv
    with open(meta_path, newline="", encoding="utf-8") as f:
        return {row["id"]: row for row in csv.DictReader(f)}


def process_all_tournaments():
    """Load every tournament CSV and build per-tournament dicts with all website fields."""
    tournaments = []
    type_counters = {}
    metadata = _load_metadata()

    for t, number in _TOURNEY_LIST_ENUM:
        tourney_type = t.value
        raw_df, players = load_tournament_raw(tourney_type, number)
        if raw_df is None:
            print(f"Skipping {tourney_type}_{number} — file not found")
            continue

        type_counters[tourney_type] = type_counters.get(tourney_type, 0) + 1
        display_num = number  # Use the CSV file number directly so gaps (e.g. skipped #10) are preserved
        tourney_id = f"{tourney_type}_{number}"
        display_name = f"{_TOURNEY_TYPE_ENUM[tourney_type].display()} #{display_num}"
        meta = metadata.get(tourney_id, {})
        tourney_name = meta.get("name") or None
        tourney_location = meta.get("location") or None
        tourney_flag = meta.get("flag") or None
        tourney_dates = meta.get("dates") or None
        tourney_year = int(meta["year"]) if meta.get("year") else None

        # ── Player stats ──────────────────────────────────────────────────────
        player_stats_df = get_player_stats(raw_df)
        player_stats = player_stats_df.to_dict(orient="records")

        # ── Timeseries (CumSum + won_ per round) ─────────────────────────────
        gd = get_timeseries_with_won(raw_df)
        game_data = []
        for _, row in gd.iterrows():
            pt = {"game": int(row["Game ID"])}
            for p in players:
                pt[f"cumsum_{p}"] = int(row[f"CumSum_{p}"])
                pt[f"winratio_{p}"] = round(float(row[f"WinRatio_{p}"]), 4)
                pt[f"won_{p}"] = int(row[f"{p}_Won"])
            game_data.append(pt)

        # ── Pairwise (same-team) stats ────────────────────────────────────────
        pw_df = get_pairwise_stats(raw_df, min_num_games=10)
        pairwise = pw_df.to_dict(orient="records")

        # ── Trio stats ────────────────────────────────────────────────────────
        trio_df = get_tri_stats(raw_df, min_num_games=5)
        trio_stats = trio_df.to_dict(orient="records")

        # ── Bid and Won (heuristic, no Bidder column required) ────────────────
        baw_df = get_bid_and_won_stats(raw_df)
        bid_and_won = baw_df.to_dict(orient="records")

        # ── Per-tournament named-bidder stats (only when Bidder column exists) ─
        bid_stats_by_player = {}
        named_bid_df = get_named_bid_stats(raw_df)
        if named_bid_df is not None:
            for _, row in named_bid_df.iterrows():
                p = row["Player"]
                rate = row["BidWinRate"]
                bid_stats_by_player[p] = {
                    "bidAttempts": int(row["BidAttempts"]),
                    "bidWins": int(row["BidWins"]),
                    "bidWinRate": None if (rate is None or (isinstance(rate, float) and __import__('math').isnan(rate))) else float(rate),
                }

        # ── Consistency stats (CV over all rounds) ────────────────────────
        # Read per-round scores directly from raw_df (avoids fragile cumsum diffing)
        round_scores = {
            p: raw_df[p].fillna(0).astype(int).tolist()
            for p in players if p in raw_df.columns
        }

        consistency_stats = {}
        for p, scores in round_scores.items():
            if len(scores) > 1:
                mean_all = sum(scores) / len(scores)
                std_all = statistics.stdev(scores)
                cv_all = round(std_all / mean_all, 3) if mean_all > 0 else 0
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

        # ── Winner(s) — all players tied at the top TotalPoints ─────────────
        winner = player_stats[0]["Player"] if player_stats else None
        if player_stats:
            top_pts = player_stats[0]["TotalPoints"]
            winners = [s["Player"] for s in player_stats if s["TotalPoints"] == top_pts]
        else:
            winners = []

        core_in_tourney = [p for p in players if p in CORE_PLAYERS]
        guests_in_tourney = [p for p in players if p not in CORE_PLAYERS]

        tournaments.append({
            "id": tourney_id,
            "type": tourney_type,
            "number": number,
            "displayNumber": display_num,
            "displayName": display_name,
            "weight": _TOURNEY_TYPE_ENUM[tourney_type].weight(),
            "players": players,
            "corePlayers": core_in_tourney,
            "guestPlayers": guests_in_tourney,
            "totalGames": len(raw_df),
            "winner": winner,
            "winners": winners,
            "name": tourney_name,
            "location": tourney_location,
            "flag": tourney_flag,
            "dates": tourney_dates,
            "year": tourney_year,
            "playerStats": player_stats,
            "gameData": game_data,
            "pairwiseStats": pairwise,
            "trioStats": trio_stats,
            "bidAndWon": bid_and_won,
            "bidStatsByPlayer": bid_stats_by_player,
            "hasBidderData": "Bidder" in raw_df.columns,
            "consistencyStats": consistency_stats,
            # Keep raw_df for Elo processing (stripped before JSON output)
            "_raw_df": raw_df,
        })

        print(f"Processed {tourney_id}: {len(players)} players, {len(raw_df)} games, winner: {winner}")

    return tournaments


# ── Elo rating system ─────────────────────────────────────────────────────────


class _TourneyKey:
    """Minimal shim so PlayerProfile.newTournamentStart (which calls tournament.display())
    and getAdjustmentMultiplier (which calls tournament.typ()) work without a full
    Tournament object."""
    def __init__(self, key, tourney_type_str):
        self._key = key
        self._typ = _TOURNEY_TYPE_ENUM[tourney_type_str]

    def display(self):
        return self._key

    def typ(self):
        return self._typ


def compute_overall_rankings(tournaments_raw):
    """
    Full Elo-style per-game rating system using PlayerProfile from utils.Player.
    Computes per-tournament pre/post rating snapshots and per-tournament milestone deltas.

    Note: We use PlayerProfile + getAdjustmentMultiplier directly (not UniversalRatingSystem)
    because the website needs per-tournament pre/post rating snapshots and milestone deltas
    (fivplesThisTourney etc.) that are website-specific output concerns.
    UniversalRatingSystem does not expose these hooks, so we replicate its per-game loop
    here while reusing the shared math (getAdjustmentMultiplier, BASE_RATING, DENOMINATOR)
    from utils.ranking_system.

    Returns:
      rankings          — final sorted list [{player, rating, rank}]
      rating_history    — {player: [rating_after_each_tourney]}
      tourney_snapshots — {tourney_id: {player: snapshot_dict}}
      player_profiles   — {player: PlayerProfile} (career stats)
    """
    player_map = {}  # name → PlayerProfile (all players incl. guests)

    def get_profile(name):
        if name not in player_map:
            player_map[name] = PlayerProfile(name, rating=BASE_RATING)
        return player_map[name]

    rating_history = {p: [float(BASE_RATING)] for p in CORE_PLAYERS}
    tourney_snapshots = {}

    for tourney in tournaments_raw:
        tourney_id = tourney["id"]
        tourney_key = tourney["displayName"]
        players = tourney["players"]
        raw_df = tourney["_raw_df"]

        # Snapshot BEFORE this tournament
        before_snapshot = {name: copy.copy(prof) for name, prof in player_map.items()}

        # Ensure all players in this tourney are registered
        for p in players:
            get_profile(p)

        has_bidder_col = "Bidder" in raw_df.columns

        # Process game by game — mirrors UniversalRatingSystem.addTournamentData
        for _, row in raw_df.iterrows():
            winning_team, winning_points, losing_team = [], [], []
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
            bid = min(winning_points)

            tourney_shim = _TourneyKey(tourney_key, tourney["type"])
            adj_mult = getAdjustmentMultiplier(avg_win_r - avg_lose_r, tourney_shim)
            for pl, pts in zip(winning_team, winning_points):
                is_named_bidder = has_bidder_col and (pl.name == named_bidder)
                pl.registerGame(
                    tourney_shim, pts * adj_mult, is_win=True,
                    bid_and_won=(pts > bid),
                    is_named_bidder=is_named_bidder,
                    named_bid_won=is_named_bidder,
                )
            for pl in losing_team:
                is_named_bidder = has_bidder_col and (pl.name == named_bidder)
                pl.registerGame(
                    tourney_shim, bid * adj_mult, is_win=False,
                    is_named_bidder=is_named_bidder,
                    named_bid_won=False,
                )

        # Snapshot AFTER this tournament
        after_snapshot = {name: copy.copy(prof) for name, prof in player_map.items()}

        # Build rank tables (core players only)
        def rank_core(snapshot):
            ranked = sorted(
                [(n, s.rating) for n, s in snapshot.items() if n in CORE_PLAYERS],
                key=lambda x: -x[1],
            )
            return {n: i + 1 for i, (n, _) in enumerate(ranked)}

        before_ranks = rank_core(before_snapshot)
        after_ranks = rank_core(after_snapshot)

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
            old_rank = before_ranks.get(p, "-") if not is_guest else "-"
            new_rank = after_ranks.get(p, "-") if not is_guest else "-"
            rank_change = (
                (old_rank - new_rank)
                if isinstance(old_rank, int) and isinstance(new_rank, int)
                else 0
            )
            # Per-tournament milestone deltas (diff before vs after)
            b = before_r
            a = after_r
            snap[p] = {
                "ratingBefore": old_rating,
                "ratingAfter": new_rating,
                "ratingChange": rating_change,
                "rankBefore": old_rank,
                "rankAfter": new_rank,
                "rankChange": rank_change,
                "careerGames": a.careerGames,
                "winPct": a.winPercentage(),
                "bidAndWonPct": a.bidAndWonPercentage(),
                "bidAttempts": a.bidAttempts,
                "bidWins": a.bidWins,
                "bidWinRate": a.bidWinRate(),
                "bestWinStreak": a.bestWinStreak,
                "worstLossStreak": a.worstLossStreak,
                "numFivles": a.numFivles,
                "numTenples": a.numTenples,
                "fiveMottes": a.fiveMottes,
                # Per-tournament milestone deltas
                "fivplesThisTourney": a.numFivles - (b.numFivles if b else 0),
                "tenplesThisTourney": a.numTenples - (b.numTenples if b else 0),
                "fiveMottesThisTourney": a.fiveMottes - (b.fiveMottes if b else 0),
                "isGuest": is_guest,
            }
        tourney_snapshots[tourney_id] = snap

        # Append to rating history
        for p in CORE_PLAYERS:
            prof = player_map.get(p)
            rating_history[p].append(round(prof.rating if prof else BASE_RATING, 1))

    # Final rankings
    sorted_ratings = sorted(
        [(p, player_map.get(p, PlayerProfile(p, BASE_RATING)).rating) for p in CORE_PLAYERS],
        key=lambda x: -x[1],
    )
    rankings = [
        {"player": p, "rating": round(r, 1), "rank": i + 1}
        for i, (p, r) in enumerate(sorted_ratings)
    ]
    return rankings, rating_history, tourney_snapshots, player_map


# ── All-time aggregates ───────────────────────────────────────────────────────

def compute_all_time_stats(tournaments):
    all_time = {p: {"wins": 0, "totalGames": 0, "totalPoints": 0, "tournamentWins": 0}
                for p in CORE_PLAYERS}
    for tourney in tournaments:
        for stat in tourney["playerStats"]:
            p = stat["Player"]
            if p in all_time:
                all_time[p]["wins"] += stat["Wins"]
                all_time[p]["totalGames"] += stat["TotalGames"]
                all_time[p]["totalPoints"] += stat["TotalPoints"]
        for w in tourney.get("winners") or ([tourney["winner"]] if tourney["winner"] else []):
            if w in all_time:
                all_time[w]["tournamentWins"] += 1

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


# ── Entry point ───────────────────────────────────────────────────────────────

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

    # Tournament summary (lightweight list view — omit heavy per-game arrays)
    tournament_summary = [
        {k: v for k, v in t.items() if k not in ("gameData", "pairwiseStats", "trioStats", "bidAndWon")}
        for t in tournaments
    ]

    # Career stats from player profiles (for Rankings / Career Stats pages)
    career_stats = {}
    for p, prof in player_profiles.items():
        if p in CORE_PLAYERS:
            career_stats[p] = {
                "careerGames": prof.careerGames,
                "careerWins": prof.careerWins,
                "winPct": prof.winPercentage(),
                "bidAndWon": prof.bidAndWon,
                "bidAndWonPct": prof.bidAndWonPercentage(),
                "bidAttempts": prof.bidAttempts,
                "bidWins": prof.bidWins,
                "bidWinRate": prof.bidWinRate(),
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

    # Default output path: website/client/public/game_data.json relative to the repo root.
    # Override by passing a path as the first CLI argument:
    #   python3 website/process_data.py /path/to/output/game_data.json
    output_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        _REPO_ROOT, "website", "client", "public", "game_data.json"
    )
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

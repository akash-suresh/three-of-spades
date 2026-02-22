"""
process_data.py — Generates website/client/public/game_data.json for the 3 of Spades tracker website.

Run from the repo root:
    python process_data.py

This script imports directly from utils/ — no manual porting.
Any change to utils/constants.py, utils/ranking_system.py, utils/Player.py,
utils/data_cruncher.py, or utils/data_preprocessor.py is automatically
reflected the next time this script is run.

Workflow for adding a new tournament:
  1. Add the CSV to tourney_data/raw_scores/ (follow naming convention)
  2. Append the entry to TOURNAMENT_LIST_CHRONOLOGICAL in utils/constants.py
  3. Run: python process_data.py
  4. Commit and push — the website will use the new game_data.json
"""

import os
import sys
import json
import copy

import pandas as pd

# ── Ensure utils/ is importable when run from repo root ──────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from utils.constants import (
    TOURNAMENT_LIST_CHRONOLOGICAL,
    TournamentTypes,
    NON_PLAYER_COLUMNS,
    get_datascore_path,
)
from utils.data_preprocessor import (
    get_tourney_data_v2,
    get_players,
    get_game_data_as_timeseries,
)
from utils.data_cruncher import (
    get_player_stats,
    get_pairwise_stats,
    get_tri_stats,
    get_bid_and_won_stats,
)
from utils.ranking_system import (
    UniversalRatingSystem,
    rankPlayerMap,
    getPlayersToRankMapping,
    BASE_RATING,
)
from utils.Tournament import Tournament

# ── Configuration ─────────────────────────────────────────────────────────────

CORE_PLAYER_GAME_THRESHOLD = 200  # Players with > this many total games are "core"

TOURNAMENT_WEIGHTS = {
    TournamentTypes.CHAMPIONSHIP: 1.0,
    TournamentTypes.MINI_CHAMPIONSHIP: 0.75,
    TournamentTypes.TINY_CHAMPIONSHIP: 0.75,
    TournamentTypes.FRIENDLY: 1.0,
}

TOURNAMENT_DISPLAY_NAMES = {
    TournamentTypes.CHAMPIONSHIP: "Championship",
    TournamentTypes.MINI_CHAMPIONSHIP: "Mini Championship",
    TournamentTypes.TINY_CHAMPIONSHIP: "Tiny Championship",
    TournamentTypes.FRIENDLY: "International Friendly",
}

# Output path — relative to repo root, targeting the website subdirectory
OUTPUT_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "website", "client", "public", "game_data.json"
)


# ── Dynamic core player detection ─────────────────────────────────────────────

def compute_core_players():
    """Count total games per player across all CSVs. Anyone >200 games is core."""
    game_counts = {}
    for tourney_type, number in TOURNAMENT_LIST_CHRONOLOGICAL:
        path = get_datascore_path(number, tourney_type)
        if not os.path.exists(path):
            continue
        try:
            raw_df = get_tourney_data_v2(number, tourney_type)
            players = get_players(raw_df)
            n_games = len(raw_df)
            for p in players:
                game_counts[p] = game_counts.get(p, 0) + n_games
        except Exception as e:
            print(f"  Warning: could not read {path}: {e}")

    core = sorted(
        [p for p, count in game_counts.items() if count > CORE_PLAYER_GAME_THRESHOLD],
        key=lambda p: -game_counts[p]
    )
    print(f"\nDynamic CORE_PLAYERS (>{CORE_PLAYER_GAME_THRESHOLD} games):")
    for p in core:
        print(f"  {p}: {game_counts[p]} games")
    guests = {p: c for p, c in game_counts.items() if p not in core}
    if guests:
        print(f"  Guests: {', '.join(f'{p}({c})' for p, c in sorted(guests.items(), key=lambda x: -x[1]))}")
    return core


# ── Tournament processing ─────────────────────────────────────────────────────

def process_all_tournaments(core_players):
    """Load every tournament using utils/ directly and build the data payload."""
    tournaments = []
    type_counters = {}

    for tourney_type, number in TOURNAMENT_LIST_CHRONOLOGICAL:
        path = get_datascore_path(number, tourney_type)
        if not os.path.exists(path):
            print(f"Skipping {tourney_type.value}_{number} — file not found")
            continue

        try:
            # Use utils/ directly — same as the notebooks
            raw_df = get_tourney_data_v2(number, tourney_type)
            players = get_players(raw_df)
            game_data_df = get_game_data_as_timeseries(raw_df)
            player_stats_df = get_player_stats(raw_df)
            pairwise_df = get_pairwise_stats(raw_df, min_num_games=10)
            trio_df = get_tri_stats(raw_df, min_num_games=5)
            bid_df = get_bid_and_won_stats(raw_df)

        except Exception as e:
            print(f"Error processing {tourney_type.value}_{number}: {e}")
            continue

        type_counters[tourney_type] = type_counters.get(tourney_type, 0) + 1
        display_num = type_counters[tourney_type]
        tourney_id = f"{tourney_type.value}_{number}"
        display_name = f"{TOURNAMENT_DISPLAY_NAMES[tourney_type]} #{display_num}"

        # Timeseries game data
        game_data = []
        for _, row in game_data_df.iterrows():
            pt = {"game": int(row["Game ID"])}
            for p in players:
                pt[f"cumsum_{p}"] = int(row[f"CumSum_{p}"])
                pt[f"winratio_{p}"] = round(float(row[f"WinRatio_{p}"]), 4)
            game_data.append(pt)

        player_stats = player_stats_df.to_dict(orient="records")
        winner = player_stats[0]["Player"] if player_stats else None

        # Rename bid column to match expected key
        bid_df = bid_df.rename(columns={"Bid and Won": "BidAndWon"})

        core_in_tourney = [p for p in players if p in core_players]
        guests_in_tourney = [p for p in players if p not in core_players]

        tournaments.append({
            "id": tourney_id,
            "type": tourney_type.value,
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
            "pairwiseStats": pairwise_df.to_dict(orient="records"),
            "trioStats": trio_df.to_dict(orient="records"),
            "bidAndWon": bid_df.to_dict(orient="records"),
            # Keep raw_df for Elo processing (stripped before JSON output)
            "_raw_df": raw_df,
        })

        print(f"Processed {tourney_id}: {len(players)} players, {len(raw_df)} games, winner: {winner}")

    return tournaments


# ── Elo ratings via UniversalRatingSystem ─────────────────────────────────────

def compute_overall_rankings(tournaments, core_players):
    """
    Run the UniversalRatingSystem from utils/ directly.
    Also extracts per-tournament snapshots and career stats for the website.
    """
    urs = UniversalRatingSystem()

    # We need Tournament objects for addTournamentData, but we already have
    # raw_df loaded — build lightweight wrappers instead of re-reading CSVs.
    rating_history = {p: [float(BASE_RATING)] for p in core_players}
    tourney_snapshots = {}

    for tourney in tournaments:
        tourney_type_enum = TournamentTypes(tourney["type"])
        number = tourney["number"]
        raw_df = tourney["_raw_df"]
        players = tourney["players"]
        tourney_id = tourney["id"]

        # Build a minimal Tournament-like object that UniversalRatingSystem accepts
        t = Tournament.__new__(Tournament)
        t.tournamentType = tourney_type_enum
        t.tournamentNumber = number
        t.rawData = raw_df
        t.players = players

        # Snapshot BEFORE (deep copy of current player map)
        before_ratings = urs.getRankingsSnapshot()

        # Feed data through the real rating system
        before_ratings, after_ratings = urs.addTournamentData(t)

        # Rank helpers
        def rank_core(snapshot):
            ranked = sorted(
                [(n, p.rating) for n, p in snapshot.items() if n in core_players],
                key=lambda x: -x[1]
            )
            return {n: i + 1 for i, (n, _) in enumerate(ranked)}

        before_ranks = rank_core(before_ratings)
        after_ranks = rank_core(after_ratings)

        # Build snapshot for all players in this tournament
        guest_players = [p for p in players if p not in core_players]
        snapshot_players = core_players + guest_players

        snap = {}
        for p in snapshot_players:
            if p not in after_ratings:
                continue
            before_prof = before_ratings.get(p)
            after_prof = after_ratings[p]
            old_rating = int(before_prof.rating) if before_prof else BASE_RATING
            new_rating = int(after_prof.rating)
            rating_change = new_rating - old_rating
            is_guest = p in guest_players
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
                "careerGames": after_prof.careerGames,
                "winPct": after_prof.winPercentage(),
                "bidAndWonPct": after_prof.bidAndWonPercentage(),
                "bestWinStreak": after_prof.bestWinStreak,
                "worstLossStreak": after_prof.worstLossStreak,
                "numFivles": after_prof.numFivles,
                "numTenples": after_prof.numTenples,
                "fiveMottes": after_prof.fiveMottes,
                "isGuest": is_guest,
            }
        tourney_snapshots[tourney_id] = snap

        # Append to rating history (core players only)
        for p in core_players:
            prof = after_ratings.get(p)
            rating_history[p].append(round(prof.rating if prof else BASE_RATING, 1))

    # Final rankings (core players only, sorted by rating)
    final_map = urs.playerMap
    sorted_ratings = sorted(
        [(p, final_map[p].rating) for p in core_players if p in final_map],
        key=lambda x: -x[1]
    )
    rankings = [
        {"player": p, "rating": round(r, 1), "rank": i + 1}
        for i, (p, r) in enumerate(sorted_ratings)
    ]

    return rankings, rating_history, tourney_snapshots, final_map


# ── All-time aggregates ───────────────────────────────────────────────────────

def compute_all_time_stats(tournaments, core_players):
    all_time = {p: {"wins": 0, "totalGames": 0, "totalPoints": 0, "tournamentWins": 0} for p in core_players}
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
            key = (p1, p2)
            if key not in pair_stats:
                pair_stats[key] = {"player1": p1, "player2": p2, "wins": 0, "losses": 0, "totalGames": 0}
            pair_stats[key]["wins"] += pw["Wins"]
            pair_stats[key]["losses"] += pw["Losses"]
            pair_stats[key]["totalGames"] += pw["TotalGames"]

    result = []
    for s in pair_stats.values():
        total = s["wins"] + s["losses"]
        s["winPct"] = round(100.0 * s["wins"] / total, 1) if total else 0
        result.append(s)
    return result


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("3 of Spades — Website Data Generator")
    print("=" * 60)

    print("\nStep 1: Computing core players from game counts...")
    core_players = compute_core_players()

    print("\nStep 2: Processing tournament data...")
    tournaments = process_all_tournaments(core_players)

    print("\nStep 3: Computing Elo ratings (UniversalRatingSystem)...")
    rankings, rating_history, tourney_snapshots, player_map = compute_overall_rankings(tournaments, core_players)

    print("\nStep 4: Computing all-time stats...")
    all_time_stats = compute_all_time_stats(tournaments, core_players)
    all_time_pairwise = compute_all_time_pairwise(tournaments)

    # Rating history chart data
    max_len = max(len(v) for v in rating_history.values())
    rating_history_data = []
    for i in range(max_len):
        pt = {"tournament": i}
        for p in core_players:
            hist = rating_history[p]
            pt[p] = hist[i] if i < len(hist) else hist[-1]
        rating_history_data.append(pt)

    # Career stats (for Rankings page)
    career_stats = {}
    for p in core_players:
        prof = player_map.get(p)
        if prof:
            career_stats[p] = {
                "careerGames": prof.careerGames,
                "careerWins": prof.careerWins,
                "winPct": prof.winPercentage(),
                "bidAndWon": prof.bidAndWon,
                "bidAndWonPct": prof.bidAndWonPercentage(),
                "bestWinStreak": prof.bestWinStreak,
                "worstLossStreak": prof.worstLossStreak,
                "numFivles": prof.numFivles,
                "numTenples": prof.numTenples,
                "fiveMottes": prof.fiveMottes,
            }

    # Strip _raw_df before serialising
    for t in tournaments:
        t.pop("_raw_df", None)

    # Tournament summary (lightweight list for the Tournaments page)
    tournament_summary = [
        {k: v for k, v in t.items() if k not in ("gameData", "pairwiseStats", "trioStats", "bidAndWon")}
        for t in tournaments
    ]

    output = {
        "tournaments": tournaments,
        "tournamentSummary": tournament_summary,
        "tournamentSnapshots": tourney_snapshots,
        "rankings": rankings,
        "ratingHistory": rating_history_data,
        "allTimeStats": all_time_stats,
        "allTimePairwise": all_time_pairwise,
        "careerStats": career_stats,
        "players": core_players,
        "totalTournaments": len(tournaments),
    }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nData written to {OUTPUT_PATH}")
    print(f"Total tournaments: {len(tournaments)}")
    print("\nFinal Rankings:")
    for r in rankings:
        print(f"  #{r['rank']} {r['player']}: {r['rating']}")
    print("\nAll-time stats:")
    for s in all_time_stats:
        print(f"  {s['player']}: {s['tournamentWins']} tourney wins, {s['winPercentage']}% win rate")
    print("\nDone! Commit game_data.json and push to update the website.")


if __name__ == "__main__":
    main()

/*
 * Head-to-Head Page — Dark Casino / Art Deco Design System
 * All-time pairwise (same-team) stats, matchup selector, win rate visualization
 *
 * Note: "Head-to-Head" here means same-team pair performance across all tournaments.
 * wins/losses = times both players were on the same winning/losing side.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Swords, Users2 } from "lucide-react";
import Layout from "@/components/Layout";
import { fetchGameData, getPlayerColor, type GameData, type AllTimePairwiseStat } from "@/lib/gameData";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// CORE_PLAYERS is derived dynamically from data.players (populated from game_data.json)
// Any player with >200 total games qualifies as core — see process_data.py

function MatchupCard({ pw, index }: { pw: AllTimePairwiseStat; index: number }) {
  const p1Color = getPlayerColor(pw.player1);
  const p2Color = getPlayerColor(pw.player2);
  const p1WinPct = pw.winPct;
  const p2WinPct = 100 - p1WinPct;
  const dominant = p1WinPct >= p2WinPct ? pw.player1 : pw.player2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.6) }}
      className="felt-card rounded-lg p-4"
    >
      {/* Players */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center text-xs font-bold"
            style={{ background: p1Color + "33", color: p1Color, border: `1px solid ${p1Color}55` }}>
            {pw.player1[0]}
          </div>
          <div className="text-xs font-semibold" style={{ color: p1Color }}>{pw.player1}</div>
          <div className="text-xl font-bold rank-number mt-0.5" style={{ color: p1Color }}>{pw.wins}</div>
        </div>

        <div className="flex-1 px-3">
          <div className="text-center text-xs mb-2" style={{ color: "oklch(0.45 0.02 85)" }}>
            {pw.totalGames} games together
          </div>
          {/* Win bar */}
          <div className="h-2 rounded-full overflow-hidden flex" style={{ background: "oklch(0.18 0.02 155)" }}>
            <div className="h-full transition-all" style={{ width: `${p1WinPct}%`, background: p1Color }} />
            <div className="h-full transition-all" style={{ width: `${p2WinPct}%`, background: p2Color }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs rank-number" style={{ color: p1Color }}>{p1WinPct.toFixed(0)}%</span>
            <span className="text-xs rank-number" style={{ color: p2Color }}>{p2WinPct.toFixed(0)}%</span>
          </div>
          <div className="text-center mt-1">
            <span className="text-xs" style={{ color: "oklch(0.45 0.02 85)" }}>
              {dominant} leads
            </span>
          </div>
        </div>

        <div className="text-center">
          <div className="w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center text-xs font-bold"
            style={{ background: p2Color + "33", color: p2Color, border: `1px solid ${p2Color}55` }}>
            {pw.player2[0]}
          </div>
          <div className="text-xs font-semibold" style={{ color: p2Color }}>{pw.player2}</div>
          <div className="text-xl font-bold rank-number mt-0.5" style={{ color: p2Color }}>{pw.losses}</div>
        </div>
      </div>
    </motion.div>
  );
}

export default function HeadToHeadPage() {
  const [data, setData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedP1, setSelectedP1] = useState<string>("Akash");
  const [selectedP2, setSelectedP2] = useState<string>("Nats");

  useEffect(() => {
    fetchGameData().then(setData).finally(() => setLoading(false));
  }, []);

  // Core players come from the JSON (dynamic: >200 games threshold)
  const corePlayers = data?.players || ["Akash", "Abhi", "Ani", "Nats", "Naati", "Prateek", "Skanda"];

  // Find the selected matchup (player1 < player2 alphabetically in data)
  const selectedMatchup = data?.allTimePairwise.find(
    (pw) =>
      (pw.player1 === selectedP1 && pw.player2 === selectedP2) ||
      (pw.player1 === selectedP2 && pw.player2 === selectedP1)
  );

  // Normalize: always show selectedP1 as "player1" side
  const normalizedMatchup = selectedMatchup
    ? selectedMatchup.player1 === selectedP1
      ? { ...selectedMatchup, p1Wins: selectedMatchup.wins, p2Wins: selectedMatchup.losses, p1WinPct: selectedMatchup.winPct }
      : { ...selectedMatchup, player1: selectedMatchup.player2, player2: selectedMatchup.player1,
          p1Wins: selectedMatchup.losses, p2Wins: selectedMatchup.wins, p1WinPct: 100 - selectedMatchup.winPct }
    : null;

  // Per-player win record against all others (using wins/losses from AllTimePairwiseStat)
  const playerWinRecords = corePlayers.map((player) => {
    const matchups = (data?.allTimePairwise || []).filter(
      (pw) => pw.player1 === player || pw.player2 === player
    );
    const wins = matchups.reduce((sum, pw) => {
      return sum + (pw.player1 === player ? pw.wins : pw.losses);
    }, 0);
    const losses = matchups.reduce((sum, pw) => {
      return sum + (pw.player1 === player ? pw.losses : pw.wins);
    }, 0);
    const total = wins + losses;
    return {
      player,
      wins,
      losses,
      total,
      winPct: total > 0 ? Math.round((wins / total) * 100) : 0,
    };
  }).sort((a, b) => b.winPct - a.winPct);

  // Tournament-by-tournament matchup history
  const matchupHistory = selectedMatchup
    ? (data?.tournaments || [])
        .filter((t) => t.players.includes(selectedP1) && t.players.includes(selectedP2))
        .map((t) => {
          const pw = t.pairwiseStats.find(
            (p) =>
              (p.Player_x === selectedP1 && p.Player_y === selectedP2) ||
              (p.Player_x === selectedP2 && p.Player_y === selectedP1)
          );
          if (!pw) return null;
          const p1Wins = pw.Player_x === selectedP1 ? pw.Wins : pw.Losses;
          const p2Wins = pw.Player_x === selectedP1 ? pw.Losses : pw.Wins;
          return {
            name: t.displayName.replace("Championship", "C").replace("International Friendly", "IF").replace("Mini ", "M").replace("Tiny ", "T"),
            [selectedP1]: p1Wins,
            [selectedP2]: p2Wins,
          };
        })
        .filter(Boolean)
    : [];

  return (
    <Layout>
      <div className="container py-8 space-y-8">
        {/* Page header */}
        <div>
          <div className="text-xs uppercase tracking-[0.3em] mb-1" style={{ color: "oklch(0.78 0.15 85)" }}>
            ♠ Rivalry Records
          </div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.92 0.015 85)" }}>
            Pair Performance
          </h1>
          <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.02 85)" }}>
            Win/loss records when players are on the same side of the table
          </p>
        </div>

        {/* Matchup Selector */}
        <div className="felt-card rounded-lg p-6">
          <div className="flex items-center gap-2 mb-5">
            <Swords size={16} style={{ color: "oklch(0.78 0.15 85)" }} />
            <h2 className="font-semibold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.92 0.015 85)" }}>
              Select Pair
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div>
              <div className="text-xs mb-2" style={{ color: "oklch(0.50 0.02 85)" }}>Player 1</div>
              <div className="flex gap-2 flex-wrap">
                {corePlayers.map((p) => (
                  <button
                    key={p}
                    onClick={() => { if (p !== selectedP2) setSelectedP1(p); }}
                    disabled={p === selectedP2}
                    className="px-3 py-1.5 rounded text-xs font-medium transition-all disabled:opacity-30"
                    style={{
                      background: selectedP1 === p ? getPlayerColor(p) + "33" : "oklch(0.16 0.02 155)",
                      color: selectedP1 === p ? getPlayerColor(p) : "oklch(0.60 0.02 85)",
                      border: `1px solid ${selectedP1 === p ? getPlayerColor(p) + "66" : "oklch(0.22 0.03 155)"}`,
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-2xl font-bold" style={{ color: "oklch(0.35 0.04 155)" }}>+</div>

            <div>
              <div className="text-xs mb-2" style={{ color: "oklch(0.50 0.02 85)" }}>Player 2</div>
              <div className="flex gap-2 flex-wrap">
                {corePlayers.map((p) => (
                  <button
                    key={p}
                    onClick={() => { if (p !== selectedP1) setSelectedP2(p); }}
                    disabled={p === selectedP1}
                    className="px-3 py-1.5 rounded text-xs font-medium transition-all disabled:opacity-30"
                    style={{
                      background: selectedP2 === p ? getPlayerColor(p) + "33" : "oklch(0.16 0.02 155)",
                      color: selectedP2 === p ? getPlayerColor(p) : "oklch(0.60 0.02 85)",
                      border: `1px solid ${selectedP2 === p ? getPlayerColor(p) + "66" : "oklch(0.22 0.03 155)"}`,
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Matchup result */}
          {normalizedMatchup && (
            <motion.div
              key={`${selectedP1}-${selectedP2}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-5 rounded-lg"
              style={{ background: "oklch(0.16 0.02 155)", border: "1px solid oklch(0.22 0.03 155)" }}
            >
              <div className="grid grid-cols-3 gap-4 items-center">
                <div className="text-center">
                  <div className="text-4xl font-bold rank-number" style={{ color: getPlayerColor(selectedP1) }}>
                    {normalizedMatchup.p1Wins}
                  </div>
                  <div className="text-sm font-semibold mt-1" style={{ color: getPlayerColor(selectedP1) }}>
                    {selectedP1}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "oklch(0.45 0.02 85)" }}>
                    {normalizedMatchup.p1WinPct.toFixed(1)}% win rate
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-xs uppercase tracking-widest mb-2" style={{ color: "oklch(0.40 0.02 85)" }}>
                    {normalizedMatchup.totalGames} games together
                  </div>
                  <div className="h-2 rounded-full overflow-hidden flex">
                    <div className="h-full" style={{ width: `${normalizedMatchup.p1WinPct}%`, background: getPlayerColor(selectedP1) }} />
                    <div className="h-full" style={{ width: `${100 - normalizedMatchup.p1WinPct}%`, background: getPlayerColor(selectedP2) }} />
                  </div>
                  <div className="text-xs mt-2" style={{ color: "oklch(0.45 0.02 85)" }}>
                    {normalizedMatchup.p1WinPct > 50 ? selectedP1 : selectedP2} leads all-time
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-4xl font-bold rank-number" style={{ color: getPlayerColor(selectedP2) }}>
                    {normalizedMatchup.p2Wins}
                  </div>
                  <div className="text-sm font-semibold mt-1" style={{ color: getPlayerColor(selectedP2) }}>
                    {selectedP2}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "oklch(0.45 0.02 85)" }}>
                    {(100 - normalizedMatchup.p1WinPct).toFixed(1)}% win rate
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Per-tournament breakdown */}
          {matchupHistory.length > 0 && (
            <div className="mt-4">
              <div className="text-xs mb-2" style={{ color: "oklch(0.50 0.02 85)" }}>
                Wins per tournament when playing together
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={matchupHistory} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.18 0.02 155)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "oklch(0.45 0.02 85)" }} />
                  <YAxis tick={{ fontSize: 9, fill: "oklch(0.45 0.02 85)" }} />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.13 0.015 155)",
                      border: "1px solid oklch(0.25 0.04 155)",
                      borderRadius: "6px",
                      fontSize: "11px",
                      color: "oklch(0.88 0.015 85)",
                    }}
                  />
                  <Bar dataKey={selectedP1} fill={getPlayerColor(selectedP1)} radius={[2, 2, 0, 0]} />
                  <Bar dataKey={selectedP2} fill={getPlayerColor(selectedP2)} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* All matchup cards */}
        <div>
          <h2 className="font-semibold text-lg mb-4" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.92 0.015 85)" }}>
            All Pair Records
          </h2>
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="felt-card rounded-lg h-36 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(data?.allTimePairwise || [])
                .filter((pw) => corePlayers.includes(pw.player1) && corePlayers.includes(pw.player2))
                .sort((a, b) => b.totalGames - a.totalGames)
                .map((pw, i) => (
                  <MatchupCard key={`${pw.player1}-${pw.player2}`} pw={pw} index={i} />
                ))}
            </div>
          )}
        </div>

        {/* Player win records against all others */}
        <div className="felt-card rounded-lg overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: "1px solid oklch(0.22 0.03 155)" }}>
            <div className="flex items-center gap-2">
              <Users2 size={15} style={{ color: "oklch(0.78 0.15 85)" }} />
              <h2 className="font-semibold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.92 0.015 85)" }}>
                Overall Pair Win Record
              </h2>
            </div>
            <p className="text-xs mt-0.5" style={{ color: "oklch(0.50 0.02 85)" }}>
              Combined win record when playing alongside any other player
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid oklch(0.18 0.02 155)" }}>
                  {["#", "Player", "Pair Wins", "Pair Losses", "Pair Win Rate"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs uppercase tracking-wider" style={{ color: "oklch(0.45 0.02 85)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {playerWinRecords.map((r, i) => (
                  <tr
                    key={r.player}
                    className="transition-colors hover:bg-[oklch(0.15_0.018_155)]"
                    style={{ borderBottom: i < playerWinRecords.length - 1 ? "1px solid oklch(0.15 0.018 155)" : "none" }}
                  >
                    <td className="px-5 py-3 rank-number font-bold text-base" style={{ color: i === 0 ? "oklch(0.78 0.15 85)" : "oklch(0.40 0.02 85)" }}>
                      {i + 1}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: getPlayerColor(r.player) }} />
                        <span className="font-medium" style={{ color: "oklch(0.88 0.015 85)" }}>{r.player}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 rank-number font-semibold" style={{ color: "oklch(0.78 0.15 85)" }}>{r.wins}</td>
                    <td className="px-5 py-3 rank-number" style={{ color: "oklch(0.60 0.02 85)" }}>{r.losses}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.18 0.02 155)" }}>
                          <div className="h-full rounded-full" style={{ width: `${r.winPct}%`, background: getPlayerColor(r.player) }} />
                        </div>
                        <span className="rank-number text-xs" style={{ color: "oklch(0.65 0.015 85)" }}>{r.winPct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}

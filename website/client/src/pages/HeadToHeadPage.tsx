/*
 * Head-to-Head Page — Dark Casino / Art Deco Design System
 *
 * Data note: "Head-to-Head" here means same-team pair performance.
 * wins = rounds both players were on the WINNING side together
 * losses = rounds both players were on the LOSING side together
 * winPct = wins / (wins + losses)
 *
 * The MatchupCard shows: W–L record + win% bar + avg points (when available)
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Swords, Users2, TrendingUp } from "lucide-react";
import Layout from "@/components/Layout";
import {
  fetchGameData,
  getPlayerColor,
  type GameData,
  type AllTimePairwiseStat,
} from "@/lib/gameData";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

// ── MatchupCard ────────────────────────────────────────────────────────────────
function MatchupCard({
  pw,
  index,
  onClick,
}: {
  pw: AllTimePairwiseStat;
  index: number;
  onClick?: () => void;
}) {
  const p1Color = getPlayerColor(pw.player1);
  const p2Color = getPlayerColor(pw.player2);
  const winPct = pw.winPct;
  const lossPct = 100 - winPct;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.5) }}
      onClick={onClick}
      className="felt-card rounded-lg p-4 cursor-pointer transition-all hover:ring-1"
      style={{ "--tw-ring-color": "oklch(0.78 0.15 85 / 0.4)" } as React.CSSProperties}
    >
      {/* Players row */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p1Color }} />
        <span className="text-xs font-semibold" style={{ color: p1Color }}>{pw.player1}</span>
        <span className="text-xs" style={{ color: "oklch(0.40 0.02 85)" }}>+</span>
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p2Color }} />
        <span className="text-xs font-semibold" style={{ color: p2Color }}>{pw.player2}</span>
        <span className="ml-auto text-xs" style={{ color: "oklch(0.45 0.02 85)" }}>
          {pw.totalGames} games
        </span>
      </div>

      {/* W–L record */}
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl font-bold rank-number" style={{ color: "oklch(0.78 0.15 85)" }}>
          {pw.wins}
        </span>
        <span className="text-sm" style={{ color: "oklch(0.40 0.02 85)" }}>W</span>
        <span className="text-sm mx-1" style={{ color: "oklch(0.30 0.02 85)" }}>–</span>
        <span className="text-2xl font-bold rank-number" style={{ color: "oklch(0.60 0.02 85)" }}>
          {pw.losses}
        </span>
        <span className="text-sm" style={{ color: "oklch(0.40 0.02 85)" }}>L</span>
        <span
          className="ml-auto text-xs font-semibold rank-number"
          style={{ color: winPct >= 50 ? "oklch(0.78 0.15 85)" : "oklch(0.60 0.02 85)" }}
        >
          {winPct.toFixed(0)}%
        </span>
      </div>

      {/* Win rate bar */}
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.18 0.02 155)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${winPct}%`,
            background:
              winPct >= 60
                ? "oklch(0.78 0.15 85)"
                : winPct >= 50
                ? "oklch(0.65 0.10 155)"
                : "oklch(0.55 0.05 85)",
          }}
        />
      </div>
    </motion.div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function HeadToHeadPage() {
  const [data, setData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedP1, setSelectedP1] = useState<string>("Akash");
  const [selectedP2, setSelectedP2] = useState<string>("Nats");

  useEffect(() => {
    fetchGameData().then(setData).finally(() => setLoading(false));
  }, []);

  const corePlayers = data?.players || ["Akash", "Abhi", "Ani", "Nats", "Naati", "Prateek"];

  // Find the selected pair (order-independent)
  const selectedMatchup = data?.allTimePairwise.find(
    (pw) =>
      (pw.player1 === selectedP1 && pw.player2 === selectedP2) ||
      (pw.player1 === selectedP2 && pw.player2 === selectedP1)
  );

  // Normalize so selectedP1 is always on the left
  const nm = selectedMatchup
    ? selectedMatchup.player1 === selectedP1
      ? {
          wins: selectedMatchup.wins,
          losses: selectedMatchup.losses,
          winPct: selectedMatchup.winPct,
          totalGames: selectedMatchup.totalGames,
        }
      : {
          wins: selectedMatchup.losses,
          losses: selectedMatchup.wins,
          winPct: 100 - selectedMatchup.winPct,
          totalGames: selectedMatchup.totalGames,
        }
    : null;

  // Per-tournament breakdown: one bar per tournament where both played together
  const matchupHistory = selectedMatchup
    ? (data?.tournaments || [])
        .filter((t) => t.players.includes(selectedP1) && t.players.includes(selectedP2))
        .map((t) => {
          const pw = t.pairwiseStats?.find(
            (p) =>
              (p.Player_x === selectedP1 && p.Player_y === selectedP2) ||
              (p.Player_x === selectedP2 && p.Player_y === selectedP1)
          );
          if (!pw) return null;
          const wins = pw.Player_x === selectedP1 ? pw.Wins : pw.Losses;
          const losses = pw.Player_x === selectedP1 ? pw.Losses : pw.Wins;
          const winPct = pw.Player_x === selectedP1 ? pw.WinPercentage : 100 - pw.WinPercentage;
          return {
            name: t.displayName
              .replace("Championship", "C")
              .replace("International Friendly", "IF")
              .replace("Mini ", "M")
              .replace("Tiny ", "T"),
            fullName: t.displayName,
            Wins: wins,
            Losses: losses,
            WinPct: Math.round(winPct),
            AvgPts: pw.AvgPoints ?? null,
          };
        })
        .filter(Boolean) as {
          name: string;
          fullName: string;
          Wins: number;
          Losses: number;
          WinPct: number;
          AvgPts: number | null;
        }[]
    : [];

  // Overall pair win record (aggregated across all opponents)
  const playerPairRecords = corePlayers
    .map((player) => {
      const matchups = (data?.allTimePairwise || []).filter(
        (pw) => pw.player1 === player || pw.player2 === player
      );
      const wins = matchups.reduce(
        (sum, pw) => sum + (pw.player1 === player ? pw.wins : pw.losses),
        0
      );
      const losses = matchups.reduce(
        (sum, pw) => sum + (pw.player1 === player ? pw.losses : pw.wins),
        0
      );
      const total = wins + losses;
      return {
        player,
        wins,
        losses,
        total,
        winPct: total > 0 ? Math.round((wins / total) * 100) : 0,
      };
    })
    .sort((a, b) => b.winPct - a.winPct);

  // Sort all-pair cards: most games first
  const sortedPairs = (data?.allTimePairwise || [])
    .filter((pw) => corePlayers.includes(pw.player1) && corePlayers.includes(pw.player2))
    .sort((a, b) => b.totalGames - a.totalGames);

  const p1Color = getPlayerColor(selectedP1);
  const p2Color = getPlayerColor(selectedP2);

  return (
    <Layout>
      <div className="container py-8 space-y-8">
        {/* Page header */}
        <div>
          <div
            className="text-xs uppercase tracking-[0.3em] mb-1"
            style={{ color: "oklch(0.78 0.15 85)" }}
          >
            ♠ Pair Records
          </div>
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.92 0.015 85)" }}
          >
            Head to Head
          </h1>
          <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.02 85)" }}>
            Win/loss records when two players are on the same side of the table
          </p>
        </div>

        {/* ── Matchup Selector ─────────────────────────────────────────────── */}
        <div className="felt-card rounded-lg p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Swords size={16} style={{ color: "oklch(0.78 0.15 85)" }} />
            <h2
              className="font-semibold"
              style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.92 0.015 85)" }}
            >
              Select Pair
            </h2>
          </div>

          <div className="flex flex-wrap items-start gap-6">
            {/* Player 1 */}
            <div>
              <div className="text-xs mb-2" style={{ color: "oklch(0.50 0.02 85)" }}>
                Player 1
              </div>
              <div className="flex gap-2 flex-wrap">
                {corePlayers.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      if (p !== selectedP2) setSelectedP1(p);
                    }}
                    disabled={p === selectedP2}
                    className="px-3 py-1.5 rounded text-xs font-medium transition-all disabled:opacity-30"
                    style={{
                      background:
                        selectedP1 === p ? getPlayerColor(p) + "33" : "oklch(0.16 0.02 155)",
                      color:
                        selectedP1 === p ? getPlayerColor(p) : "oklch(0.60 0.02 85)",
                      border: `1px solid ${
                        selectedP1 === p
                          ? getPlayerColor(p) + "66"
                          : "oklch(0.22 0.03 155)"
                      }`,
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div
              className="text-2xl font-bold self-end pb-1"
              style={{ color: "oklch(0.35 0.04 155)" }}
            >
              +
            </div>

            {/* Player 2 */}
            <div>
              <div className="text-xs mb-2" style={{ color: "oklch(0.50 0.02 85)" }}>
                Player 2
              </div>
              <div className="flex gap-2 flex-wrap">
                {corePlayers.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      if (p !== selectedP1) setSelectedP2(p);
                    }}
                    disabled={p === selectedP1}
                    className="px-3 py-1.5 rounded text-xs font-medium transition-all disabled:opacity-30"
                    style={{
                      background:
                        selectedP2 === p ? getPlayerColor(p) + "33" : "oklch(0.16 0.02 155)",
                      color:
                        selectedP2 === p ? getPlayerColor(p) : "oklch(0.60 0.02 85)",
                      border: `1px solid ${
                        selectedP2 === p
                          ? getPlayerColor(p) + "66"
                          : "oklch(0.22 0.03 155)"
                      }`,
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Matchup result panel ─────────────────────────────────────── */}
          {nm && (
            <motion.div
              key={`${selectedP1}-${selectedP2}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg p-5"
              style={{
                background: "oklch(0.16 0.02 155)",
                border: "1px solid oklch(0.22 0.03 155)",
              }}
            >
              {/* Header row */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: p1Color }} />
                  <span className="font-semibold" style={{ color: p1Color }}>
                    {selectedP1}
                  </span>
                  <span className="text-xs" style={{ color: "oklch(0.40 0.02 85)" }}>
                    +
                  </span>
                  <div className="w-3 h-3 rounded-full" style={{ background: p2Color }} />
                  <span className="font-semibold" style={{ color: p2Color }}>
                    {selectedP2}
                  </span>
                </div>
                <span className="text-xs" style={{ color: "oklch(0.45 0.02 85)" }}>
                  {nm.totalGames} games together
                </span>
              </div>

              {/* W–L big numbers */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div
                  className="rounded-lg p-4 text-center"
                  style={{ background: "oklch(0.20 0.04 155)" }}
                >
                  <div
                    className="text-4xl font-bold rank-number"
                    style={{ color: "oklch(0.78 0.15 85)" }}
                  >
                    {nm.wins}
                  </div>
                  <div className="text-xs mt-1" style={{ color: "oklch(0.55 0.02 85)" }}>
                    Wins together
                  </div>
                  <div
                    className="text-sm font-semibold mt-0.5 rank-number"
                    style={{ color: "oklch(0.78 0.15 85)" }}
                  >
                    {nm.winPct.toFixed(1)}%
                  </div>
                </div>
                <div
                  className="rounded-lg p-4 text-center"
                  style={{ background: "oklch(0.16 0.02 155)" }}
                >
                  <div
                    className="text-4xl font-bold rank-number"
                    style={{ color: "oklch(0.50 0.02 85)" }}
                  >
                    {nm.losses}
                  </div>
                  <div className="text-xs mt-1" style={{ color: "oklch(0.45 0.02 85)" }}>
                    Losses together
                  </div>
                  <div
                    className="text-sm font-semibold mt-0.5 rank-number"
                    style={{ color: "oklch(0.50 0.02 85)" }}
                  >
                    {(100 - nm.winPct).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Win rate bar */}
              <div className="h-2 rounded-full overflow-hidden mb-1" style={{ background: "oklch(0.18 0.02 155)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${nm.winPct}%`,
                    background:
                      nm.winPct >= 60
                        ? "oklch(0.78 0.15 85)"
                        : nm.winPct >= 50
                        ? "oklch(0.65 0.10 155)"
                        : "oklch(0.55 0.05 85)",
                  }}
                />
              </div>
              <div className="text-xs text-center" style={{ color: "oklch(0.45 0.02 85)" }}>
                {nm.winPct > 50
                  ? `${selectedP1} & ${selectedP2} win more than they lose together`
                  : nm.winPct < 50
                  ? `${selectedP1} & ${selectedP2} lose more than they win together`
                  : `${selectedP1} & ${selectedP2} are perfectly balanced together`}
              </div>
            </motion.div>
          )}

          {/* ── Per-tournament breakdown chart ───────────────────────────── */}
          {matchupHistory.length > 0 && (
            <div>
              <div className="text-xs mb-3 font-medium" style={{ color: "oklch(0.65 0.02 85)" }}>
                Per-tournament record when playing together
              </div>
              <div className="overflow-x-auto">
                <div style={{ minWidth: Math.max(matchupHistory.length * 40, 400) }}>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart
                      data={matchupHistory}
                      margin={{ top: 4, right: 8, bottom: 24, left: -20 }}
                      barCategoryGap="25%"
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="oklch(0.18 0.02 155)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 9, fill: "oklch(0.45 0.02 85)" }}
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis
                        tick={{ fontSize: 9, fill: "oklch(0.45 0.02 85)" }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "oklch(0.13 0.015 155)",
                          border: "1px solid oklch(0.25 0.04 155)",
                          borderRadius: "6px",
                          fontSize: "11px",
                          color: "oklch(0.88 0.015 85)",
                        }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: any, name: any) => [
                          value,
                          name === "Wins" ? "Wins together" : "Losses together",
                        ]}
                        labelFormatter={(label, payload) =>
                          payload?.[0]
                            ? (payload[0].payload as { fullName: string }).fullName
                            : label
                        }
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 10, color: "oklch(0.55 0.02 85)" }}
                        formatter={(value) =>
                          value === "Wins" ? "Wins together" : "Losses together"
                        }
                      />
                      <Bar
                        dataKey="Wins"
                        fill="oklch(0.78 0.15 85)"
                        radius={[2, 2, 0, 0]}
                        opacity={0.9}
                      />
                      <Bar
                        dataKey="Losses"
                        fill="oklch(0.40 0.04 155)"
                        radius={[2, 2, 0, 0]}
                        opacity={0.8}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── All Pair Records ─────────────────────────────────────────────── */}
        <div>
          <h2
            className="font-semibold text-lg mb-1"
            style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.92 0.015 85)" }}
          >
            All Pair Records
          </h2>
          <p className="text-xs mb-4" style={{ color: "oklch(0.50 0.02 85)" }}>
            Click any card to load that pair in the selector above
          </p>
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="felt-card rounded-lg h-24 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedPairs.map((pw, i) => (
                <MatchupCard
                  key={`${pw.player1}-${pw.player2}`}
                  pw={pw}
                  index={i}
                  onClick={() => {
                    setSelectedP1(pw.player1);
                    setSelectedP2(pw.player2);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Overall Pair Win Record ──────────────────────────────────────── */}
        <div className="felt-card rounded-lg overflow-hidden">
          <div
            className="px-5 py-4"
            style={{ borderBottom: "1px solid oklch(0.22 0.03 155)" }}
          >
            <div className="flex items-center gap-2">
              <Users2 size={15} style={{ color: "oklch(0.78 0.15 85)" }} />
              <h2
                className="font-semibold"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: "oklch(0.92 0.015 85)",
                }}
              >
                Overall Pair Win Record
              </h2>
            </div>
            <p className="text-xs mt-0.5" style={{ color: "oklch(0.50 0.02 85)" }}>
              Combined W–L record when playing alongside any other player
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid oklch(0.18 0.02 155)" }}>
                  {["#", "Player", "W", "L", "Win Rate"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs uppercase tracking-wider"
                      style={{ color: "oklch(0.45 0.02 85)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {playerPairRecords.map((r, i) => (
                  <tr
                    key={r.player}
                    className="transition-colors hover:bg-[oklch(0.15_0.018_155)]"
                    style={{
                      borderBottom:
                        i < playerPairRecords.length - 1
                          ? "1px solid oklch(0.15 0.018 155)"
                          : "none",
                    }}
                  >
                    <td
                      className="px-5 py-3 rank-number font-bold text-base"
                      style={{
                        color:
                          i === 0 ? "oklch(0.78 0.15 85)" : "oklch(0.40 0.02 85)",
                      }}
                    >
                      {i + 1}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ background: getPlayerColor(r.player) }}
                        />
                        <span
                          className="font-medium"
                          style={{ color: "oklch(0.88 0.015 85)" }}
                        >
                          {r.player}
                        </span>
                      </div>
                    </td>
                    <td
                      className="px-5 py-3 rank-number font-semibold"
                      style={{ color: "oklch(0.78 0.15 85)" }}
                    >
                      {r.wins}
                    </td>
                    <td
                      className="px-5 py-3 rank-number"
                      style={{ color: "oklch(0.55 0.02 85)" }}
                    >
                      {r.losses}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-20 h-1.5 rounded-full overflow-hidden"
                          style={{ background: "oklch(0.18 0.02 155)" }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${r.winPct}%`,
                              background: getPlayerColor(r.player),
                            }}
                          />
                        </div>
                        <span
                          className="rank-number text-xs"
                          style={{ color: "oklch(0.65 0.015 85)" }}
                        >
                          {r.winPct}%
                        </span>
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

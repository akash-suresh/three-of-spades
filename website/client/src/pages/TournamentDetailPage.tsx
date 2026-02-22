/*
 * Tournament Detail Page — Dark Casino / Art Deco Design System
 *
 * Sections (matching Championship_1.ipynb exactly):
 *  1. Header (tournament info + winner)
 *  2. Final Standings (correct denominator: total rounds for all players)
 *  3. Score Progression chart (cumulative points per game)
 *  4. Win Ratio Over Time chart (rolling win ratio per game)
 *  5. Pair Performance (same-team stats: Wins, Losses, AvgPoints, WinPct)
 *  6. Trio Stats (3-player same-team combinations)
 *  7. Bid & Won (per-player bid success count)
 *  8. Post-Tournament Leaderboard (rank changes, streaks, Fivples/Tenples/FiveMottes)
 */
import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import {
  Trophy, ChevronLeft, Users, Gamepad2, Star,
  TrendingUp, Zap, Target, Award, Flame
} from "lucide-react";
import Layout from "@/components/Layout";
import {
  fetchGameData,
  getPlayerColor,
  getTournamentTypeColor,
  TOURNAMENT_TYPE_LABELS,
  type GameData,
  type Tournament,
  type TournamentType,
  type TournamentPlayerSnapshot,
} from "@/lib/gameData";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell, ReferenceLine,
} from "recharts";

// ── Shared card header ────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-5 py-4" style={{ borderBottom: "1px solid oklch(0.22 0.03 155)" }}>
      <h2 className="font-semibold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.92 0.015 85)" }}>
        {title}
      </h2>
      {subtitle && (
        <p className="text-xs mt-0.5" style={{ color: "oklch(0.50 0.02 85)" }}>{subtitle}</p>
      )}
    </div>
  );
}

// ── Tooltip style shared across charts ───────────────────────────────────────
const tooltipStyle = {
  background: "oklch(0.13 0.015 155)",
  border: "1px solid oklch(0.25 0.04 155)",
  borderRadius: "6px",
  fontSize: "12px",
  color: "oklch(0.88 0.015 85)",
};

// ── Legend row ────────────────────────────────────────────────────────────────
function ChartLegend({ players }: { players: string[] }) {
  return (
    <div className="flex flex-wrap gap-3 mt-1 px-2">
      {players.map((p) => (
        <div key={p} className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded" style={{ background: getPlayerColor(p) }} />
          <span className="text-xs" style={{ color: "oklch(0.60 0.02 85)" }}>{p}</span>
        </div>
      ))}
    </div>
  );
}

// ── Rank change badge ─────────────────────────────────────────────────────────
function RankChangeBadge({ change }: { change: number }) {
  if (change > 0) return (
    <span className="text-xs font-bold flex items-center gap-0.5" style={{ color: "#34d399" }}>
      ▲ {change}
    </span>
  );
  if (change < 0) return (
    <span className="text-xs font-bold flex items-center gap-0.5" style={{ color: "#f87171" }}>
      ▼ {Math.abs(change)}
    </span>
  );
  return <span className="text-xs" style={{ color: "oklch(0.45 0.02 85)" }}>—</span>;
}

export default function TournamentDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGameData().then(setData).finally(() => setLoading(false));
  }, []);

  const tournament: Tournament | undefined = data?.tournaments.find((t) => t.id === params.id);
  const typeColor = tournament ? getTournamentTypeColor(tournament.type as TournamentType) : "oklch(0.78 0.15 85)";
  const snapshot: Record<string, TournamentPlayerSnapshot> | undefined =
    data?.tournamentSnapshots?.[params.id ?? ""];

  if (!loading && !tournament) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <div className="text-4xl mb-4" style={{ color: "oklch(0.40 0.02 85)" }}>♠</div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: "oklch(0.70 0.015 85)" }}>Tournament not found</h2>
          <Link href="/tournaments">
            <button className="mt-4 px-4 py-2 rounded text-sm" style={{ background: "oklch(0.78 0.15 85)", color: "oklch(0.10 0.012 155)" }}>
              Back to Tournaments
            </button>
          </Link>
        </div>
      </Layout>
    );
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const players = tournament?.players || [];

  // Cumulative score chart data (uses cumsum_<player> keys)
  const scoreChartData = (tournament?.gameData || []).map((pt) => {
    const row: Record<string, number> = { game: pt.game };
    players.forEach((p) => { row[p] = pt[`cumsum_${p}`] ?? 0; });
    return row;
  });

  // Win ratio chart data (uses winratio_<player> keys)
  const winRatioData = (tournament?.gameData || []).map((pt) => {
    const row: Record<string, number> = { game: pt.game };
    players.forEach((p) => { row[p] = Math.round((pt[`winratio_${p}`] ?? 0) * 1000) / 10; }); // as %
    return row;
  });

  // Bar chart data (total points)
  const barData = (tournament?.playerStats || []).map((s) => ({
    player: s.Player,
    totalPoints: s.TotalPoints,
  }));

  // Snapshot sorted: core players by rankAfter, then guests by ratingAfter descending
  const snapshotRows = snapshot
    ? Object.entries(snapshot).sort(([, a], [, b]) => {
        const aIsGuest = (a as any).isGuest;
        const bIsGuest = (b as any).isGuest;
        // Guests go after core players
        if (aIsGuest && !bIsGuest) return 1;
        if (!aIsGuest && bIsGuest) return -1;
        // Both guests: sort by ratingAfter descending
        if (aIsGuest && bIsGuest) return b.ratingAfter - a.ratingAfter;
        // Both core: sort by rankAfter ascending
        return (a.rankAfter as number) - (b.rankAfter as number);
      })
    : [];

  return (
    <Layout>
      <div className="container py-8 space-y-6">
        {/* Breadcrumb */}
        <Link href="/tournaments">
          <button className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70" style={{ color: "oklch(0.60 0.02 85)" }}>
            <ChevronLeft size={14} />
            All Tournaments
          </button>
        </Link>

        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="felt-card rounded-lg animate-pulse" style={{ height: i === 0 ? "120px" : "240px" }} />
            ))}
          </div>
        ) : tournament ? (
          <>
            {/* ── 1. Tournament Header ─────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="felt-card rounded-lg p-6"
              style={{ borderLeft: `4px solid ${typeColor}` }}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span
                    className="inline-block text-xs px-2 py-0.5 rounded font-medium mb-2"
                    style={{ background: typeColor + "22", color: typeColor }}
                  >
                    {TOURNAMENT_TYPE_LABELS[tournament.type as TournamentType]}
                  </span>
                  <h1
                    className="text-2xl lg:text-3xl font-bold"
                    style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.92 0.015 85)" }}
                  >
                    {tournament.displayName}
                  </h1>
                  <div className="flex items-center gap-4 mt-2 text-sm" style={{ color: "oklch(0.55 0.02 85)" }}>
                    <span className="flex items-center gap-1"><Gamepad2 size={13} /> {tournament.totalGames} rounds</span>
                    <span className="flex items-center gap-1"><Users size={13} /> {tournament.players.length} players</span>
                    <span className="flex items-center gap-1"><Star size={13} /> ×{tournament.weight} weight</span>
                  </div>
                </div>
                {tournament.winner && (
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "oklch(0.50 0.02 85)" }}>Winner</div>
                    <div className="flex items-center gap-2 justify-end">
                      <Trophy size={18} style={{ color: "oklch(0.78 0.15 85)" }} />
                      <span
                        className="text-xl font-bold"
                        style={{ fontFamily: "'Playfair Display', serif", color: getPlayerColor(tournament.winner) }}
                      >
                        {tournament.winner}
                      </span>
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "oklch(0.45 0.02 85)" }}>
                      {tournament.playerStats.find((s) => s.Player === tournament.winner)?.TotalPoints.toLocaleString()} pts total
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* ── 2. Final Standings ───────────────────────────────────────── */}
            <div className="felt-card rounded-lg overflow-hidden">
              <SectionHeader
                title="Final Standings"
                subtitle="TotalGames = all rounds in this tournament (same for all players). AvgPoints and WinPct include zero-score rounds."
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid oklch(0.18 0.02 155)" }}>
                      {["#", "Player", "Total Points", "Wins", "Win Rate", "Avg Points", "Rounds"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs uppercase tracking-wider" style={{ color: "oklch(0.45 0.02 85)" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tournament.playerStats.map((s, i) => (
                      <motion.tr
                        key={s.Player}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="transition-colors hover:bg-[oklch(0.15_0.018_155)]"
                        style={{ borderBottom: i < tournament.playerStats.length - 1 ? "1px solid oklch(0.15 0.018 155)" : "none" }}
                      >
                        <td className="px-4 py-3">
                          <span
                            className="rank-number font-bold text-base"
                            style={{ color: i === 0 ? "oklch(0.78 0.15 85)" : i === 1 ? "oklch(0.75 0.01 85)" : i === 2 ? "oklch(0.65 0.12 55)" : "oklch(0.40 0.02 85)" }}
                          >
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: getPlayerColor(s.Player) }} />
                            <span className="font-medium" style={{ color: "oklch(0.88 0.015 85)" }}>{s.Player}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 rank-number font-semibold" style={{ color: "oklch(0.78 0.15 85)" }}>
                          {s.TotalPoints.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 rank-number" style={{ color: "oklch(0.75 0.015 85)" }}>{s.Wins}</td>
                        <td className="px-4 py-3 rank-number" style={{ color: "oklch(0.75 0.015 85)" }}>{s.WinPercentage}%</td>
                        <td className="px-4 py-3 rank-number" style={{ color: "oklch(0.65 0.015 85)" }}>{s.AvgPoints}</td>
                        <td className="px-4 py-3 rank-number" style={{ color: "oklch(0.50 0.02 85)" }}>{s.TotalGames}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── 3 & 4. Charts (Score Progression + Win Ratio) ────────────── */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Score Progression */}
              <div className="felt-card rounded-lg overflow-hidden">
                <SectionHeader title="Score Progression" subtitle="Cumulative points accumulated over each round" />
                <div className="p-4">
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={scoreChartData} margin={{ top: 4, right: 8, bottom: 16, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.18 0.02 155)" />
                      <XAxis
                        dataKey="game"
                        tick={{ fontSize: 10, fill: "oklch(0.45 0.02 85)" }}
                        label={{ value: "Round #", position: "insideBottom", offset: -10, fontSize: 10, fill: "oklch(0.45 0.02 85)" }}
                      />
                      <YAxis tick={{ fontSize: 10, fill: "oklch(0.45 0.02 85)" }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      {players.map((p) => (
                        <Line key={p} type="monotone" dataKey={p} stroke={getPlayerColor(p)} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                  <ChartLegend players={players} />
                </div>
              </div>

              {/* Win Ratio Over Time */}
              <div className="felt-card rounded-lg overflow-hidden">
                <SectionHeader title="Win Ratio Over Time" subtitle="Rolling win ratio (wins ÷ total rounds played so far)" />
                <div className="p-4">
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={winRatioData} margin={{ top: 4, right: 8, bottom: 16, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.18 0.02 155)" />
                      <XAxis
                        dataKey="game"
                        tick={{ fontSize: 10, fill: "oklch(0.45 0.02 85)" }}
                        label={{ value: "Round #", position: "insideBottom", offset: -10, fontSize: 10, fill: "oklch(0.45 0.02 85)" }}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "oklch(0.45 0.02 85)" }}
                        tickFormatter={(v) => `${v}%`}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value: number) => [`${value.toFixed(1)}%`]}
                      />
                      <ReferenceLine y={50} stroke="oklch(0.35 0.03 155)" strokeDasharray="4 4" />
                      {players.map((p) => (
                        <Line key={p} type="monotone" dataKey={p} stroke={getPlayerColor(p)} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                  <ChartLegend players={players} />
                </div>
              </div>
            </div>

            {/* Total Points Bar */}
            <div className="felt-card rounded-lg overflow-hidden">
              <SectionHeader title="Total Points" subtitle="Final point totals for this tournament" />
              <div className="p-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData} margin={{ top: 4, right: 8, bottom: 4, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.18 0.02 155)" />
                    <XAxis dataKey="player" tick={{ fontSize: 11, fill: "oklch(0.60 0.02 85)" }} />
                    <YAxis tick={{ fontSize: 10, fill: "oklch(0.45 0.02 85)" }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="totalPoints" radius={[3, 3, 0, 0]}>
                      {barData.map((entry) => (
                        <Cell key={entry.player} fill={getPlayerColor(entry.player)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── 5. Pair Performance (same-team stats) ───────────────────── */}
            {tournament.pairwiseStats.length > 0 && (
              <div className="felt-card rounded-lg overflow-hidden">
                <SectionHeader
                  title="Pair Performance"
                  subtitle="Win/loss record when both players were on the same side in a round (min. 10 games together)"
                />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: "1px solid oklch(0.18 0.02 155)" }}>
                        {["Pair", "Together", "Wins", "Losses", "Avg Pts", "Win Rate"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs uppercase tracking-wider" style={{ color: "oklch(0.45 0.02 85)" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tournament.pairwiseStats.map((pw, i) => (
                        <tr
                          key={`${pw.Player_x}-${pw.Player_y}`}
                          className="transition-colors hover:bg-[oklch(0.15_0.018_155)]"
                          style={{ borderBottom: i < tournament.pairwiseStats.length - 1 ? "1px solid oklch(0.15 0.018 155)" : "none" }}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium" style={{ color: getPlayerColor(pw.Player_x) }}>{pw.Player_x}</span>
                              <span className="text-xs" style={{ color: "oklch(0.40 0.02 85)" }}>+</span>
                              <span className="font-medium" style={{ color: getPlayerColor(pw.Player_y) }}>{pw.Player_y}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 rank-number" style={{ color: "oklch(0.60 0.02 85)" }}>{pw.TotalGames}</td>
                          <td className="px-4 py-3 rank-number font-semibold" style={{ color: "#34d399" }}>{pw.Wins}</td>
                          <td className="px-4 py-3 rank-number font-semibold" style={{ color: "#f87171" }}>{pw.Losses}</td>
                          <td className="px-4 py-3 rank-number" style={{ color: "oklch(0.65 0.015 85)" }}>{pw.AvgPoints}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.18 0.02 155)", maxWidth: "80px" }}>
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${pw.WinPercentage}%`, background: `oklch(0.65 0.18 ${155 + pw.WinPercentage * 0.5})` }}
                                />
                              </div>
                              <span className="rank-number text-xs" style={{ color: "oklch(0.65 0.015 85)" }}>
                                {pw.WinPercentage}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── 6. Trio Stats ────────────────────────────────────────────── */}
            {tournament.trioStats.length > 0 && (
              <div className="felt-card rounded-lg overflow-hidden">
                <SectionHeader
                  title="Trio Performance"
                  subtitle="Win/loss record when all three players were on the same side (min. 5 games together)"
                />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: "1px solid oklch(0.18 0.02 155)" }}>
                        {["Trio", "Together", "Wins", "Losses", "Avg Pts", "Win Rate"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs uppercase tracking-wider" style={{ color: "oklch(0.45 0.02 85)" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tournament.trioStats.map((tr, i) => (
                        <tr
                          key={`${tr.Player_x}-${tr.Player_y}-${tr.Player_z}`}
                          className="transition-colors hover:bg-[oklch(0.15_0.018_155)]"
                          style={{ borderBottom: i < tournament.trioStats.length - 1 ? "1px solid oklch(0.15 0.018 155)" : "none" }}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {[tr.Player_x, tr.Player_y, tr.Player_z].map((p, pi) => (
                                <span key={p} className="flex items-center gap-1">
                                  {pi > 0 && <span className="text-xs" style={{ color: "oklch(0.35 0.02 85)" }}>+</span>}
                                  <span className="font-medium text-xs" style={{ color: getPlayerColor(p) }}>{p}</span>
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 rank-number" style={{ color: "oklch(0.60 0.02 85)" }}>{tr.TotalGames}</td>
                          <td className="px-4 py-3 rank-number font-semibold" style={{ color: "#34d399" }}>{tr.Wins}</td>
                          <td className="px-4 py-3 rank-number font-semibold" style={{ color: "#f87171" }}>{tr.Losses}</td>
                          <td className="px-4 py-3 rank-number" style={{ color: "oklch(0.65 0.015 85)" }}>{tr.AvgPoints}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.18 0.02 155)", maxWidth: "80px" }}>
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${tr.WinPercentage}%`, background: "oklch(0.65 0.18 200)" }}
                                />
                              </div>
                              <span className="rank-number text-xs" style={{ color: "oklch(0.65 0.015 85)" }}>
                                {tr.WinPercentage}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── 7. Bid & Won ─────────────────────────────────────────────── */}
            {tournament.bidAndWon.some((b) => b.BidAndWon > 0) && (
              <div className="felt-card rounded-lg overflow-hidden">
                <SectionHeader
                  title="Bid & Won"
                  subtitle="Number of rounds where this player bid and successfully won the round"
                />
                <div className="p-5">
                  <div className="flex flex-wrap gap-4">
                    {tournament.bidAndWon.map((b, i) => (
                      <motion.div
                        key={b.Player}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.07 }}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg"
                        style={{ background: "oklch(0.14 0.018 155)", border: "1px solid oklch(0.22 0.03 155)" }}
                      >
                        <Target size={16} style={{ color: getPlayerColor(b.Player) }} />
                        <div>
                          <div className="font-medium text-sm" style={{ color: getPlayerColor(b.Player) }}>{b.Player}</div>
                          <div className="rank-number text-lg font-bold" style={{ color: "oklch(0.88 0.015 85)" }}>
                            {b.BidAndWon}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── 8. Post-Tournament Leaderboard ───────────────────────────── */}
            {snapshotRows.length > 0 && (
              <div className="felt-card rounded-lg overflow-hidden">
                <SectionHeader
                  title="Overall Rankings After This Tournament"
                  subtitle="Elo rating changes, rank movement, streaks, and milestones"
                />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: "1px solid oklch(0.18 0.02 155)" }}>
                        {[
                          { label: "Rank", icon: null },
                          { label: "Change", icon: null },
                          { label: "Player", icon: null },
                          { label: "Rating", icon: <TrendingUp size={10} /> },
                          { label: "Games", icon: <Gamepad2 size={10} /> },
                          { label: "Win %", icon: null },
                          { label: "Bid+Win %", icon: <Target size={10} /> },
                          { label: "Win Streak", icon: <Flame size={10} /> },
                          { label: "Loss Streak", icon: null },
                          { label: "Fivples", icon: <Zap size={10} /> },
                          { label: "Tenples", icon: <Award size={10} /> },
                          { label: "FiveMottes", icon: null },
                        ].map(({ label, icon }) => (
                          <th key={label} className="px-3 py-3 text-left text-xs uppercase tracking-wider whitespace-nowrap" style={{ color: "oklch(0.45 0.02 85)" }}>
                            <span className="flex items-center gap-1">{icon}{label}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {snapshotRows.map(([player, snap], i) => {
                        const isGuest = (snap as any).isGuest;
                        return (
                        <motion.tr
                          key={player}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className="transition-colors hover:bg-[oklch(0.15_0.018_155)]"
                          style={{
                            borderBottom: i < snapshotRows.length - 1 ? "1px solid oklch(0.15 0.018 155)" : "none",
                            opacity: isGuest ? 0.85 : 1,
                          }}
                        >
                          {/* Rank */}
                          <td className="px-3 py-3">
                            {isGuest ? (
                              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "oklch(0.22 0.03 155)", color: "oklch(0.50 0.02 85)" }}>Guest</span>
                            ) : (
                              <span className="rank-number font-bold" style={{
                                color: snap.rankAfter === 1 ? "oklch(0.78 0.15 85)"
                                  : snap.rankAfter === 2 ? "oklch(0.75 0.01 85)"
                                  : snap.rankAfter === 3 ? "oklch(0.65 0.12 55)"
                                  : "oklch(0.40 0.02 85)"
                              }}>
                                {snap.rankAfter}
                              </span>
                            )}
                          </td>
                          {/* Rank change */}
                          <td className="px-3 py-3">
                            {isGuest ? <span style={{ color: "oklch(0.35 0.02 85)" }}>—</span> : <RankChangeBadge change={snap.rankChange} />}
                          </td>
                          {/* Player */}
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: getPlayerColor(player) }} />
                              <span className="font-medium" style={{ color: "oklch(0.88 0.015 85)" }}>{player}</span>
                            </div>
                          </td>
                          {/* Rating with change */}
                          <td className="px-3 py-3">
                            <span className="rank-number font-semibold" style={{ color: "oklch(0.88 0.015 85)" }}>
                              {snap.ratingAfter}
                            </span>
                            <span className="rank-number text-xs ml-1" style={{
                              color: snap.ratingChange >= 0 ? "#34d399" : "#f87171"
                            }}>
                              ({snap.ratingChange >= 0 ? "+" : ""}{snap.ratingChange})
                            </span>
                          </td>
                          {/* Career games */}
                          <td className="px-3 py-3 rank-number" style={{ color: "oklch(0.60 0.02 85)" }}>{snap.careerGames}</td>
                          {/* Win % */}
                          <td className="px-3 py-3 rank-number" style={{ color: "oklch(0.70 0.015 85)" }}>{snap.winPct}%</td>
                          {/* Bid+Win % */}
                          <td className="px-3 py-3 rank-number" style={{ color: "oklch(0.60 0.02 85)" }}>{snap.bidAndWonPct}%</td>
                          {/* Win streak */}
                          <td className="px-3 py-3">
                            <span className="rank-number font-semibold" style={{ color: snap.bestWinStreak >= 5 ? "#fbbf24" : "oklch(0.65 0.015 85)" }}>
                              {snap.bestWinStreak}
                            </span>
                          </td>
                          {/* Loss streak */}
                          <td className="px-3 py-3">
                            <span className="rank-number" style={{ color: snap.worstLossStreak >= 5 ? "#f87171" : "oklch(0.50 0.02 85)" }}>
                              {snap.worstLossStreak}
                            </span>
                          </td>
                          {/* Fivples */}
                          <td className="px-3 py-3">
                            <span className="rank-number" style={{ color: snap.numFivles > 0 ? "#fbbf24" : "oklch(0.35 0.02 85)" }}>
                              {snap.numFivles}
                            </span>
                          </td>
                          {/* Tenples */}
                          <td className="px-3 py-3">
                            <span className="rank-number" style={{ color: snap.numTenples > 0 ? "#a78bfa" : "oklch(0.35 0.02 85)" }}>
                              {snap.numTenples}
                            </span>
                          </td>
                          {/* FiveMottes */}
                          <td className="px-3 py-3">
                            <span className="rank-number" style={{ color: snap.fiveMottes > 0 ? "#f87171" : "oklch(0.35 0.02 85)" }}>
                              {snap.fiveMottes}
                            </span>
                          </td>
                        </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Legend for milestones */}
                <div className="px-5 py-3 flex flex-wrap gap-4 text-xs" style={{ borderTop: "1px solid oklch(0.18 0.02 155)", color: "oklch(0.45 0.02 85)" }}>
                  <span><span style={{ color: "#fbbf24" }}>Fivple</span> = 5 consecutive wins in a tournament</span>
                  <span><span style={{ color: "#a78bfa" }}>Tenple</span> = 10 consecutive wins</span>
                  <span><span style={{ color: "#f87171" }}>FiveMotte</span> = 5 consecutive losses</span>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </Layout>
  );
}

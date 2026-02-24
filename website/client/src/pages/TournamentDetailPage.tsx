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
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter,
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

  // ── Widget 1: Rating Swing cards ────────────────────────────────────────
  const ratingSwings = snapshot
    ? Object.entries(snapshot)
        .filter(([, s]) => !(s as any).isGuest)
        .map(([player, s]) => ({ player, change: s.ratingChange, before: s.ratingBefore, after: s.ratingAfter }))
        .sort((a, b) => b.change - a.change)
    : [];
  const biggestGainer = ratingSwings[0];
  const biggestLoser = ratingSwings[ratingSwings.length - 1];

  // ── Widget 2: Momentum chart (adaptive rolling win rate) ───────────────────
  // Use a larger window for longer tournaments to reduce noise:
  //   < 30 rounds  → 5-game window
  //   30–59 rounds → 8-game window
  //   60+ rounds   → 10-game window
  const momentumWindow = (() => {
    const n = tournament?.totalGames ?? 0;
    if (n >= 60) return 10;
    if (n >= 30) return 8;
    return 5;
  })();
  const momentumData = (() => {
    const gamePoints = tournament?.gameData || [];
    const W = momentumWindow;
    if (gamePoints.length < W) return [];
    // Use the direct won_<player> boolean from the data pipeline (1 = scored > 0 that round)
    return gamePoints.slice(W - 1).map((_, idx) => {
      const window = gamePoints.slice(idx, idx + W);
      const row: Record<string, number> = { game: gamePoints[idx + W - 1].game };
      players.forEach((p) => {
        const wins = window.filter((pt) => (pt[`won_${p}`] ?? 0) === 1).length;
        row[p] = Math.round((wins / W) * 100);
      });
      return row;
    });
  })();

  // ── Widget 4: Partnership matrix data ────────────────────────────────────
  // Already in tournament.pairwiseStats — just need best pair
  const bestPair = tournament?.pairwiseStats.length
    ? [...tournament.pairwiseStats].sort((a, b) => b.WinPercentage - a.WinPercentage)[0]
    : null;

  // ── Widget 5: Dream Team (best trio) ─────────────────────────────────────
  const dreamTeam = tournament?.trioStats.length
    ? [...tournament.trioStats].sort((a, b) => b.WinPercentage - a.WinPercentage)[0]
    : null;

  // ── Consistency stats ────────────────────────────────────────────
  const consistencyStats = tournament?.consistencyStats || {};

  // ── Widget 6: Auto-generated "at a glance" summary ────────────────────────
  const glanceSummary = (() => {
    if (!tournament || tournament.playerStats.length < 2) return null;
    const ps = tournament.playerStats;
    const winner = ps[0];
    const runnerUp = ps[1];
    const last = ps[ps.length - 1];
    const gap = winner.TotalPoints - runnerUp.TotalPoints;

    // Dominant win: gap > 10% of winner's total
    const isDominant = gap > winner.TotalPoints * 0.10;
    // Close finish: gap < 3% of winner's total
    const isClose = gap < winner.TotalPoints * 0.03;

    // Find the most consistent player (lowest CV)
    const cvEntries = Object.entries(consistencyStats)
      .filter(([, cs]) => cs)
      .sort(([, a], [, b]) => a.cv - b.cv);
    const mostConsistent = cvEntries[0]?.[0];
    // mostStreaky available for future use
    // const mostStreaky = cvEntries[cvEntries.length - 1]?.[0];

    // Find biggest momentum swing from momentumData
    let bigMomentumPlayer: string | null = null;
    if (momentumData.length >= 2) {
      let maxSwing = 0;
      players.forEach((p) => {
        const vals = momentumData.map((d) => d[p] ?? 0);
        const swing = Math.max(...vals) - Math.min(...vals);
        if (swing > maxSwing) { maxSwing = swing; bigMomentumPlayer = p; }
      });
    }

    // Comeback detection: was the winner NOT leading at the halfway point?
    // Use cumsum at the midpoint round to determine standings then.
    const gameData = tournament.gameData || [];
    let comebackFrom: string | null = null;  // name of who WAS leading at the midpoint
    if (gameData.length >= 4) {
      const midRow = gameData[Math.floor(gameData.length / 2) - 1];
      const midScores = players.map((p) => ({ p, score: midRow[`cumsum_${p}`] ?? 0 }));
      midScores.sort((a, b) => b.score - a.score);
      const midLeader = midScores[0].p;
      const winnerRankAtMid = midScores.findIndex((x) => x.p === winner.Player) + 1;
      // Only flag as a comeback if winner was 2nd or lower at the midpoint
      if (winnerRankAtMid >= 2 && midLeader !== winner.Player) {
        comebackFrom = midLeader;
      }
    }

    const parts: string[] = [];

    // Opening: who won and how (with optional comeback suffix)
    const comebackSuffix = comebackFrom ? `, coming from behind ${comebackFrom} at the halfway mark` : '';
    if (isDominant) {
      parts.push(`${winner.Player} dominated, finishing ${gap.toLocaleString()} pts clear of ${runnerUp.Player}${comebackSuffix}`);
    } else if (isClose) {
      parts.push(`${winner.Player} edged out ${runnerUp.Player} by just ${gap.toLocaleString()} pts in a tight finish${comebackSuffix}`);
    } else {
      parts.push(`${winner.Player} won with ${winner.TotalPoints.toLocaleString()} pts, ${gap.toLocaleString()} ahead of ${runnerUp.Player}${comebackSuffix}`);
    }

    // Consistency note
    if (mostConsistent && mostConsistent !== winner.Player) {
      parts.push(`${mostConsistent} was the most consistent scorer`);
    } else if (mostConsistent) {
      parts.push(`${winner.Player} also led in consistency`);
    }

    // Momentum note
    if (bigMomentumPlayer && bigMomentumPlayer !== winner.Player) {
      parts.push(`${bigMomentumPlayer} had the biggest momentum swings`);
    }

    // Tail note: who struggled
    if (last.WinPercentage < 40) {
      parts.push(`${last.Player} had a tough tournament at ${last.WinPercentage}% win rate`);
    }

    return parts.join('; ') + '.';
  })();

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

            {/* ── At a Glance summary ───────────────────────────────────────── */}
            {glanceSummary && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-lg px-5 py-3.5 flex items-start gap-3"
                style={{ background: "oklch(0.14 0.025 155)", border: "1px solid oklch(0.22 0.04 155)" }}
              >
                <span className="text-base mt-0.5" style={{ color: "oklch(0.78 0.15 85)" }}>♠</span>
                <p className="text-sm leading-relaxed" style={{ color: "oklch(0.72 0.015 85)" }}>
                  {glanceSummary}
                </p>
              </motion.div>
            )}

            {/* ── 2. Final Standings ───────────────────────────────────────── */}
            <div className="felt-card rounded-lg overflow-hidden">
              <SectionHeader title="Final Standings" />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid oklch(0.18 0.02 155)" }}>
                      {["#", "Player", "Total Points", "Wins", "Win Rate", "Avg Points"].map((h) => (
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


            {/* ── NEW: Rating Swing + Biggest Mover cards ──────────────────── */}
            {ratingSwings.length > 0 && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Biggest Gainer */}
                {biggestGainer && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="felt-card rounded-lg p-4"
                    style={{ borderTop: "3px solid #34d399" }}
                  >
                    <div className="text-xs uppercase tracking-wider mb-2" style={{ color: "#34d399" }}>📈 Biggest Gainer</div>
                    <div className="text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif", color: getPlayerColor(biggestGainer.player) }}>
                      {biggestGainer.player}
                    </div>
                    <div className="rank-number text-2xl font-bold" style={{ color: "#34d399" }}>+{biggestGainer.change}</div>
                    <div className="text-xs mt-1" style={{ color: "oklch(0.45 0.02 85)" }}>
                      {biggestGainer.before} → {biggestGainer.after}
                    </div>
                  </motion.div>
                )}
                {/* Biggest Loser — only show when the drop is meaningful (>= 5 pts);
                    otherwise show "Closest Finish" (smallest points gap between 1st and 2nd) */}
                {(() => {
                  const MEANINGFUL_DROP = 5;
                  if (biggestLoser && biggestLoser.change <= -MEANINGFUL_DROP) {
                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="felt-card rounded-lg p-4"
                        style={{ borderTop: "3px solid #f87171" }}
                      >
                        <div className="text-xs uppercase tracking-wider mb-2" style={{ color: "#f87171" }}>📉 Biggest Drop</div>
                        <div className="text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif", color: getPlayerColor(biggestLoser.player) }}>
                          {biggestLoser.player}
                        </div>
                        <div className="rank-number text-2xl font-bold" style={{ color: "#f87171" }}>{biggestLoser.change}</div>
                        <div className="text-xs mt-1" style={{ color: "oklch(0.45 0.02 85)" }}>
                          {biggestLoser.before} → {biggestLoser.after}
                        </div>
                      </motion.div>
                    );
                  }
                  // Fallback: show the closest finish (tightest points gap in final standings)
                  const ps = tournament.playerStats;
                  if (ps.length >= 2) {
                    const gap = ps[0].TotalPoints - ps[1].TotalPoints;
                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="felt-card rounded-lg p-4"
                        style={{ borderTop: "3px solid #60a5fa" }}
                      >
                        <div className="text-xs uppercase tracking-wider mb-2" style={{ color: "#60a5fa" }}>⚔️ Closest Finish</div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif", color: getPlayerColor(ps[0].Player) }}>{ps[0].Player}</span>
                          <span className="text-sm" style={{ color: "oklch(0.40 0.02 85)" }}>vs</span>
                          <span className="text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif", color: getPlayerColor(ps[1].Player) }}>{ps[1].Player}</span>
                        </div>
                        <div className="rank-number text-2xl font-bold" style={{ color: "#60a5fa" }}>
                          {gap.toLocaleString()} pts
                        </div>
                        <div className="text-xs mt-1" style={{ color: "oklch(0.45 0.02 85)" }}>
                          margin between 1st &amp; 2nd
                        </div>
                      </motion.div>
                    );
                  }
                  return null;
                })()}
                {/* Best Pair */}
                {bestPair && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.10 }}
                    className="felt-card rounded-lg p-4"
                    style={{ borderTop: "3px solid oklch(0.78 0.15 85)" }}
                  >
                    <div className="text-xs uppercase tracking-wider mb-2" style={{ color: "oklch(0.78 0.15 85)" }}>🤝 Best Pair</div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-bold text-sm" style={{ color: getPlayerColor(bestPair.Player_x) }}>{bestPair.Player_x}</span>
                      <span className="text-xs" style={{ color: "oklch(0.40 0.02 85)" }}>+</span>
                      <span className="font-bold text-sm" style={{ color: getPlayerColor(bestPair.Player_y) }}>{bestPair.Player_y}</span>
                    </div>
                    <div className="rank-number text-2xl font-bold" style={{ color: "oklch(0.78 0.15 85)" }}>{bestPair.WinPercentage}%</div>
                    <div className="text-xs mt-1" style={{ color: "oklch(0.45 0.02 85)" }}>
                      {bestPair.Wins}W / {bestPair.Losses}L in {bestPair.TotalGames} games
                    </div>
                  </motion.div>
                )}
                {/* Dream Team */}
                {dreamTeam && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="felt-card rounded-lg p-4"
                    style={{ borderTop: "3px solid #a78bfa" }}
                  >
                    <div className="text-xs uppercase tracking-wider mb-2" style={{ color: "#a78bfa" }}>🏆 Dream Trio</div>
                    <div className="flex flex-wrap gap-1 mb-1">
                      {[dreamTeam.Player_x, dreamTeam.Player_y, dreamTeam.Player_z].map((p, i) => (
                        <span key={p} className="font-bold text-xs" style={{ color: getPlayerColor(p) }}>
                          {i > 0 && <span style={{ color: "oklch(0.35 0.02 85)" }}> + </span>}{p}
                        </span>
                      ))}
                    </div>
                    <div className="rank-number text-2xl font-bold" style={{ color: "#a78bfa" }}>{dreamTeam.WinPercentage}%</div>
                    <div className="text-xs mt-1" style={{ color: "oklch(0.45 0.02 85)" }}>
                      {dreamTeam.Wins}W / {dreamTeam.Losses}L in {dreamTeam.TotalGames} games
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* ── NEW: Momentum Chart (rolling 5-game win rate) ────────────────── */}
            {momentumData.length > 0 && (
              <div className="felt-card rounded-lg overflow-hidden">
                <SectionHeader
                  title={`Momentum (Rolling ${momentumWindow}-Game Win Rate)`}
                  subtitle={`Win rate over the last ${momentumWindow} rounds — shows who was in form vs. fading mid-tournament`}
                />
                <div className="p-4">
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={momentumData} margin={{ top: 4, right: 8, bottom: 16, left: -10 }}>
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
                        formatter={(value: number) => [`${value}%`]}
                      />
                      <ReferenceLine y={50} stroke="oklch(0.35 0.03 155)" strokeDasharray="4 4" label={{ value: "50%", fill: "oklch(0.35 0.03 155)", fontSize: 9 }} />
                      {players.map((p) => (
                        <Line key={p} type="monotone" dataKey={p} stroke={getPlayerColor(p)} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                  <ChartLegend players={players} />
                </div>
              </div>
            )}


            {/* ── NEW: Consistency Cards ───────────────────────────────────────── */}
            {Object.keys(consistencyStats).length > 0 && (() => {
              // Sort ascending by CV — most consistent (lowest CV) first
              const sorted = players
                .filter((p) => consistencyStats[p])
                .sort((a, b) => (consistencyStats[a]?.cv ?? 999) - (consistencyStats[b]?.cv ?? 999));
              const maxCv = Math.max(...sorted.map((p) => consistencyStats[p]?.cv ?? 0));
              const minCv = Math.min(...sorted.map((p) => consistencyStats[p]?.cv ?? 0));

              // Label helper: describe how steady a player is
              const steadinessLabel = (cv: number) => {
                if (cv < 0.8) return { label: "Rock Solid", color: "#34d399" };
                if (cv < 1.0) return { label: "Steady", color: "#86efac" };
                if (cv < 1.2) return { label: "Variable", color: "oklch(0.78 0.15 85)" };
                return { label: "Streaky", color: "#f87171" };
              };

              return (
                <div className="felt-card rounded-lg overflow-hidden">
                  <SectionHeader
                    title="Consistency Index"
                    subtitle="Coefficient of Variation (CV) = std dev ÷ mean across all rounds. Lower CV = more consistent — a player who scores steadily beats one who alternates big wins and blanks."
                  />
                  <div className="p-5 space-y-3">
                    {sorted.map((p, i) => {
                      const cs = consistencyStats[p];
                      const { label, color } = steadinessLabel(cs.cv);
                      // Bar fills inversely: most consistent gets widest bar
                      const barPct = maxCv > minCv
                        ? Math.round(((maxCv - cs.cv) / (maxCv - minCv)) * 80 + 20)
                        : 60;
                      return (
                        <motion.div
                          key={p}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className="flex items-center gap-3"
                        >
                          {/* Rank badge */}
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ background: i === 0 ? "#fbbf24" : "oklch(0.20 0.02 155)", color: i === 0 ? "#000" : "oklch(0.55 0.02 85)" }}
                          >
                            {i + 1}
                          </div>
                          {/* Player name */}
                          <div className="w-20 text-sm font-semibold flex-shrink-0" style={{ color: getPlayerColor(p) }}>{p}</div>
                          {/* Bar track */}
                          <div className="flex-1 relative h-6 rounded" style={{ background: "oklch(0.14 0.018 155)" }}>
                            <motion.div
                              className="absolute inset-y-0 left-0 rounded"
                              style={{ background: `${color}33`, width: `${barPct}%` }}
                              initial={{ width: 0 }}
                              animate={{ width: `${barPct}%` }}
                              transition={{ delay: i * 0.06 + 0.1, duration: 0.5 }}
                            />
                            <div className="absolute inset-0 flex items-center px-2.5 gap-2">
                              <span className="text-xs font-bold" style={{ color }}>{label}</span>
                              <span className="text-xs" style={{ color: "oklch(0.45 0.02 85)" }}>
                                CV {(cs.cv).toFixed(2)}
                              </span>
                            </div>
                          </div>
                          {/* Stats */}
                          <div className="text-right flex-shrink-0 w-28">
                            <div className="text-xs" style={{ color: "oklch(0.55 0.02 85)" }}>
                              avg <span style={{ color: "oklch(0.75 0.02 85)" }}>{Math.round(cs.mean)}</span> pts/round
                            </div>
                            <div className="text-xs" style={{ color: "oklch(0.40 0.02 85)" }}>
                              on wins: {Math.round(cs.meanWins ?? cs.mean)}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                    <div className="text-xs pt-1" style={{ color: "oklch(0.38 0.02 85)" }}>
                      ← lower CV = more consistent &nbsp;|&nbsp; higher CV = more streaky
                    </div>
                  </div>
                </div>
              );
            })()}

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
                  subtitle={
                    tournament.hasBidderData
                      ? "Bid success rate for this tournament — attempts, wins, and conversion rate"
                      : "Estimated bid wins (bidder column not available for this tournament)"
                  }
                />
                <div className="p-5">
                  {tournament.hasBidderData ? (
                    /* Named-bidder view: show attempts / wins / rate */
                    <div className="flex flex-wrap gap-4">
                      {tournament.bidAndWon
                        .filter((b) => (tournament.bidStatsByPlayer?.[b.Player]?.bidAttempts ?? 0) > 0)
                        .sort((a, b) => {
                          const rA = tournament.bidStatsByPlayer?.[a.Player]?.bidWinRate ?? 0;
                          const rB = tournament.bidStatsByPlayer?.[b.Player]?.bidWinRate ?? 0;
                          return rB - rA;
                        })
                        .map((b, i) => {
                          const bs = tournament.bidStatsByPlayer?.[b.Player];
                          if (!bs) return null;
                          return (
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
                                <div className="flex items-baseline gap-1.5 mt-0.5">
                                  <span className="rank-number text-lg font-bold" style={{ color: "oklch(0.88 0.015 85)" }}>
                                    {bs.bidWinRate !== null ? `${bs.bidWinRate}%` : "—"}
                                  </span>
                                  <span className="text-xs" style={{ color: "oklch(0.50 0.02 85)" }}>
                                    {bs.bidWins}W / {bs.bidAttempts}
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                    </div>
                  ) : (
                    /* Heuristic view: raw count with disclaimer */
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
                  )}
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
                          { label: "Milestones", icon: null },
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
                          {/* Milestones: collapsed badges */}
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {/* Win streak badge — always shown */}
                              <span
                                className="rank-number text-xs px-1.5 py-0.5 rounded"
                                title={`Best win streak: ${snap.bestWinStreak}`}
                                style={{
                                  background: snap.bestWinStreak >= 5 ? "oklch(0.22 0.06 85)" : "oklch(0.14 0.02 85)",
                                  color: snap.bestWinStreak >= 5 ? "#fbbf24" : "oklch(0.40 0.02 85)",
                                }}
                              >
                                🔥×{snap.bestWinStreak}
                              </span>
                              {/* Loss streak badge — always shown */}
                              <span
                                className="rank-number text-xs px-1.5 py-0.5 rounded"
                                title={`Worst loss streak: ${snap.worstLossStreak}`}
                                style={{
                                  background: snap.worstLossStreak >= 5 ? "oklch(0.20 0.05 15)" : "oklch(0.14 0.02 85)",
                                  color: snap.worstLossStreak >= 5 ? "#f87171" : "oklch(0.40 0.02 85)",
                                }}
                              >
                                💀×{snap.worstLossStreak}
                              </span>
                              {/* Fivples — only if > 0 */}
                              {snap.numFivles > 0 && (
                                <span
                                  className="rank-number text-xs px-1.5 py-0.5 rounded"
                                  title={`Fivples (5 consecutive wins in a tournament): ${snap.numFivles}`}
                                  style={{ background: "oklch(0.22 0.06 85)", color: "#fbbf24" }}
                                >
                                  ⚡×{snap.numFivles}
                                </span>
                              )}
                              {/* Tenples — only if > 0 */}
                              {snap.numTenples > 0 && (
                                <span
                                  className="rank-number text-xs px-1.5 py-0.5 rounded"
                                  title={`Tenples (10 consecutive wins): ${snap.numTenples}`}
                                  style={{ background: "oklch(0.20 0.06 290)", color: "#a78bfa" }}
                                >
                                  👑×{snap.numTenples}
                                </span>
                              )}
                              {/* FiveMottes — only if > 0 */}
                              {snap.fiveMottes > 0 && (
                                <span
                                  className="rank-number text-xs px-1.5 py-0.5 rounded"
                                  title={`FiveMottes (5 consecutive losses): ${snap.fiveMottes}`}
                                  style={{ background: "oklch(0.20 0.05 15)", color: "#f87171" }}
                                >
                                  🥚×{snap.fiveMottes}
                                </span>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Legend for milestones */}
                <div className="px-5 py-3 flex flex-wrap gap-4 text-xs" style={{ borderTop: "1px solid oklch(0.18 0.02 155)", color: "oklch(0.45 0.02 85)" }}>
                  <span>🔥 = best win streak &nbsp;💀 = worst loss streak</span>
                  <span><span style={{ color: "#fbbf24" }}>⚡ Fivple</span> = 5 consec. wins in a tournament</span>
                  <span><span style={{ color: "#a78bfa" }}>👑 Tenple</span> = 10 consec. wins</span>
                  <span><span style={{ color: "#f87171" }}>🥚 FiveMotte</span> = 5 consec. losses</span>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </Layout>
  );
}

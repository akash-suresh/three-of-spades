/*
 * CareerStatsPage — Dark Casino / Art Deco Design System
 * All-time career stats comparison across all core players
 * Sections: Hero stats, Comparison table, Win rate chart, Bid success, Milestones
 */
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { fetchGameData, type GameData } from "@/lib/gameData";
import { motion } from "framer-motion";
import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, Legend, CartesianGrid,
} from "recharts";
import { PLAYER_COLORS, getPlayerColor } from "@/lib/gameData";
import { Trophy, Zap, Crown, Egg, Flame, Skull, Target, TrendingUp } from "lucide-react";

const GOLD = "oklch(0.78 0.15 85)";
const DIM = "oklch(0.55 0.02 85)";
const CARD_BG = "oklch(0.13 0.016 155)";
const BORDER = "oklch(0.22 0.03 155)";
const FELT = "oklch(0.10 0.012 155)";

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-5 py-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
      <h2 className="text-base font-semibold tracking-wide" style={{ color: GOLD, fontFamily: "'Playfair Display', serif" }}>
        {title}
      </h2>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: DIM }}>{subtitle}</p>}
    </div>
  );
}

const CORE_PLAYERS = ["Akash", "Nats", "Prateek", "Abhi", "Ani", "Naati", "Skanda"];

export default function CareerStatsPage() {
  const [data, setData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchGameData()
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64" style={{ color: DIM }}>
          Loading career stats…
        </div>
      </Layout>
    );
  }
  if (error || !data) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64" style={{ color: "oklch(0.65 0.15 20)" }}>
          Failed to load data.
        </div>
      </Layout>
    );
  }

  const { careerStats, allTimeStats, ratingHistory, tournamentSummary, players } = data;

  // Core players only (ordered by career games desc)
  const corePlayers = CORE_PLAYERS.filter(p => careerStats[p]);

  // Build per-player tournament participation count
  const tourneyCount: Record<string, number> = {};
  for (const t of tournamentSummary) {
    for (const p of t.players) {
      tourneyCount[p] = (tourneyCount[p] || 0) + 1;
    }
  }

  // Tournament wins per player (co-winners each get a win)
  const tourneyWins: Record<string, number> = {};
  for (const t of tournamentSummary) {
    const ws = t.winners?.length > 0 ? t.winners : (t.winner ? [t.winner] : []);
    for (const w of ws) tourneyWins[w] = (tourneyWins[w] || 0) + 1;
  }

  // Build combined rows
  const rows = corePlayers.map(p => {
    const cs = careerStats[p];
    const ats = allTimeStats.find((s: { player: string }) => s.player === p);
    return {
      player: p,
      careerGames: cs.careerGames,
      careerWins: cs.careerWins,
      winPct: cs.winPct,
      avgPoints: ats?.avgPoints ?? 0,
      totalPoints: ats?.totalPoints ?? 0,
      tourneyPlayed: tourneyCount[p] || 0,
      tourneyWins: tourneyWins[p] || 0,
      bidAttempts: cs.bidAttempts,
      bidWins: cs.bidWins,
      bidWinRate: cs.bidWinRate,
      bestWinStreak: cs.bestWinStreak,
      worstLossStreak: cs.worstLossStreak,
      numFivles: cs.numFivles,
      numTenples: cs.numTenples,
      fiveMottes: cs.fiveMottes,
    };
  }).sort((a, b) => b.winPct - a.winPct);

  // Win rate bar chart data
  const winRateData = rows.map(r => ({ name: r.player, winRate: r.winPct }));

  // Bid success bar chart data — require at least 10 attempts for a meaningful rate
  const BID_MIN_ATTEMPTS = 10;
  const bidData = rows
    .filter(r => r.bidAttempts >= BID_MIN_ATTEMPTS && r.bidWinRate !== null)
    .map(r => ({ name: r.player, bidRate: r.bidWinRate as number, attempts: r.bidAttempts }));

  // Milestone bar chart
  const milestoneData = rows.map(r => ({
    name: r.player,
    Fivples: r.numFivles,
    Tenples: r.numTenples,
    FiveMottes: r.fiveMottes,
  }));

  // Rating history line chart — last 28 entries
  const ratingData = ratingHistory.slice(1); // skip index 0 (all 1000)

  // Radar chart: normalise each metric to 0–100 across players
  const maxWinPct = Math.max(...rows.map(r => r.winPct));
  const maxAvgPts = Math.max(...rows.map(r => r.avgPoints));
  const maxTourneyWins = Math.max(...rows.map(r => r.tourneyWins));
  const maxFivples = Math.max(...rows.map(r => r.numFivles));
  const maxBidRate = Math.max(...rows.filter(r => r.bidWinRate !== null).map(r => r.bidWinRate as number));

  const radarData = [
    { metric: "Win %", ...Object.fromEntries(rows.map(r => [r.player, Math.round((r.winPct / maxWinPct) * 100)])) },
    { metric: "Avg Pts", ...Object.fromEntries(rows.map(r => [r.player, Math.round((r.avgPoints / maxAvgPts) * 100)])) },
    { metric: "Tourney Wins", ...Object.fromEntries(rows.map(r => [r.player, Math.round((r.tourneyWins / (maxTourneyWins || 1)) * 100)])) },
    { metric: "Fivples", ...Object.fromEntries(rows.map(r => [r.player, Math.round((r.numFivles / (maxFivples || 1)) * 100)])) },
    { metric: "Bid Rate", ...Object.fromEntries(rows.map(r => [r.player, r.bidWinRate !== null ? Math.round((r.bidWinRate / (maxBidRate || 1)) * 100) : 0])) },
  ];

  const tooltipStyle = {
    backgroundColor: "oklch(0.14 0.018 155)",
    border: `1px solid ${BORDER}`,
    borderRadius: "6px",
    color: "oklch(0.88 0.02 85)",
    fontSize: "12px",
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto">

        {/* Page header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1
            className="text-2xl md:text-3xl font-bold tracking-tight"
            style={{ color: GOLD, fontFamily: "'Playfair Display', serif" }}
          >
            Career Stats
          </h1>
          <p className="text-sm mt-1" style={{ color: DIM }}>
            All-time records across {tournamentSummary.length} tournaments
          </p>
        </motion.div>

        {/* Hero stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(() => {
            const topWins = [...rows].sort((a,b)=>b.tourneyWins-a.tourneyWins)[0];
            const topWinRate = [...rows].sort((a,b)=>b.winPct-a.winPct)[0];
            const topFivples = [...rows].sort((a,b)=>b.numFivles-a.numFivles)[0];
            const sortedBid = [...bidData].sort((a,b)=>b.bidRate-a.bidRate);
            const topBid = sortedBid[0];
            return [
              { label: "Most Tournament Wins", value: topWins?.player, sub: `${topWins?.tourneyWins} wins`, icon: Trophy },
              { label: "Highest Win Rate", value: topWinRate?.player, sub: `${topWinRate?.winPct}%`, icon: TrendingUp },
              { label: "Most Fivples", value: topFivples?.player, sub: `${topFivples?.numFivles} Fivples`, icon: Zap },
              { label: "Best Bid Rate", value: topBid?.name ?? "—", sub: topBid ? `${topBid.bidRate.toFixed(1)}% (${topBid.attempts} bids)` : "—", icon: Target },
            ];
          })().map(({ label, value, sub, icon: Icon }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-lg p-4"
              style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} style={{ color: GOLD }} />
                <span className="text-xs uppercase tracking-wider" style={{ color: DIM }}>{label}</span>
              </div>
              <div className="text-lg font-bold" style={{ color: getPlayerColor(value || ""), fontFamily: "'Playfair Display', serif" }}>
                {value}
              </div>
              <div className="text-xs mt-0.5" style={{ color: DIM }}>{sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Comparison table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="rounded-lg overflow-hidden"
          style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
        >
          <SectionHeader title="All-Time Comparison" subtitle="Sorted by win percentage" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Player", "Games", "Wins", "Win %", "Avg Pts", "Tourneys", "🏆 Wins", "Bid Rate", "🔥 Streak", "💀 Streak", "⚡ Fivples", "👑 Tenples", "🥚 FiveMottes"].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: DIM }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <motion.tr
                    key={r.player}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.05 }}
                    className="transition-colors"
                    style={{ borderBottom: i < rows.length - 1 ? `1px solid oklch(0.15 0.018 155)` : "none" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "oklch(0.15 0.018 155)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: getPlayerColor(r.player) }} />
                        <span className="font-semibold" style={{ color: getPlayerColor(r.player) }}>{r.player}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3" style={{ color: "oklch(0.80 0.015 85)" }}>{r.careerGames.toLocaleString()}</td>
                    <td className="px-3 py-3" style={{ color: "oklch(0.80 0.015 85)" }}>{r.careerWins.toLocaleString()}</td>
                    <td className="px-3 py-3">
                      <span className="font-semibold" style={{ color: r.winPct >= 55 ? "oklch(0.75 0.18 155)" : r.winPct >= 50 ? GOLD : "oklch(0.65 0.12 20)" }}>
                        {r.winPct}%
                      </span>
                    </td>
                    <td className="px-3 py-3" style={{ color: "oklch(0.80 0.015 85)" }}>{r.avgPoints.toFixed(1)}</td>
                    <td className="px-3 py-3" style={{ color: "oklch(0.80 0.015 85)" }}>{r.tourneyPlayed}</td>
                    <td className="px-3 py-3">
                      <span style={{ color: r.tourneyWins > 0 ? GOLD : DIM }}>{r.tourneyWins}</span>
                    </td>
                    <td className="px-3 py-3">
                      {r.bidAttempts >= BID_MIN_ATTEMPTS && r.bidWinRate !== null
                        ? <span style={{ color: r.bidWinRate >= 50 ? "oklch(0.75 0.18 155)" : "oklch(0.80 0.015 85)" }}>{r.bidWinRate.toFixed(1)}%</span>
                        : r.bidAttempts > 0
                          ? <span style={{ color: DIM }} title={`Only ${r.bidAttempts} bid attempts — too few to rank`}>{r.bidWinRate?.toFixed(0)}% <span className="text-xs" style={{ color: "oklch(0.45 0.02 85)" }}>({r.bidAttempts})</span></span>
                          : <span style={{ color: DIM }}>—</span>
                      }
                    </td>
                    <td className="px-3 py-3">
                      <span style={{ color: r.bestWinStreak >= 10 ? GOLD : r.bestWinStreak >= 5 ? "oklch(0.75 0.18 155)" : "oklch(0.80 0.015 85)" }}>
                        {r.bestWinStreak}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span style={{ color: r.worstLossStreak >= 5 ? "oklch(0.65 0.12 20)" : "oklch(0.80 0.015 85)" }}>
                        {r.worstLossStreak}
                      </span>
                    </td>
                    <td className="px-3 py-3" style={{ color: "oklch(0.80 0.015 85)" }}>{r.numFivles}</td>
                    <td className="px-3 py-3" style={{ color: r.numTenples > 0 ? GOLD : DIM }}>{r.numTenples}</td>
                    <td className="px-3 py-3" style={{ color: "oklch(0.80 0.015 85)" }}>{r.fiveMottes}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Charts row 1: Win Rate + Bid Rate */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-lg overflow-hidden"
            style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
          >
            <SectionHeader title="Win Rate" subtitle="Career win percentage per player" />
            <div className="p-4" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={winRateData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.18 0.02 155)" />
                  <XAxis dataKey="name" tick={{ fill: DIM, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: DIM, fontSize: 10 }} domain={[40, 65]} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => [`${v}%`, "Win Rate"]}
                  />
                  <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                    {winRateData.map((entry) => (
                      <Cell key={entry.name} fill={getPlayerColor(entry.name)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="rounded-lg overflow-hidden"
            style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
          >
            <SectionHeader title="Bid Success Rate" subtitle="Win % when named as bidder (14 tournaments)" />
            <div className="p-4" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bidData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.18 0.02 155)" />
                  <XAxis dataKey="name" tick={{ fill: DIM, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: DIM, fontSize: 10 }} domain={[30, 60]} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number, name: string) => name === "bidRate" ? [`${v.toFixed(1)}%`, "Bid Win Rate"] : [v, "Attempts"]}
                  />
                  <Bar dataKey="bidRate" radius={[4, 4, 0, 0]}>
                    {bidData.map((entry) => (
                      <Cell key={entry.name} fill={getPlayerColor(entry.name)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Charts row 2: Milestones + Rating History */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="rounded-lg overflow-hidden"
            style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
          >
            <SectionHeader title="Milestone Totals" subtitle="Career Fivples, Tenples, and FiveMottes" />
            <div className="p-4" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={milestoneData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.18 0.02 155)" />
                  <XAxis dataKey="name" tick={{ fill: DIM, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: DIM, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11, color: DIM }} />
                  <Bar dataKey="Fivples" stackId="a" fill="oklch(0.55 0.18 155)" radius={[0,0,0,0]} />
                  <Bar dataKey="Tenples" stackId="a" fill={GOLD} radius={[0,0,0,0]} />
                  <Bar dataKey="FiveMottes" stackId="a" fill="oklch(0.50 0.10 20)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="rounded-lg overflow-hidden"
            style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
          >
            <SectionHeader title="Rating History" subtitle="Elo rating progression across all tournaments" />
            <div className="p-4" style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ratingData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.18 0.02 155)" />
                  <XAxis dataKey="tournament" tick={{ fill: DIM, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: DIM, fontSize: 10 }} domain={["auto", "auto"]} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11, color: DIM }} />
                  {corePlayers.map(p => (
                    <Line
                      key={p}
                      type="monotone"
                      dataKey={p}
                      stroke={getPlayerColor(p)}
                      strokeWidth={1.5}
                      dot={false}
                      activeDot={{ r: 3 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Radar chart */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="rounded-lg overflow-hidden"
          style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
        >
          <SectionHeader title="Player Profiles (Radar)" subtitle="Normalised across Win %, Avg Points, Tournament Wins, Fivples, and Bid Rate" />
          <div className="p-4" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="oklch(0.22 0.03 155)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: DIM, fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                {corePlayers.map(p => (
                  <Radar
                    key={p}
                    name={p}
                    dataKey={p}
                    stroke={getPlayerColor(p)}
                    fill={getPlayerColor(p)}
                    fillOpacity={0.08}
                    strokeWidth={1.5}
                  />
                ))}
                <Legend wrapperStyle={{ fontSize: 11, color: DIM }} />
                <Tooltip contentStyle={tooltipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

      </div>
    </Layout>
  );
}

/*
 * PlayerProfilePage — Dark Casino / Art Deco Design System
 * Per-player deep-dive: career overview, tournament history table,
 * rating progression, consistency trend, milestone timeline
 */
import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import Layout from "@/components/Layout";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell, ReferenceLine,
} from "recharts";
import {
  fetchGameData, getPlayerColor, type GameData, type TournamentSummary,
  TOURNAMENT_TYPE_LABELS, TOURNAMENT_TYPE_COLORS,
} from "@/lib/gameData";
import { Trophy, Zap, Crown, Egg, Flame, Skull, Target, TrendingUp, ArrowLeft, Star } from "lucide-react";

const GOLD = "oklch(0.78 0.15 85)";
const DIM = "oklch(0.55 0.02 85)";
const CARD_BG = "oklch(0.13 0.016 155)";
const BORDER = "oklch(0.22 0.03 155)";

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

export default function PlayerProfilePage() {
  const params = useParams<{ player: string }>();
  const playerName = decodeURIComponent(params.player ?? "");

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
          Loading profile…
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

  const { careerStats, allTimeStats, ratingHistory, tournamentSummary, tournamentSnapshots } = data;

  const cs = careerStats[playerName];
  const ats = allTimeStats.find(s => s.player === playerName);

  if (!cs || !ats) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div style={{ color: DIM }}>Player "{playerName}" not found.</div>
          <Link href="/career-stats">
            <span className="text-sm underline" style={{ color: GOLD }}>← Back to Career Stats</span>
          </Link>
        </div>
      </Layout>
    );
  }

  const playerColor = getPlayerColor(playerName);

  // Tournament history: all tournaments this player participated in
  const playerTourneys = tournamentSummary
    .filter(t => t.players.includes(playerName))
    .map(t => {
      const ps = t.playerStats.find(s => s.Player === playerName);
      const snap = tournamentSnapshots[t.id]?.[playerName];
      const rank = t.playerStats
        .slice()
        .sort((a, b) => b.TotalPoints - a.TotalPoints)
        .findIndex(s => s.Player === playerName) + 1;
      return {
        id: t.id,
        displayName: t.displayName,
        type: t.type,
        totalGames: t.totalGames,
        winner: t.winner,
        wins: ps?.Wins ?? 0,
        totalPoints: ps?.TotalPoints ?? 0,
        winPct: ps?.WinPercentage ?? 0,
        avgPoints: ps?.AvgPoints ?? 0,
        rank,
        ratingChange: snap?.ratingChange ?? 0,
        ratingAfter: snap?.ratingAfter ?? 0,
        fivplesThisTourney: snap?.fivplesThisTourney ?? 0,
        tenplesThisTourney: snap?.tenplesThisTourney ?? 0,
        fiveMottesThisTourney: snap?.fiveMottesThisTourney ?? 0,
      };
    });

  // Short label helper: "Championship #3" -> "C#3", "Mini Championship #2" -> "MC#2",
  // "Tiny Championship #7" -> "TC#7", "International Friendly #1" -> "IF#1"
  function shortLabel(displayName: string): string {
    return displayName
      .replace("International Friendly", "IF")
      .replace("Tiny Championship", "TC")
      .replace("Mini Championship", "MC")
      .replace("Championship", "C")
      .replace(" #", "#");
  }

  // Rating progression for this player — keyed by short tournament label
  // ratingHistory[0] is the baseline (all 1000), ratingHistory[n] is after tournamentSummary[n-1]
  const ratingProgression = ratingHistory
    .filter(r => r[playerName] !== undefined)
    .map((r) => {
      const n = r.tournament as number;
      const tourney = n > 0 ? tournamentSummary[n - 1] : null;
      return {
        tournament: tourney ? shortLabel(tourney.displayName) : "Start",
        rating: r[playerName] as number,
      };
    });

  // Win rate per tournament — use short label as x-axis key
  const winRateByTourney = playerTourneys.map((t) => ({
    name: shortLabel(t.displayName),
    winRate: t.winPct,
    displayName: t.displayName,
  }));

  // Best and worst tournaments
  const sortedByWinPct = [...playerTourneys].sort((a, b) => b.winPct - a.winPct);
  const bestTourney = sortedByWinPct[0];
  const worstTourney = sortedByWinPct[sortedByWinPct.length - 1];
  const bestRatingGain = [...playerTourneys].sort((a, b) => b.ratingChange - a.ratingChange)[0];
  const tourneyWins = playerTourneys.filter(t => t.winner === playerName).length;

  const tooltipStyle = {
    backgroundColor: "oklch(0.14 0.018 155)",
    border: `1px solid ${BORDER}`,
    borderRadius: "6px",
    color: "oklch(0.88 0.02 85)",
    fontSize: "12px",
  };

  return (
    <Layout>
      <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">

        {/* Back link */}
        <Link href="/career-stats">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-1.5 text-sm cursor-pointer w-fit"
            style={{ color: DIM }}
            whileHover={{ color: GOLD }}
          >
            <ArrowLeft size={14} />
            Career Stats
          </motion.div>
        </Link>

        {/* Player header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg p-6"
          style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
        >
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0"
              style={{
                background: `${playerColor}22`,
                border: `2px solid ${playerColor}`,
                color: playerColor,
                fontFamily: "'Playfair Display', serif",
              }}
            >
              {playerName[0]}
            </div>
            {/* Name + quick stats */}
            <div className="flex-1">
              <h1
                className="text-2xl md:text-3xl font-bold"
                style={{ color: playerColor, fontFamily: "'Playfair Display', serif" }}
              >
                {playerName}
              </h1>
              <div className="flex flex-wrap gap-4 mt-2">
                <span className="text-sm" style={{ color: DIM }}>
                  <span style={{ color: GOLD, fontWeight: 600 }}>{cs.careerGames.toLocaleString()}</span> career rounds
                </span>
                <span className="text-sm" style={{ color: DIM }}>
                  <span style={{ color: GOLD, fontWeight: 600 }}>{playerTourneys.length}</span> tournaments
                </span>
                <span className="text-sm" style={{ color: DIM }}>
                  <span style={{ color: GOLD, fontWeight: 600 }}>{tourneyWins}</span> tournament wins
                </span>
                <span className="text-sm" style={{ color: DIM }}>
                  Current rating: <span style={{ color: GOLD, fontWeight: 600 }}>{ratingProgression[ratingProgression.length - 1]?.rating ?? "—"}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Stat pills */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            {[
              { label: "Win Rate", value: `${cs.winPct}%`, icon: TrendingUp },
              { label: "Avg Points", value: ats.avgPoints.toFixed(1), icon: Star },
              { label: "Best Win Streak", value: `${cs.bestWinStreak}`, icon: Flame },
              { label: "Worst Loss Streak", value: `${cs.worstLossStreak}`, icon: Skull },
              { label: "Fivples ⚡", value: `${cs.numFivles}`, icon: Zap },
              { label: "Tenples 👑", value: `${cs.numTenples}`, icon: Crown },
              { label: "FiveMottes 🥚", value: `${cs.fiveMottes}`, icon: Egg },
              { label: "Bid Win Rate", value: cs.bidWinRate !== null ? `${cs.bidWinRate.toFixed(1)}%` : "—", icon: Target },
            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="rounded p-3"
                style={{ background: "oklch(0.10 0.012 155)", border: `1px solid oklch(0.18 0.022 155)` }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={12} style={{ color: DIM }} />
                  <span className="text-xs" style={{ color: DIM }}>{label}</span>
                </div>
                <div className="text-lg font-bold" style={{ color: playerColor, fontFamily: "'Playfair Display', serif" }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Best / Worst highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              label: "Best Tournament",
              tourney: bestTourney,
              stat: `${bestTourney?.winPct}% win rate`,
              color: "oklch(0.75 0.18 155)",
              icon: Trophy,
            },
            {
              label: "Worst Tournament",
              tourney: worstTourney,
              stat: `${worstTourney?.winPct}% win rate`,
              color: "oklch(0.65 0.12 20)",
              icon: Skull,
            },
            {
              label: "Biggest Rating Gain",
              tourney: bestRatingGain,
              stat: `+${bestRatingGain?.ratingChange} pts`,
              color: GOLD,
              icon: TrendingUp,
            },
          ].map(({ label, tourney, stat, color, icon: Icon }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="rounded-lg p-4"
              style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} style={{ color }} />
                <span className="text-xs uppercase tracking-wider" style={{ color: DIM }}>{label}</span>
              </div>
              <div className="font-semibold text-sm" style={{ color }}>
                {tourney?.displayName ?? "—"}
              </div>
              <div className="text-xs mt-0.5" style={{ color: DIM }}>{stat}</div>
            </motion.div>
          ))}
        </div>

        {/* Charts: Rating progression + Win rate trend */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="rounded-lg overflow-hidden"
            style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
          >
            <SectionHeader title="Rating Progression" subtitle="Elo rating after each tournament" />
            <div className="p-4" style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ratingProgression} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.18 0.02 155)" />
                  <XAxis dataKey="tournament" tick={{ fill: DIM, fontSize: 9 }} axisLine={false} tickLine={false} angle={-40} textAnchor="end" height={40} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: DIM, fontSize: 10 }} domain={["auto", "auto"]} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, "Rating"]} />
                  <ReferenceLine y={1000} stroke="oklch(0.35 0.03 155)" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="rating" stroke={playerColor} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="rounded-lg overflow-hidden"
            style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
          >
            <SectionHeader title="Win Rate by Tournament" subtitle="Win % in each tournament played" />
            <div className="p-4" style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={winRateByTourney} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.18 0.02 155)" />
                  <XAxis dataKey="name" tick={{ fill: DIM, fontSize: 9 }} axisLine={false} tickLine={false} angle={-40} textAnchor="end" height={40} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: DIM, fontSize: 10 }} domain={[0, 100]} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number, _: string, props: { payload?: { displayName?: string } }) => [
                      `${v}%`,
                      props.payload?.displayName ?? "Win Rate",
                    ]}
                  />
                  <ReferenceLine y={50} stroke="oklch(0.35 0.03 155)" strokeDasharray="4 4" />
                  <Bar dataKey="winRate" radius={[3, 3, 0, 0]}>
                    {winRateByTourney.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.winRate >= 55 ? playerColor : entry.winRate >= 50 ? `${playerColor}99` : "oklch(0.40 0.08 20)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Tournament history table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="rounded-lg overflow-hidden"
          style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
        >
          <SectionHeader title="Tournament History" subtitle={`${playerTourneys.length} tournaments played`} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {["Tournament", "Type", "Finish", "Rounds", "Wins", "Win %", "Avg Pts", "Rating Δ", "Milestones"].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: DIM }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {playerTourneys.map((t, i) => (
                  <motion.tr
                    key={t.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35 + i * 0.02 }}
                    style={{ borderBottom: i < playerTourneys.length - 1 ? `1px solid oklch(0.15 0.018 155)` : "none" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "oklch(0.15 0.018 155)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td className="px-3 py-2.5">
                      <Link href={`/tournaments/${t.id}`}>
                        <span
                          className="font-medium text-xs cursor-pointer hover:underline"
                          style={{ color: t.winner === playerName ? GOLD : "oklch(0.80 0.015 85)" }}
                        >
                          {t.winner === playerName && <Trophy size={10} className="inline mr-1" style={{ color: GOLD }} />}
                          {t.displayName}
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          background: `${TOURNAMENT_TYPE_COLORS[t.type]}22`,
                          color: TOURNAMENT_TYPE_COLORS[t.type],
                          border: `1px solid ${TOURNAMENT_TYPE_COLORS[t.type]}44`,
                        }}
                      >
                        {TOURNAMENT_TYPE_LABELS[t.type].replace(" Championship", "").replace("International ", "")}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className="font-semibold text-xs"
                        style={{ color: t.rank === 1 ? GOLD : t.rank === 2 ? "oklch(0.75 0.05 85)" : DIM }}
                      >
                        {t.rank === 1 ? "🥇" : t.rank === 2 ? "🥈" : t.rank === 3 ? "🥉" : `#${t.rank}`}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: "oklch(0.75 0.015 85)" }}>{t.totalGames}</td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: "oklch(0.75 0.015 85)" }}>{t.wins}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className="text-xs font-medium"
                        style={{ color: t.winPct >= 55 ? "oklch(0.75 0.18 155)" : t.winPct >= 50 ? GOLD : "oklch(0.65 0.12 20)" }}
                      >
                        {t.winPct}%
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: "oklch(0.75 0.015 85)" }}>{t.avgPoints.toFixed(1)}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className="text-xs font-medium"
                        style={{ color: t.ratingChange > 0 ? "oklch(0.75 0.18 155)" : t.ratingChange < 0 ? "oklch(0.65 0.12 20)" : DIM }}
                      >
                        {t.ratingChange > 0 ? "+" : ""}{t.ratingChange}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 text-xs">
                        {t.tenplesThisTourney > 0 && (
                          <span title="Tenple">👑{t.tenplesThisTourney > 1 ? `×${t.tenplesThisTourney}` : ""}</span>
                        )}
                        {t.fivplesThisTourney > 0 && (
                          <span title="Fivple">⚡{t.fivplesThisTourney > 1 ? `×${t.fivplesThisTourney}` : ""}</span>
                        )}
                        {t.fiveMottesThisTourney > 0 && (
                          <span title="FiveMotte">🥚{t.fiveMottesThisTourney > 1 ? `×${t.fiveMottesThisTourney}` : ""}</span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Player switcher */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="rounded-lg p-4"
          style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
        >
          <div className="text-xs uppercase tracking-wider mb-3" style={{ color: DIM }}>Other Players</div>
          <div className="flex flex-wrap gap-2">
            {CORE_PLAYERS.filter(p => p !== playerName).map(p => (
              <Link key={p} href={`/players/${encodeURIComponent(p)}`}>
                <span
                  className="px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition-all"
                  style={{
                    background: `${getPlayerColor(p)}18`,
                    border: `1px solid ${getPlayerColor(p)}44`,
                    color: getPlayerColor(p),
                  }}
                >
                  {p}
                </span>
              </Link>
            ))}
          </div>
        </motion.div>

      </div>
    </Layout>
  );
}

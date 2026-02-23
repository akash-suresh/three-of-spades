/*
 * Rankings Page — Dark Casino / Art Deco Design System
 * Full leaderboard with rating history, win stats, and player breakdowns
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Trophy, TrendingUp, Target, Zap } from "lucide-react";
import Layout from "@/components/Layout";
import { fetchGameData, getPlayerColor, type GameData } from "@/lib/gameData";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, Cell
} from "recharts";

function PlayerCard({ player, rank, rating, allTimeStat, index }: {
  player: string;
  rank: number;
  rating: number;
  allTimeStat: any;
  index: number;
}) {
  const color = getPlayerColor(player);
  const rankColors: Record<number, string> = {
    1: "oklch(0.78 0.15 85)",
    2: "oklch(0.75 0.01 85)",
    3: "oklch(0.65 0.12 55)",
  };
  const rankColor = rankColors[rank] || "oklch(0.50 0.02 85)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="felt-card rounded-lg overflow-hidden"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      {/* Header */}
      <div className="px-5 py-4 flex items-center gap-4" style={{ borderBottom: "1px solid oklch(0.18 0.02 155)" }}>
        <div className="text-center">
          <div className="text-3xl font-bold rank-number" style={{ color: rankColor, lineHeight: 1 }}>
            {rank}
          </div>
          {rank === 1 && <Crown size={14} className="mx-auto mt-0.5" style={{ color: rankColor }} />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: color }} />
            <h3 className="text-xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.92 0.015 85)" }}>
              {player}
            </h3>
          </div>
          <div className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.02 85)" }}>
            Universal Rating
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold rank-number" style={{ color: "oklch(0.78 0.15 85)" }}>
            {Math.round(rating).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 divide-x" style={{ borderColor: "oklch(0.18 0.02 155)" }}>
        {[
          { label: "Tourney Wins", value: allTimeStat?.tournamentWins ?? "—", icon: Trophy },
          { label: "Win Rate", value: allTimeStat ? `${allTimeStat.winPercentage}%` : "—", icon: Target },
          { label: "Avg Points", value: allTimeStat?.avgPoints ?? "—", icon: TrendingUp },
          { label: "Games", value: allTimeStat?.totalGames?.toLocaleString() ?? "—", icon: Zap },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="px-3 py-3 text-center">
            <Icon size={12} className="mx-auto mb-1" style={{ color: "oklch(0.50 0.02 85)" }} />
            <div className="text-base font-semibold rank-number" style={{ color: "oklch(0.85 0.015 85)" }}>
              {value}
            </div>
            <div className="text-xs" style={{ color: "oklch(0.45 0.02 85)" }}>{label}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function RankingsPage() {
  const [data, setData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  useEffect(() => {
    fetchGameData().then((d) => {
      setData(d);
      setSelectedPlayer(d.players[0]);
    }).finally(() => setLoading(false));
  }, []);

  // Radar chart data for selected player
  const radarData = selectedPlayer && data
    ? (() => {
        const stat = data.allTimeStats.find((s) => s.player === selectedPlayer);
        if (!stat) return [];
        const maxWinPct = Math.max(...data.allTimeStats.map((s) => s.winPercentage));
        const maxAvgPts = Math.max(...data.allTimeStats.map((s) => s.avgPoints));
        const maxTWins = Math.max(...data.allTimeStats.map((s) => s.tournamentWins));
        const rating = data.rankings.find((r) => r.player === selectedPlayer)?.rating || 1000;
        const maxRating = Math.max(...data.rankings.map((r) => r.rating));
        return [
          { metric: "Win Rate", value: Math.round((stat.winPercentage / maxWinPct) * 100) },
          { metric: "Avg Points", value: Math.round((stat.avgPoints / maxAvgPts) * 100) },
          { metric: "Tourney Wins", value: Math.round((stat.tournamentWins / maxTWins) * 100) },
          { metric: "Rating", value: Math.round((rating / maxRating) * 100) },
          { metric: "Games Played", value: Math.round((stat.totalGames / Math.max(...data.allTimeStats.map((s) => s.totalGames))) * 100) },
        ];
      })()
    : [];

  // Win rate bar chart
  const winRateData = data?.allTimeStats.map((s) => ({
    player: s.player,
    winRate: s.winPercentage,
    tourneyWins: s.tournamentWins,
  })).sort((a, b) => b.winRate - a.winRate) || [];

  return (
    <Layout>
      <div className="container py-8 space-y-8">
        {/* Page header */}
        <div>
          <div className="text-xs uppercase tracking-[0.3em] mb-1" style={{ color: "oklch(0.78 0.15 85)" }}>
            ♠ Official Standings
          </div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.92 0.015 85)" }}>
            Player Rankings
          </h1>
          <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.02 85)" }}>
            Universal rating system — weighted by tournament type and performance
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="felt-card rounded-lg h-28 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Player ranking cards */}
            <div className="space-y-4">
              {(data?.rankings || []).map((r, i) => {
                const allTimeStat = data?.allTimeStats.find((s) => s.player === r.player);
                return (
                  <PlayerCard
                    key={r.player}
                    player={r.player}
                    rank={r.rank}
                    rating={r.rating}
                    allTimeStat={allTimeStat}
                    index={i}
                  />
                );
              })}
            </div>

            {/* Charts section */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Rating history */}
              <div className="felt-card rounded-lg overflow-hidden">
                <div className="px-5 py-4" style={{ borderBottom: "1px solid oklch(0.22 0.03 155)" }}>
                  <h2 className="font-semibold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.92 0.015 85)" }}>
                    Rating Progression
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: "oklch(0.50 0.02 85)" }}>
                    How ratings evolved across all 28 tournaments
                  </p>
                </div>
                <div className="p-4">
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={data?.ratingHistory || []} margin={{ top: 4, right: 8, bottom: 16, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.18 0.02 155)" />
                      <XAxis
                        dataKey="tournament"
                        tick={{ fontSize: 10, fill: "oklch(0.45 0.02 85)" }}
                        label={{ value: "Tournament #", position: "insideBottom", offset: -10, fontSize: 10, fill: "oklch(0.45 0.02 85)" }}
                      />
                      <YAxis tick={{ fontSize: 10, fill: "oklch(0.45 0.02 85)" }} />
                      <Tooltip
                        contentStyle={{
                          background: "oklch(0.13 0.015 155)",
                          border: "1px solid oklch(0.25 0.04 155)",
                          borderRadius: "6px",
                          fontSize: "12px",
                          color: "oklch(0.88 0.015 85)",
                        }}
                      />
                      {(data?.players || []).map((player) => (
                        <Line
                          key={player}
                          type="monotone"
                          dataKey={player}
                          stroke={getPlayerColor(player)}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-3 mt-1 px-2">
                    {(data?.players || []).map((player) => (
                      <div key={player} className="flex items-center gap-1.5">
                        <div className="w-3 h-0.5 rounded" style={{ background: getPlayerColor(player) }} />
                        <span className="text-xs" style={{ color: "oklch(0.60 0.02 85)" }}>{player}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Win Rate Bar Chart */}
              <div className="felt-card rounded-lg overflow-hidden">
                <div className="px-5 py-4" style={{ borderBottom: "1px solid oklch(0.22 0.03 155)" }}>
                  <h2 className="font-semibold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.92 0.015 85)" }}>
                    Win Rate Comparison
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: "oklch(0.50 0.02 85)" }}>
                    Overall win percentage across all games
                  </p>
                </div>
                <div className="p-4">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={winRateData} margin={{ top: 4, right: 8, bottom: 4, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.18 0.02 155)" />
                      <XAxis dataKey="player" tick={{ fontSize: 11, fill: "oklch(0.60 0.02 85)" }} />
                      <YAxis
                        tick={{ fontSize: 10, fill: "oklch(0.45 0.02 85)" }}
                        domain={[60, 80]}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "oklch(0.13 0.015 155)",
                          border: "1px solid oklch(0.25 0.04 155)",
                          borderRadius: "6px",
                          fontSize: "12px",
                          color: "oklch(0.88 0.015 85)",
                        }}
                        formatter={(v: any) => [`${v}%`, "Win Rate"]}
                      />
                      <Bar dataKey="winRate" radius={[3, 3, 0, 0]}>
                        {winRateData.map((entry) => (
                          <Cell key={entry.player} fill={getPlayerColor(entry.player)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Bid Success Rate */}
            {(() => {
              const bidData = (data?.players || [])
                .map((p) => {
                  const cs = data?.careerStats?.[p];
                  return {
                    player: p,
                    bidAttempts: cs?.bidAttempts ?? 0,
                    bidWins: cs?.bidWins ?? 0,
                    bidWinRate: cs?.bidWinRate ?? null,
                  };
                })
                .filter((d) => d.bidAttempts > 0)
                .sort((a, b) => (b.bidWinRate ?? 0) - (a.bidWinRate ?? 0));
              if (bidData.length === 0) return null;
              return (
                <div className="felt-card rounded-lg overflow-hidden">
                  <div className="px-5 py-4" style={{ borderBottom: "1px solid oklch(0.22 0.03 155)" }}>
                    <h2 className="font-semibold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.92 0.015 85)" }}>
                      Bid Success Rate
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: "oklch(0.50 0.02 85)" }}>
                      Career bid conversion across all tournaments with bidder tracking
                    </p>
                  </div>
                  <div className="p-5 space-y-3">
                    {bidData.map((d, i) => {
                      const pct = d.bidWinRate ?? 0;
                      const maxPct = bidData[0].bidWinRate ?? 1;
                      const barWidth = Math.round((pct / maxPct) * 100);
                      return (
                        <motion.div
                          key={d.player}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className="flex items-center gap-3"
                        >
                          <div className="w-20 text-sm font-medium shrink-0" style={{ color: getPlayerColor(d.player) }}>
                            {d.player}
                          </div>
                          <div className="flex-1 relative h-6 rounded overflow-hidden" style={{ background: "oklch(0.14 0.018 155)" }}>
                            <div
                              className="absolute inset-y-0 left-0 rounded transition-all"
                              style={{ width: `${barWidth}%`, background: getPlayerColor(d.player) + "55", borderRight: `2px solid ${getPlayerColor(d.player)}` }}
                            />
                          </div>
                          <div className="w-28 text-right shrink-0">
                            <span className="rank-number text-base font-bold" style={{ color: "oklch(0.88 0.015 85)" }}>
                              {pct}%
                            </span>
                            <span className="text-xs ml-1.5" style={{ color: "oklch(0.50 0.02 85)" }}>
                              {d.bidWins}W / {d.bidAttempts}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                    <p className="text-xs pt-2" style={{ color: "oklch(0.40 0.02 85)" }}>
                      Based on {(data?.tournaments || []).filter((t: any) => t.hasBidderData).length} tournaments with bidder tracking
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Player Radar + Selector */}
            <div className="felt-card rounded-lg overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid oklch(0.22 0.03 155)" }}>
                <div>
                  <h2 className="font-semibold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.92 0.015 85)" }}>
                    Player Profile
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: "oklch(0.50 0.02 85)" }}>
                    Relative performance across key metrics
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(data?.players || []).map((p) => (
                    <button
                      key={p}
                      onClick={() => setSelectedPlayer(p)}
                      className="px-3 py-1 rounded text-xs font-medium transition-all"
                      style={{
                        background: selectedPlayer === p ? getPlayerColor(p) + "33" : "oklch(0.16 0.02 155)",
                        color: selectedPlayer === p ? getPlayerColor(p) : "oklch(0.60 0.02 85)",
                        border: `1px solid ${selectedPlayer === p ? getPlayerColor(p) + "66" : "oklch(0.22 0.03 155)"}`,
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4 flex justify-center">
                {radarData.length > 0 && selectedPlayer && (
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="oklch(0.22 0.03 155)" />
                      <PolarAngleAxis
                        dataKey="metric"
                        tick={{ fontSize: 11, fill: "oklch(0.60 0.02 85)" }}
                      />
                      <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        tick={{ fontSize: 9, fill: "oklch(0.40 0.02 85)" }}
                      />
                      <Radar
                        name={selectedPlayer}
                        dataKey="value"
                        stroke={getPlayerColor(selectedPlayer)}
                        fill={getPlayerColor(selectedPlayer)}
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "oklch(0.13 0.015 155)",
                          border: "1px solid oklch(0.25 0.04 155)",
                          borderRadius: "6px",
                          fontSize: "12px",
                          color: "oklch(0.88 0.015 85)",
                        }}
                        formatter={(v: any) => [`${v}/100`, "Score"]}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

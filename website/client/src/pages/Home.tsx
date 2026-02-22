/*
 * Home / Dashboard — Dark Casino / Art Deco Design System
 * Hero: card table image with overlaid championship stats
 * Sections: Current Rankings, Recent Tournaments, All-Time Leaders
 */
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Trophy, TrendingUp, Swords, Star, ChevronRight, Crown } from "lucide-react";
import Layout from "@/components/Layout";
import { fetchGameData, getPlayerColor, TOURNAMENT_TYPE_LABELS, type GameData, type TournamentType } from "@/lib/gameData";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

const HERO_BG = "https://private-us-east-1.manuscdn.com/sessionFile/ttRJTeMGJdaldDxNTD4AfU/sandbox/DCInrHdyHwdpmN68VbyRZy-img-1_1771794622000_na1fn_aGVyby1iZw.jpg?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvdHRSSlRlTUdKZGFsZER4TlRENEFmVS9zYW5kYm94L0RDSW5ySGR5SHdkcG1ONjhWYnlSWnktaW1nLTFfMTc3MTc5NDYyMjAwMF9uYTFmbl9hR1Z5YnkxaVp3LmpwZz94LW9zcy1wcm9jZXNzPWltYWdlL3Jlc2l6ZSx3XzE5MjAsaF8xOTIwL2Zvcm1hdCx3ZWJwL3F1YWxpdHkscV84MCIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc5ODc2MTYwMH19fV19&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=C5MboLYeQqndLonU0fApmT~qiWruUwSXcuBTd8LOXDK4BGWmpLeSlLnJWcmFEl-RPpqnhQfV7njsZLC06IG~m5zKrMha8Q6naLniBJDjoEtU9X4cM3dfPbo1M9UWUXU5mLyHVEFEK5sluQmYQX0PyumclrkObn5dkIhm6QK7I6VU4ADosUqHAcsCa3ueH1L8sHYjHiaG5B7X7AiT9k~2f8aZVPTpA81Es1Td7hFXylf2ck5ZCZFxTdAt1MCzf0309oQgksLah8koqDbu~F6qscyCZMMpXOsiH8P1ilGCwcAGgt4rHx8kcyYLj7D9DCQ3KbKRB83IDrgAwvuvmfEoeA__";

const SPADE_EMBLEM = "https://private-us-east-1.manuscdn.com/sessionFile/ttRJTeMGJdaldDxNTD4AfU/sandbox/DCInrHdyHwdpmN68VbyRZy_1771794629749_na1fn_c3BhZGUtZW1ibGVt.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvdHRSSlRlTUdKZGFsZER4TlRENEFmVS9zYW5kYm94L0RDSW5ySGR5SHdkcG1ONjhWYnlSWnlfMTc3MTc5NDYyOTc0OV9uYTFmbl9jM0JoWkdVdFpXMWliR1Z0LnBuZz94LW9zcy1wcm9jZXNzPWltYWdlL3Jlc2l6ZSx3XzE5MjAsaF8xOTIwL2Zvcm1hdCx3ZWJwL3F1YWxpdHkscV84MCIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc5ODc2MTYwMH19fV19&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=f63XduRg6eFksKld2ADlDSEBk1HsPgWyzfYfbmW6M6B3Xfja7KYyWopnkZ0wxv7QUdsXrTRO3ruTsC5U9lfHCmeGEiClNnP24xezIuDpr5X1gWPDA-XA~Op0RBqoXFkzKpNFCO8~Stij1E4KE6fRQwbGFtNKi1GAD~-VGkwTM31kEY6GNoV5iyIV1006kszXKbxB9mFmfDr8dCKB-pY6sWnvzDCesM7Fryiq6BdMU3lAwqNonO7NHLrqfEoioQX1vU44Hg4qY0T8tE5X5sOLvzDKlTr35~cPZAX4P5g9d-xXxmSqzNdd9kXrZkZBJ8b85xf-DJUZ6-E956wE8ST5Bw__";

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="felt-card rounded-lg p-5"
    >
      <div className="text-xs uppercase tracking-widest mb-1" style={{ color: "oklch(0.55 0.02 85)" }}>{label}</div>
      <div
        className="text-3xl font-bold rank-number"
        style={{ color: color || "oklch(0.78 0.15 85)" }}
      >
        {value}
      </div>
      {sub && <div className="text-xs mt-1" style={{ color: "oklch(0.55 0.02 85)" }}>{sub}</div>}
    </motion.div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const colors: Record<number, string> = {
    1: "oklch(0.78 0.15 85)",
    2: "oklch(0.75 0.01 85)",
    3: "oklch(0.65 0.12 55)",
  };
  return (
    <span
      className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold rank-number"
      style={{
        background: rank <= 3 ? colors[rank] + "22" : "oklch(0.18 0.02 155)",
        color: rank <= 3 ? colors[rank] : "oklch(0.55 0.02 85)",
        border: `1px solid ${rank <= 3 ? colors[rank] + "55" : "oklch(0.25 0.04 155)"}`,
      }}
    >
      {rank}
    </span>
  );
}

export default function Home() {
  const [data, setData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGameData().then(setData).finally(() => setLoading(false));
  }, []);

  const recentTournaments = data?.tournamentSummary.slice(-5).reverse() || [];
  const ratingChartData = data?.ratingHistory.slice(-15) || [];

  return (
    <Layout>
      {/* Hero Section */}
      <section
        className="relative overflow-hidden"
        style={{ minHeight: "380px" }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_BG})` }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to right, oklch(0.10 0.012 155 / 0.92) 40%, oklch(0.10 0.012 155 / 0.5) 100%)" }}
        />

        <div className="relative container py-12 lg:py-16">
          <div className="flex items-start gap-6 max-w-2xl">
            <img
              src={SPADE_EMBLEM}
              alt="Spade emblem"
              className="w-16 h-16 lg:w-20 lg:h-20 opacity-90 flex-shrink-0"
              style={{ filter: "brightness(0) invert(1) sepia(1) saturate(3) hue-rotate(5deg)" }}
            />
            <div>
              <div
                className="text-xs uppercase tracking-[0.3em] mb-2"
                style={{ color: "oklch(0.78 0.15 85)" }}
              >
                The Official Record
              </div>
              <h1
                className="text-4xl lg:text-5xl font-bold leading-tight mb-3"
                style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.95 0.015 85)" }}
              >
                3 of Spades
              </h1>
              <p className="text-base mb-6" style={{ color: "oklch(0.70 0.015 85)" }}>
                Championship records, rankings, and head-to-head stats for the five-player card league.
              </p>
              <div className="flex gap-3 flex-wrap">
                <Link href="/rankings">
                  <button
                    className="flex items-center gap-2 px-5 py-2.5 rounded text-sm font-semibold transition-all hover:opacity-90"
                    style={{ background: "oklch(0.78 0.15 85)", color: "oklch(0.10 0.012 155)" }}
                  >
                    <Trophy size={15} /> View Rankings
                  </button>
                </Link>
                <Link href="/tournaments">
                  <button
                    className="flex items-center gap-2 px-5 py-2.5 rounded text-sm font-medium transition-all hover:bg-[oklch(0.20_0.02_155)]"
                    style={{ background: "oklch(0.16 0.02 155)", color: "oklch(0.85 0.015 85)", border: "1px solid oklch(0.28 0.04 155)" }}
                  >
                    <Star size={15} /> All Tournaments
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container py-8 space-y-10">
        {/* Quick Stats */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="felt-card rounded-lg p-5 animate-pulse h-24" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Tournaments" value={data?.totalTournaments || 0} sub="Championships & more" />
            <StatCard
              label="Current #1"
              value={data?.rankings[0]?.player || "—"}
              sub={`Rating: ${Math.round(data?.rankings[0]?.rating || 0).toLocaleString()}`}
              color={getPlayerColor(data?.rankings[0]?.player || "")}
            />
            <StatCard
              label="Most Tourney Wins"
              value={data?.allTimeStats[0]?.player || "—"}
              sub={`${data?.allTimeStats[0]?.tournamentWins || 0} wins`}
              color={getPlayerColor(data?.allTimeStats[0]?.player || "")}
            />
            <StatCard
              label="Total Games Played"
              value={data?.allTimeStats.reduce((s, p) => Math.max(s, p.totalGames), 0).toLocaleString() || "—"}
              sub="Across all tournaments"
            />
          </div>
        )}

        {/* Rankings + Rating History */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Rankings Table */}
          <div className="lg:col-span-2 felt-card rounded-lg overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid oklch(0.22 0.03 155)" }}>
              <h2 className="font-semibold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.92 0.015 85)" }}>
                Current Rankings
              </h2>
              <Link href="/rankings">
                <span className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ color: "oklch(0.78 0.15 85)" }}>
                  Full table <ChevronRight size={12} />
                </span>
              </Link>
            </div>
            <div className="divide-y" style={{ borderColor: "oklch(0.18 0.02 155)" }}>
              {(data?.rankings || []).map((r, i) => (
                <motion.div
                  key={r.player}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  <RankBadge rank={r.rank} />
                  {r.rank === 1 && <Crown size={14} style={{ color: "oklch(0.78 0.15 85)" }} />}
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: getPlayerColor(r.player) }}
                  />
                  <span className="flex-1 font-medium text-sm" style={{ color: "oklch(0.88 0.015 85)" }}>
                    {r.player}
                  </span>
                  <span className="rank-number text-sm font-semibold" style={{ color: "oklch(0.78 0.15 85)" }}>
                    {Math.round(r.rating).toLocaleString()}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Rating History Chart */}
          <div className="lg:col-span-3 felt-card rounded-lg overflow-hidden">
            <div className="px-5 py-4" style={{ borderBottom: "1px solid oklch(0.22 0.03 155)" }}>
              <h2 className="font-semibold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.92 0.015 85)" }}>
                Rating History
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.02 85)" }}>
                Universal rating across all tournaments
              </p>
            </div>
            <div className="p-4">
              {ratingChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={ratingChartData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.20 0.02 155)" />
                    <XAxis
                      dataKey="tournament"
                      tick={{ fontSize: 10, fill: "oklch(0.50 0.02 85)" }}
                      label={{ value: "Tournament #", position: "insideBottom", offset: -2, fontSize: 10, fill: "oklch(0.50 0.02 85)" }}
                    />
                    <YAxis tick={{ fontSize: 10, fill: "oklch(0.50 0.02 85)" }} />
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
              ) : (
                <div className="h-[220px] flex items-center justify-center" style={{ color: "oklch(0.40 0.02 85)" }}>
                  Loading chart data...
                </div>
              )}
              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-2 px-2">
                {(data?.players || []).map((player) => (
                  <div key={player} className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 rounded" style={{ background: getPlayerColor(player) }} />
                    <span className="text-xs" style={{ color: "oklch(0.60 0.02 85)" }}>{player}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* All-Time Stats */}
        <div className="felt-card rounded-lg overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: "1px solid oklch(0.22 0.03 155)" }}>
            <h2 className="font-semibold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.92 0.015 85)" }}>
              All-Time Statistics
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid oklch(0.18 0.02 155)" }}>
                  {["Player", "Tourney Wins", "Win Rate", "Avg Points", "Total Games"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs uppercase tracking-wider" style={{ color: "oklch(0.50 0.02 85)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.allTimeStats || []).map((s, i) => (
                  <tr
                    key={s.player}
                    className="transition-colors hover:bg-[oklch(0.15_0.018_155)]"
                    style={{ borderBottom: i < (data?.allTimeStats.length || 0) - 1 ? "1px solid oklch(0.16 0.018 155)" : "none" }}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: getPlayerColor(s.player) }} />
                        <span className="font-medium" style={{ color: "oklch(0.88 0.015 85)" }}>{s.player}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 rank-number font-semibold" style={{ color: "oklch(0.78 0.15 85)" }}>
                      {s.tournamentWins}
                    </td>
                    <td className="px-5 py-3 rank-number" style={{ color: "oklch(0.75 0.015 85)" }}>
                      {s.winPercentage}%
                    </td>
                    <td className="px-5 py-3 rank-number" style={{ color: "oklch(0.75 0.015 85)" }}>
                      {s.avgPoints}
                    </td>
                    <td className="px-5 py-3 rank-number" style={{ color: "oklch(0.60 0.02 85)" }}>
                      {s.totalGames.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Tournaments */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.92 0.015 85)" }}>
              Recent Tournaments
            </h2>
            <Link href="/tournaments">
              <span className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ color: "oklch(0.78 0.15 85)" }}>
                View all <ChevronRight size={12} />
              </span>
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {recentTournaments.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <Link href={`/tournaments/${t.id}`}>
                  <div
                    className="felt-card rounded-lg p-4 cursor-pointer transition-all hover:border-[oklch(0.78_0.15_85_/_0.4)] group"
                    style={{ border: "1px solid oklch(0.22 0.03 155)" }}
                  >
                    <div className="text-xs uppercase tracking-wider mb-2" style={{ color: "oklch(0.50 0.02 85)" }}>
                      {TOURNAMENT_TYPE_LABELS[t.type as TournamentType]}
                    </div>
                    <div className="font-semibold text-sm mb-3 group-hover:text-[oklch(0.78_0.15_85)] transition-colors" style={{ color: "oklch(0.88 0.015 85)", fontFamily: "'Playfair Display', serif" }}>
                      {t.displayName}
                    </div>
                    {t.winner && (
                      <div className="flex items-center gap-1.5">
                        <Trophy size={12} style={{ color: "oklch(0.78 0.15 85)" }} />
                        <span className="text-xs font-medium" style={{ color: getPlayerColor(t.winner) }}>
                          {t.winner}
                        </span>
                      </div>
                    )}
                    <div className="text-xs mt-1" style={{ color: "oklch(0.45 0.02 85)" }}>
                      {t.totalGames} games · {t.players.length} players
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

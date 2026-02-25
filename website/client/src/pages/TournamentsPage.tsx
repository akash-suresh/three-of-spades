/*
 * Tournaments Page — Dark Casino / Art Deco Design System
 * List of all 28 tournaments with filtering by type, winner info, and quick stats
 */
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Trophy, Filter, ChevronRight, Users, Gamepad2 } from "lucide-react";
import Layout from "@/components/Layout";
import {
  fetchGameData,
  getPlayerColor,
  getTournamentTypeColor,
  TOURNAMENT_TYPE_LABELS,
  TOURNAMENT_TYPE_SHORT,
  type GameData,
  type TournamentType,
  type TournamentSummary,
} from "@/lib/gameData";

const TYPE_FILTERS: Array<{ value: TournamentType | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "championship", label: "Championship" },
  { value: "mini_championship", label: "Mini" },
  { value: "tiny_championship", label: "Tiny" },
  { value: "international_friendly", label: "Friendly" },
];

function TournamentCard({ t, index }: { t: TournamentSummary; index: number }) {
  const typeColor = getTournamentTypeColor(t.type as TournamentType);
  const topPlayers = t.playerStats.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.5) }}
    >
      <Link href={`/tournaments/${t.id}`}>
        <div
          className="felt-card rounded-lg p-4 cursor-pointer transition-all group"
          style={{ border: "1px solid oklch(0.22 0.03 155)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = typeColor + "55";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = "oklch(0.22 0.03 155)";
          }}
        >
          {/* Type badge + name */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <span
                className="inline-block text-xs px-2 py-0.5 rounded font-medium mb-1.5"
                style={{ background: typeColor + "22", color: typeColor }}
              >
                {TOURNAMENT_TYPE_SHORT[t.type as TournamentType]}
              </span>
              <h3
                className="font-semibold text-sm group-hover:text-[oklch(0.78_0.15_85)] transition-colors"
                style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.88 0.015 85)" }}
              >
                {t.displayName}
              </h3>
            </div>
            <ChevronRight size={14} className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "oklch(0.78 0.15 85)" }} />
          </div>

          {/* Winner(s) */}
          {(t.winners?.length > 0 || t.winner) && (
            <div className="flex items-center gap-1.5 mb-3 flex-wrap">
              <Trophy size={11} style={{ color: "oklch(0.78 0.15 85)" }} />
              {(t.winners?.length > 1 ? t.winners : [t.winner!]).map((w, i, arr) => (
                <span key={w}>
                  <span className="text-xs font-semibold" style={{ color: getPlayerColor(w) }}>{w}</span>
                  {i < arr.length - 1 && <span className="text-xs" style={{ color: "oklch(0.45 0.02 85)" }}> &amp; </span>}
                </span>
              ))}
              <span className="text-xs" style={{ color: "oklch(0.45 0.02 85)" }}>
                {(t.winners?.length ?? 1) > 1 ? 'tied 1st' : 'won'}
              </span>
            </div>
          )}

          {/* Top 3 podium */}
          <div className="space-y-1 mb-3">
            {topPlayers.map((ps, i) => (
              <div key={ps.Player} className="flex items-center gap-2">
                <span className="text-xs rank-number w-4 text-right" style={{ color: i === 0 ? "oklch(0.78 0.15 85)" : "oklch(0.40 0.02 85)" }}>
                  {i + 1}
                </span>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: getPlayerColor(ps.Player) }} />
                <span className="text-xs flex-1" style={{ color: "oklch(0.70 0.015 85)" }}>{ps.Player}</span>
                <span className="text-xs rank-number" style={{ color: "oklch(0.55 0.02 85)" }}>
                  {ps.TotalPoints.toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          {/* Footer stats */}
          <div className="flex items-center gap-3 pt-2" style={{ borderTop: "1px solid oklch(0.18 0.02 155)" }}>
            <div className="flex items-center gap-1">
              <Gamepad2 size={10} style={{ color: "oklch(0.45 0.02 85)" }} />
              <span className="text-xs" style={{ color: "oklch(0.45 0.02 85)" }}>{t.totalGames} games</span>
            </div>
            <div className="flex items-center gap-1">
              <Users size={10} style={{ color: "oklch(0.45 0.02 85)" }} />
              <span className="text-xs" style={{ color: "oklch(0.45 0.02 85)" }}>{t.players.length} players</span>
            </div>
            <div className="ml-auto text-xs" style={{ color: "oklch(0.40 0.02 85)" }}>
              ×{t.weight} weight
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function TournamentsPage() {
  const [data, setData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TournamentType | "all">("all");

  useEffect(() => {
    fetchGameData().then(setData).finally(() => setLoading(false));
  }, []);

  const filtered = [...(data?.tournamentSummary || [])].reverse().filter(
    (t) => filter === "all" || t.type === filter
  );

  // Stats by type
  const typeCounts = (data?.tournamentSummary || []).reduce((acc, t) => {
    acc[t.type] = (acc[t.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Layout>
      <div className="container py-8 space-y-6">
        {/* Page header */}
        <div>
          <div className="text-xs uppercase tracking-[0.3em] mb-1" style={{ color: "oklch(0.78 0.15 85)" }}>
            ♠ Complete Record
          </div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: "oklch(0.92 0.015 85)" }}>
            All Tournaments
          </h1>
          <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.02 85)" }}>
            {data?.totalTournaments || 0} tournaments across 4 formats
          </p>
        </div>

        {/* Type summary cards */}
        {!loading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {(Object.entries(TOURNAMENT_TYPE_LABELS) as Array<[TournamentType, string]>).map(([type, label]) => {
              const color = getTournamentTypeColor(type);
              const count = typeCounts[type] || 0;
              return (
                <button
                  key={type}
                  onClick={() => setFilter(filter === type ? "all" : type)}
                  className="felt-card rounded-lg p-3 text-left transition-all"
                  style={{
                    border: `1px solid ${filter === type ? color + "55" : "oklch(0.22 0.03 155)"}`,
                    background: filter === type ? color + "11" : undefined,
                  }}
                >
                  <div className="text-xl font-bold rank-number" style={{ color }}>{count}</div>
                  <div className="text-xs mt-0.5" style={{ color: "oklch(0.60 0.02 85)" }}>{label}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* Filter bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} style={{ color: "oklch(0.50 0.02 85)" }} />
          {TYPE_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className="px-3 py-1.5 rounded text-xs font-medium transition-all"
              style={{
                background: filter === value ? "oklch(0.78 0.15 85)" : "oklch(0.16 0.02 155)",
                color: filter === value ? "oklch(0.10 0.012 155)" : "oklch(0.65 0.015 85)",
                border: `1px solid ${filter === value ? "oklch(0.78 0.15 85)" : "oklch(0.22 0.03 155)"}`,
              }}
            >
              {label}
              {value !== "all" && typeCounts[value] ? ` (${typeCounts[value]})` : ""}
            </button>
          ))}
        </div>

        {/* Tournament grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="felt-card rounded-lg h-48 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((t, i) => (
              <TournamentCard key={t.id} t={t} index={i} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

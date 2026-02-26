/*
 * HistoryPage — Dark Casino / Art Deco Design System
 * Rich tournament history grouped by type, matching the wiki table layout.
 * Columns: #, Name, Location, Dates, Year, Games, Champion, 2nd, 3rd, Others
 */
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Trophy, MapPin, Calendar } from "lucide-react";
import Layout from "@/components/Layout";
import { fetchGameData, getPlayerColor, TOURNAMENT_TYPE_COLORS, type TournamentSummary, type TournamentType } from "@/lib/gameData";

// ── Colour / style constants ──────────────────────────────────────────────────
const BG       = "oklch(0.10 0.012 155)";
const CARD_BG  = "oklch(0.13 0.018 155)";
const BORDER   = "oklch(0.22 0.03 155)";
const GOLD     = "oklch(0.78 0.15 85)";
const DIM      = "oklch(0.45 0.02 85)";
const TEXT     = "oklch(0.88 0.015 85)";

const SECTIONS: { type: TournamentType; label: string; emoji: string }[] = [
  { type: "championship",          label: "Championships",           emoji: "🏆" },
  { type: "mini_championship",     label: "Mini Championships",      emoji: "🥇" },
  { type: "tiny_championship",     label: "Tiny Championships",      emoji: "⚡" },
  { type: "international_friendly",label: "International Friendlies",emoji: "🌍" },
];

// ── Podium cell ───────────────────────────────────────────────────────────────
function PlayerCell({ name, isWinner = false }: { name: string; isWinner?: boolean }) {
  if (!name) return <span style={{ color: DIM }}>—</span>;
  return (
    <Link href={`/players/${name}`}>
      <span
        className="cursor-pointer hover:underline font-medium"
        style={{ color: isWinner ? getPlayerColor(name) : TEXT }}
      >
        {isWinner && <Trophy size={11} className="inline mr-1" style={{ color: GOLD }} />}
        {name}
      </span>
    </Link>
  );
}

// ── Section table ─────────────────────────────────────────────────────────────
function SectionTable({ tournaments }: { tournaments: TournamentSummary[] }) {
  // Sort descending by number (most recent first)
  const sorted = [...tournaments].sort((a, b) => b.number - a.number);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
            {["#", "Name", "Location", "Dates", "Year", "Games", "Champion", "2nd", "3rd", "Others"].map(h => (
              <th
                key={h}
                className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                style={{ color: DIM }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((t, i) => {
            const ps = t.playerStats ?? [];
            const winners = t.winners?.length > 0 ? t.winners : (t.winner ? [t.winner] : []);
            const second  = ps.find(s => !winners.includes(s.Player) && ps.indexOf(s) === (winners.length));
            const third   = ps.find(s => !winners.includes(s.Player) && ps.indexOf(s) === (winners.length + 1));
            const others  = ps
              .filter(s => !winners.includes(s.Player) && s !== second && s !== third)
              .map(s => s.Player);

            return (
              <tr
                key={t.id}
                className="transition-colors hover:bg-[oklch(0.16_0.02_155)]"
                style={{ borderBottom: `1px solid oklch(0.17 0.02 155)` }}
              >
                {/* # */}
                <td className="px-3 py-3 font-mono text-xs" style={{ color: GOLD }}>
                  {t.displayNumber}
                </td>

                {/* Name */}
                <td className="px-3 py-3 min-w-[160px]">
                  <Link href={`/tournaments/${t.id}`}>
                    <span
                      className="cursor-pointer hover:underline font-medium"
                      style={{ color: TEXT }}
                    >
                      {t.name || t.displayName}
                    </span>
                  </Link>
                </td>

                {/* Location */}
                <td className="px-3 py-3 whitespace-nowrap">
                  {t.location ? (
                    <span className="flex items-center gap-1.5">
                      <span className="text-base leading-none">{t.flag}</span>
                      <span style={{ color: TEXT }}>{t.location}</span>
                    </span>
                  ) : (
                    <span style={{ color: DIM }}>—</span>
                  )}
                </td>

                {/* Dates */}
                <td className="px-3 py-3 whitespace-nowrap text-xs" style={{ color: t.dates ? TEXT : DIM }}>
                  {t.dates || "—"}
                </td>

                {/* Year */}
                <td className="px-3 py-3 text-xs font-mono" style={{ color: DIM }}>
                  {t.year ?? "—"}
                </td>

                {/* Games */}
                <td className="px-3 py-3 text-xs font-mono" style={{ color: DIM }}>
                  {t.totalGames}
                </td>

                {/* Champion */}
                <td className="px-3 py-3 whitespace-nowrap">
                  {winners.length > 0 ? (
                    <span className="flex flex-col gap-0.5">
                      {winners.map(w => <PlayerCell key={w} name={w} isWinner />)}
                    </span>
                  ) : <span style={{ color: DIM }}>—</span>}
                </td>

                {/* 2nd */}
                <td className="px-3 py-3 whitespace-nowrap">
                  <PlayerCell name={second?.Player ?? ""} />
                </td>

                {/* 3rd */}
                <td className="px-3 py-3 whitespace-nowrap">
                  <PlayerCell name={third?.Player ?? ""} />
                </td>

                {/* Others */}
                <td className="px-3 py-3">
                  <span className="flex flex-wrap gap-x-2 gap-y-0.5">
                    {others.length > 0
                      ? others.map(p => (
                          <Link key={p} href={`/players/${p}`}>
                            <span className="text-xs cursor-pointer hover:underline" style={{ color: DIM }}>{p}</span>
                          </Link>
                        ))
                      : <span style={{ color: DIM }}>—</span>
                    }
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Collapsible section ───────────────────────────────────────────────────────
function Section({
  section,
  tournaments,
  defaultOpen,
}: {
  section: typeof SECTIONS[0];
  tournaments: TournamentSummary[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const accentColor = TOURNAMENT_TYPE_COLORS[section.type];

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: CARD_BG, border: `1px solid ${BORDER}` }}
    >
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-[oklch(0.16_0.02_155)]"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{section.emoji}</span>
          <span
            className="text-base font-semibold"
            style={{ color: accentColor, fontFamily: "'Playfair Display', serif" }}
          >
            {section.label}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-mono"
            style={{ background: `${accentColor}22`, color: accentColor }}
          >
            {tournaments.length}
          </span>
        </div>
        <ChevronDown
          size={18}
          className="transition-transform duration-200"
          style={{ color: DIM, transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {/* Table */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ borderTop: `1px solid ${BORDER}` }}>
              <SectionTable tournaments={tournaments} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HistoryPage() {
  const [data, setData] = useState<TournamentSummary[] | null>(null);

  useEffect(() => {
    fetchGameData().then(d => setData(d.tournamentSummary));
  }, []);

  const byType = (type: TournamentType) =>
    (data ?? []).filter(t => t.type === type);

  const totalTournaments = data?.length ?? 0;
  const totalGames = data?.reduce((s, t) => s + t.totalGames, 0) ?? 0;

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Page header */}
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={14} style={{ color: GOLD }} />
            <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: GOLD }}>
              Tournament History
            </span>
          </div>
          <h1
            className="text-3xl font-bold mb-1"
            style={{ color: TEXT, fontFamily: "'Playfair Display', serif" }}
          >
            The Official Record
          </h1>
          <p className="text-sm" style={{ color: DIM }}>
            {totalTournaments} tournaments · {totalGames.toLocaleString()} games played
          </p>
        </div>

        {/* Sections */}
        {data === null ? (
          <div className="text-center py-16" style={{ color: DIM }}>Loading…</div>
        ) : (
          SECTIONS.map((section, i) => {
            const tournaments = byType(section.type);
            if (tournaments.length === 0) return null;
            return (
              <Section
                key={section.type}
                section={section}
                tournaments={tournaments}
                defaultOpen={i === 0}
              />
            );
          })
        )}
      </div>
    </Layout>
  );
}

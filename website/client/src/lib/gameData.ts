// Types for the 3 of Spades game data

export type TournamentType = 
  | "championship" 
  | "mini_championship" 
  | "tiny_championship" 
  | "international_friendly";

export interface PlayerStat {
  // These field names match the Python output exactly (PascalCase from pandas)
  Player: string;
  Wins: number;
  TotalGames: number;
  AvgPoints: number;
  TotalPoints: number;
  WinPercentage: number;
}

// Pairwise = same-team stats (both players on same side in a round)
export interface PairwiseStat {
  Player_x: string;
  Player_y: string;
  Wins: number;
  Losses: number;
  TotalGames: number;
  AvgPoints: number;
  WinPercentage: number;
}

// Trio = same-team stats for 3-player combinations
export interface TrioStat {
  Player_x: string;
  Player_y: string;
  Player_z: string;
  Wins: number;
  Losses: number;
  TotalGames: number;
  AvgPoints: number;
  WinPercentage: number;
}

export interface BidAndWonStat {
  Player: string;
  BidAndWon: number;
}

export interface ConsistencyStat {
  mean: number;    // avg score across ALL rounds (including zero-score losses)
  std: number;     // std dev across ALL rounds
  cv: number;      // coefficient of variation (std/mean) — lower = more consistent
  meanWins: number; // avg score on winning rounds only
  stdWins: number;  // std dev on winning rounds only
  scores: number[];
}

export interface GameDataPoint {
  game: number;
  [key: string]: number; // cumsum_<player>, winratio_<player>
}

// Per-tournament snapshot of a player's state after that tournament
export interface TournamentPlayerSnapshot {
  ratingBefore: number;
  ratingAfter: number;
  ratingChange: number;
  rankBefore: number | string;
  rankAfter: number | string;
  rankChange: number;
  careerGames: number;
  winPct: number;
  bidAndWonPct: number;
  bidAttempts: number;    // 0 when tournament has no Bidder column
  bidWins: number;        // 0 when tournament has no Bidder column
  bidWinRate: number | null; // null when bidAttempts == 0
  bestWinStreak: number;
  worstLossStreak: number;
  numFivles: number;
  numTenples: number;
  fiveMottes: number;
  fivplesThisTourney: number;
  tenplesThisTourney: number;
  fiveMottesThisTourney: number;
}

export interface CareerStats {
  careerGames: number;
  careerWins: number;
  winPct: number;
  bidAndWon: number;
  bidAndWonPct: number;
  bidAttempts: number;    // total rounds as named bidder across all tournaments with Bidder column
  bidWins: number;        // rounds where they bid and scored > 0
  bidWinRate: number | null; // null when bidAttempts == 0
  bestWinStreak: number;
  worstLossStreak: number;
  numFivles: number;
  numTenples: number;
  fiveMottes: number;
  fivplesThisTourney: number;
  tenplesThisTourney: number;
  fiveMottesThisTourney: number;
}

export interface Tournament {
  id: string;
  type: TournamentType;
  number: number;
  displayNumber: number;
  displayName: string;
  weight: number;
  players: string[];
  corePlayers: string[];
  guestPlayers: string[];
  totalGames: number;
  winner: string | null;
  winners: string[];
  playerStats: PlayerStat[];
  gameData: GameDataPoint[];
  pairwiseStats: PairwiseStat[];
  trioStats: TrioStat[];
  bidAndWon: BidAndWonStat[];
  bidStatsByPlayer: Record<string, { bidAttempts: number; bidWins: number; bidWinRate: number | null }>;
  hasBidderData: boolean;   // true when the source CSV had a Bidder column
  consistencyStats: Record<string, ConsistencyStat>;
}

export interface TournamentSummary {
  id: string;
  type: TournamentType;
  number: number;
  displayNumber: number;
  displayName: string;
  weight: number;
  players: string[];
  corePlayers: string[];
  guestPlayers: string[];
  totalGames: number;
  winner: string | null;
  winners: string[];
  playerStats: PlayerStat[];
  name: string | null;
  location: string | null;
  flag: string | null;
  dates: string | null;
  year: number | null;
}

export interface PlayerRanking {
  player: string;
  rating: number;
  rank: number;
}

export interface RatingHistoryPoint {
  tournament: number;
  [player: string]: number;
}

export interface AllTimeStat {
  player: string;
  wins: number;
  totalGames: number;
  totalPoints: number;
  tournamentWins: number;
  winPercentage: number;
  avgPoints: number;
}

// All-time pairwise (aggregated across tournaments)
export interface AllTimePairwiseStat {
  player1: string;
  player2: string;
  wins: number;
  losses: number;
  totalGames: number;
  winPct: number;
}

export interface GameData {
  tournaments: Tournament[];
  tournamentSummary: TournamentSummary[];
  tournamentSnapshots: Record<string, Record<string, TournamentPlayerSnapshot>>;
  rankings: PlayerRanking[];
  ratingHistory: RatingHistoryPoint[];
  allTimeStats: AllTimeStat[];
  allTimePairwise: AllTimePairwiseStat[];
  careerStats: Record<string, CareerStats>;
  players: string[];
  totalTournaments: number;
}

// Player signature colors
export const PLAYER_COLORS: Record<string, string> = {
  Akash: "#38bdf8",    // sky blue
  Abhi: "#fbbf24",     // amber
  Ani: "#f87171",      // rose
  Nats: "#34d399",     // emerald
  Naati: "#fb923c",    // orange
  Prateek: "#a78bfa",  // violet
  Skanda: "#e879f9",   // fuchsia
};

export const PLAYER_COLORS_DARK: Record<string, string> = {
  Akash: "#0ea5e9",
  Abhi: "#d97706",
  Ani: "#ef4444",
  Nats: "#10b981",
  Naati: "#ea580c",
  Prateek: "#8b5cf6",
  Skanda: "#d946ef",   // fuchsia dark
};

export const TOURNAMENT_TYPE_LABELS: Record<TournamentType, string> = {
  championship: "Championship",
  mini_championship: "Mini Championship",
  tiny_championship: "Tiny Championship",
  international_friendly: "International Friendly",
};

export const TOURNAMENT_TYPE_SHORT: Record<TournamentType, string> = {
  championship: "C",
  mini_championship: "MC",
  tiny_championship: "TC",
  international_friendly: "IF",
};

export const TOURNAMENT_TYPE_COLORS: Record<TournamentType, string> = {
  championship: "#fbbf24",
  mini_championship: "#34d399",
  tiny_championship: "#38bdf8",
  international_friendly: "#a78bfa",
};

// Fetch game data — try local first (dev), then CDN (production)
const CDN_DATA_URL = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663325356591/jmqHOOcCJdWzJmBB.json";
let cachedData: GameData | null = null;

export async function fetchGameData(): Promise<GameData> {
  if (cachedData) return cachedData;
  // Try local first (works in dev), fall back to CDN
  try {
    const response = await fetch("/game_data.json");
    if (response.ok) {
      cachedData = await response.json();
      return cachedData!;
    }
  } catch {
    // fall through to CDN
  }
  const response = await fetch(CDN_DATA_URL);
  if (!response.ok) throw new Error("Failed to load game data");
  cachedData = await response.json();
  return cachedData!;
}

export function getPlayerColor(player: string): string {
  return PLAYER_COLORS[player] || "#94a3b8";
}

export function formatRating(rating: number): string {
  return Math.round(rating).toLocaleString();
}

export function getRankSuffix(rank: number): string {
  if (rank === 1) return "st";
  if (rank === 2) return "nd";
  if (rank === 3) return "rd";
  return "th";
}

export function getTournamentTypeColor(type: TournamentType): string {
  return TOURNAMENT_TYPE_COLORS[type] || "#94a3b8";
}

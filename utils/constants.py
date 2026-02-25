from enum import Enum

# non-player columns
NON_PLAYER_COLUMNS = {
    'Bidder',
    'Discard',
    'Margin',
}

# class syntax
class Players(Enum):
    AKASH = 1
    PRATEEK = 2
    NATS = 3
    ABHI = 4
    ANI = 5
    NAATI = 6

# class syntax
class TournamentTypes(Enum):
    CHAMPIONSHIP = 'championship'
    MINI_CHAMPIONSHIP = 'mini_championship'
    FRIENDLY = 'international_friendly'
    TINY_CHAMPIONSHIP = 'tiny_championship'

    def display(self):
        splits = self.value.split('_')
        camel_case_bits = []
        for s in splits:
            camel_case_bits.append(s.title())
        return ' '.join(camel_case_bits)
        

    def code(self):
        splits = self.value.split('_')
        # picking first character of each word
        abrv = ''
        for s in splits:
            abrv += s[0]
        return abrv.upper()

    def weight(self) -> float:
        """Elo rating weight for this tournament type.
        Championship and International Friendly carry full weight (1.0);
        Mini and Tiny Championships carry reduced weight (0.75).
        """
        _weights = {
            TournamentTypes.CHAMPIONSHIP: 1.0,
            TournamentTypes.MINI_CHAMPIONSHIP: 0.75,
            TournamentTypes.TINY_CHAMPIONSHIP: 0.75,
            TournamentTypes.FRIENDLY: 1.0,
        }
        return _weights[self]

    def display_short(self) -> str:
        """Compact label suitable for badges and narrow UI columns."""
        _short = {
            TournamentTypes.CHAMPIONSHIP: 'Championship',
            TournamentTypes.MINI_CHAMPIONSHIP: 'Mini',
            TournamentTypes.TINY_CHAMPIONSHIP: 'Tiny',
            TournamentTypes.FRIENDLY: 'Friendly',
        }
        return _short[self]


# paths

def get_datascore_path(tourney_number, tournament_type=TournamentTypes.CHAMPIONSHIP):
    return f'tourney_data/raw_scores/{tournament_type.value}_{tourney_number}.csv'
    

# todo this function should take in tournament_type
def get_graph_path(tourney_number, plot_type):
    return f'tourney_data/graphs/C{tourney_number}_{plot_type}.png'



# all_tournaments
TOURNAMENT_LIST_CHRONOLOGICAL = [
    (TournamentTypes.CHAMPIONSHIP, 1),
    (TournamentTypes.CHAMPIONSHIP, 2),
    (TournamentTypes.CHAMPIONSHIP, 3),
    (TournamentTypes.CHAMPIONSHIP, 4),
    (TournamentTypes.CHAMPIONSHIP, 5),
    (TournamentTypes.MINI_CHAMPIONSHIP, 1),
    (TournamentTypes.CHAMPIONSHIP, 6),
    (TournamentTypes.CHAMPIONSHIP, 7),
    (TournamentTypes.FRIENDLY, 1),
    (TournamentTypes.MINI_CHAMPIONSHIP, 2),
    (TournamentTypes.CHAMPIONSHIP, 8),
    (TournamentTypes.MINI_CHAMPIONSHIP, 3),
    (TournamentTypes.FRIENDLY, 2),
    (TournamentTypes.TINY_CHAMPIONSHIP, 1),
    (TournamentTypes.TINY_CHAMPIONSHIP, 2),
    (TournamentTypes.MINI_CHAMPIONSHIP, 4),
    (TournamentTypes.TINY_CHAMPIONSHIP, 3),
    (TournamentTypes.TINY_CHAMPIONSHIP, 4),
    (TournamentTypes.TINY_CHAMPIONSHIP, 5),
    (TournamentTypes.MINI_CHAMPIONSHIP, 5),
    (TournamentTypes.MINI_CHAMPIONSHIP, 6), # manipal hospital - dad's surgery
    (TournamentTypes.FRIENDLY, 3), # Abhi, Nihal visit home
    (TournamentTypes.TINY_CHAMPIONSHIP, 6), # Skanda, Nats & Akash
    (TournamentTypes.TINY_CHAMPIONSHIP, 7), # NYC 2025 
    (TournamentTypes.TINY_CHAMPIONSHIP, 8),
    (TournamentTypes.MINI_CHAMPIONSHIP, 7),
    (TournamentTypes.TINY_CHAMPIONSHIP, 9),
    (TournamentTypes.FRIENDLY, 4), # Abhi, Nihal visit home    
    # (TournamentTypes.TINY_CHAMPIONSHIP, 10), # The one that was a draw
    (TournamentTypes.TINY_CHAMPIONSHIP, 11), # P got a Job
    (TournamentTypes.TINY_CHAMPIONSHIP, 12), # Another tiny?
    # (TournamentTypes.MINI_CHAMPIONSHIP, 8), # Abhi is back
    (TournamentTypes.TINY_CHAMPIONSHIP, 13), # Abhi debuts in Tiny
    (TournamentTypes.TINY_CHAMPIONSHIP, 14), # Winter 2025
    (TournamentTypes.TINY_CHAMPIONSHIP, 15), # NYC 2026
    (TournamentTypes.TINY_CHAMPIONSHIP, 16), # Pearl Harbor
]

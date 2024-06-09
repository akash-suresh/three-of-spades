from enum import Enum

# non-player columns
NON_PLAYER_COLUMNS = {'Bidder'}

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
    CHAMPIONSHIP = 1
    MINI_CHAMPIONSHIP = 2
    FRIENDLY = 3

# paths

def get_datascore_path(tourney_number, tournament_type=TournamentTypes.CHAMPIONSHIP):
    if tournament_type == TournamentTypes.MINI_CHAMPIONSHIP:
        return f'tourney_data/raw_scores/mini_championship_{tourney_number}.csv'
    elif tournament_type == TournamentTypes.FRIENDLY:
        return f'tourney_data/raw_scores/friendly_{tourney_number}.csv'
    return f'tourney_data/raw_scores/championship_{tourney_number}.csv'

def get_graph_path(tourney_number, plot_type):
    return f'tourney_data/graphs/C{tourney_number}_{plot_type}.png'
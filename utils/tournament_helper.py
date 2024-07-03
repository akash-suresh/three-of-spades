from tqdm import tqdm
from utils.Tournament import Tournament
from utils.constants import TOURNAMENT_LIST_CHRONOLOGICAL
from utils.ranking_system import UniversalRatingSystem


# Loads all tournaments from history
def load_tournaments_from_history(universal_rating_system: UniversalRatingSystem):

    # Historical tournaments
    past_tournaments = TOURNAMENT_LIST_CHRONOLOGICAL

    print('Going back in time!')
    size = len(past_tournaments)
    for TOURNAMENT_TYPE, TOURNEY_NUMBER in tqdm(past_tournaments, position=0, leave=True, total=size):
        
        tournament = Tournament(TOURNAMENT_TYPE, TOURNEY_NUMBER, display = False)
        # reading 
        _, _ = universal_rating_system.addTournamentData(tournament)

# helper function for testing
def load_single_tournament(universal_rating_system: UniversalRatingSystem, tournament: Tournament):

    _, _ = universal_rating_system.addTournamentData(tournament)
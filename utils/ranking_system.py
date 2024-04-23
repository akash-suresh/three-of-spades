from utils.data_preprocessor import get_players


BASE_RATING = 1000
DENOMINATOR = 200

class Player:
    def __init__(self, name, rating=BASE_RATING):
        self.name = name
        self.rating = rating


class UniversalRatingSystem:
    def __init__(self, rating=BASE_RATING):
        self.player_map = {}

    def print(self):
        # add rank and display
        for player in self.player_map.values():
            print(player.name, player.rating)

    def isRegistered(self, player_name):
        return (player_name in self.player_map)
    
    def registerPlayer(self, player_name):
        self.player_map[player_name] = Player(player_name)

    def getPlayer(self, player_name):
        if not self.isRegistered(player_name):
            return None
        return self.player_map[player_name]
    # load from stored files
    # def load(self):
    
    # def save(self):


def calculate_rating_change(winning_team, losing_team, winning_team_points):
    assert len(winning_team) == len(winning_team_points)

    bid = min(winning_team_points)

    # Calculate average ratings of winning and losing teams
    avg_winning_rating = sum(player.rating for player in winning_team) / len(winning_team)
    avg_losing_rating = sum(player.rating for player in losing_team) / len(losing_team)  

    # Calculate adjustment factor based on rating difference
    rating_difference = avg_winning_rating - avg_losing_rating
    # if winning team is stronger --> rating_difference > 0
    # if winning team is weaker --> rating_difference < 0

    # capping adjustment factor to [-0.5, 0.5] range
    adjustment_factor = max(-0.5, min(0.5, rating_difference/BASE_RATING))

    # Calculate adjusted points for the winning team
    # case 1 - both are equal --> adjustment_factor = 0
    # case 2 - winning team is stronger --> adjustment_factor > 0 [reduce reward by x%]
    # case 3 - winning team is weaker --> adjustment_factor < 0 [increase reward by x%]
    
    # Update ratings for players in winning team
    for player, player_points in zip(winning_team, winning_team_points):
        adjusted_points = (player_points/DENOMINATOR) * (1-adjustment_factor)
        player.rating += adjusted_points

    # Update ratings for players in losing team
    for player in losing_team:
        adjusted_points = (bid/DENOMINATOR) * (1-adjustment_factor)
        player.rating -= adjusted_points


def score_wrapper(row, universal_rating_system, players):
    # Define teams and base points
    winning_team = []
    losing_team = []
    winning_team_points = []
    
    for player in players:
        if row[player] > 0:
            winning_team.append(universal_rating_system.getPlayer(player))
            winning_team_points.append(row[player])
        else:
            losing_team.append(universal_rating_system.getPlayer(player))

    calculate_rating_change(winning_team, losing_team, winning_team_points)



def compute_ranking(raw_df, universal_rating_system):

    players = get_players(raw_df)
    
    for player in players:
        if not universal_rating_system.isRegistered(player):
            universal_rating_system.registerPlayer(player)
    
    for _, row in raw_df.iterrows():
        score_wrapper(row, universal_rating_system, players)

        
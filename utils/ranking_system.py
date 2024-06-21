import pandas as pd
from tqdm import tqdm
from utils.Tournament import Tournament
import copy

from utils.constants import TOURNAMENT_LIST_CHRONOLOGICAL

BASE_RATING = 1000
DENOMINATOR = 200

class PlayerProfile:
    def __init__(self, name, rating):
        self.name = name
        self.rating = rating
        self.bidAndWon = 0
        self.careerGames = 0
        self.careerWins = 0
    
    def register_win(self, adjusted_points, bid_and_won = False):
        self.careerGames += 1
        self.careerWins += 1

        # updating rating
        self.rating += adjusted_points
        self.rating = round(self.rating, 2)

        if bid_and_won:
            self.bidAndWon += 1

        
    def register_loss(self, adjusted_points):
        self.careerGames += 1

        # updating rating
        self.rating -= adjusted_points
        self.rating = round(self.rating, 2)

    def winPercentage(self):
        return round(100.0*(self.careerWins/self.careerGames), 1)

    def bidAndWonPercentage(self):
        return round(100.0*(self.bidAndWon/self.careerGames), 1)
    
'''
Certainly! Developing a scoring system for a card game involves considering various factors such as player performance, opponents' skill levels, game outcomes, and possibly other relevant metrics. Here's a generalized algorithm you might consider for creating such a system:

1. **Define Metrics**: Identify the key metrics that contribute to a player's performance in the card game. These could include win-loss ratio, margin of victory, strength of opponents, specific in-game achievements, etc.

2. **Player Ratings**: Assign each player an initial rating. This could be based on their previous performance in the game (if available) or set to a default value for new players.

3. **Match Outcome**: Determine how the outcome of a match affects player ratings. For example:
   - Winning against a higher-rated opponent could result in a greater increase in rating compared to winning against a lower-rated opponent.
   - Losing to a lower-rated opponent could lead to a larger rating decrease than losing to a higher-rated opponent.

4. **Margin of Victory**: Consider the margin of victory or the performance differential between players in a match. A player who wins by a large margin might receive more rating points than one who wins narrowly.

5. **Opponent Strength**: Account for the strength of opponents faced. Be sure to adjust rating changes based on whether the opponent was stronger or weaker relative to the player.

6. **Game Context**: If the card game has different formats or game modes, you may need to adjust the rating changes based on the context of the game. For example, a tournament match might have different rating implications compared to a casual game.

7. **Iterative Adjustment**: Continuously refine the algorithm based on observed player performance and feedback. This might involve tweaking rating adjustments, considering additional metrics, or updating initial ratings based on new data.

8. **Normalization**: Periodically normalize ratings across all players to ensure consistency and prevent rating inflation/deflation over time. This could involve recalibrating ratings based on the overall distribution of ratings in the player pool.

9. **Scalability and Efficiency**: Design the algorithm to be scalable and efficient, especially if dealing with a large number of players or frequent updates to ratings.

10. **Feedback Mechanism**: Incorporate a feedback mechanism where players can provide input on the fairness and accuracy of the rating system. This feedback can be valuable for identifying areas for improvement and ensuring player satisfaction.

By considering these factors and implementing them into your scoring system algorithm, you can create a robust and fair system for evaluating player performance in the card game. Adjustments may be necessary over time as you gather more data and insights into player behavior and preferences.

'''
def rankPlayerMap(player_map):
    rankings = {k: v for k, v in sorted(player_map.items(), key=lambda item: -1*item[1].rating)}
    return rankings

def getPlayersToRankMapping(rankings):
    rank = 1
    player_to_rank = {}
    for key, _ in rankings.items():
        player_to_rank[key] = rank
        rank = rank + 1
    return player_to_rank


class UniversalRatingSystem:

    def __init__(self):
        self.player_map = {}
        self.tournaments = []
        self.preTournamentRatings = {}
        self.postTournamentRatings = {}

    def getRankingsSnapshot(self):
        return copy.deepcopy(self.getRankings())
    
    def showRankingChange(self, tournament: Tournament, load_by_default = False):
        tourney_key = tournament.display()

        if tourney_key not in self.tournaments:
            if not load_by_default:
                raise Exception('Missing Tournament: Run addTournamentData() or pass load_by_defaullt=True to load previous tournaments')
            load_tournaments_from_history(self)
        
        self.printRankingChange(tourney_key)
    
    def printRankingChange(self, tourney_key: str):
        print(f'\n{tourney_key}')
        before = self.preTournamentRatings[tourney_key]
        after = self.postTournamentRatings[tourney_key]
        printRankingChange(before, after)


    def print(self):
        # add rank and display
        for player in self.player_map.values():
            print(player.name, player.rating)
        print('\n -----------------------------')

    def getRankings(self):
        return self.player_map

    def isRegistered(self, player_name):
        return (player_name in self.player_map)
    
    def registerPlayer(self, player_name):
        self.player_map[player_name] = PlayerProfile(player_name, rating=BASE_RATING)

    def getPlayerProfile(self, player_name):
        assert self.isRegistered(player_name)

        return self.player_map[player_name]
    
    # Records the game
    def record_game(self, row, players):
        # Define teams and base points
        winning_team = []
        losing_team = []
        winning_team_points = []

        for player in players:
            if row[player] > 0:
                winning_team.append(self.getPlayerProfile(player))
                winning_team_points.append(row[player])
            else:
                losing_team.append(self.getPlayerProfile(player))

        calculate_rating_change(winning_team, losing_team, winning_team_points)

    def addTournamentData(self, tournament: Tournament):
        game_records = tournament.rawData
        players = tournament.players
        tourney_key = tournament.display()

        self.tournaments.append(tourney_key)

        # check for any new players
        for player in players:
            if not self.isRegistered(player):
                self.registerPlayer(player)
        
        before_player_ratings = self.getRankingsSnapshot()
        self.preTournamentRatings[tourney_key] = before_player_ratings

        # feeding in scores one game at a time
        for _, row in game_records.iterrows():
            self.record_game(row, players)

        after_player_ratings = self.getRankingsSnapshot()
        self.postTournamentRatings[tourney_key] = after_player_ratings
        
        return before_player_ratings, after_player_ratings

    # load from stored files
    # def load(self):
    
    # def save(self):

def printRankingChange(before, after):
    
    # sorting based on ratings
    old_rankings =  rankPlayerMap(before)
    new_rankings =  rankPlayerMap(after)
    
    old_ranks = getPlayersToRankMapping(old_rankings)
    new_ranks = getPlayersToRankMapping(new_rankings)

    rank = 1
    headers = ['Rank', 'Player', 'Rating', 'Win%']
    output_data = []
    for player in new_rankings.values():
        new_rating = int(player.rating)
        old_rating = old_rankings[player.name].rating

        rating_change = int(new_rating - old_rating)
        rank_change = old_ranks[player.name] - new_ranks[player.name]

        if rank_change > 0:
            rank_change = u"[\u25B2"+f"{rank_change}]"
        elif rank_change < 0:
            rank_change = u"[\u25BC"+f"{abs(rank_change)}]"
        else:
            rank_change = "[--]"


        if rating_change > 0:
            rating_change = f'+{rating_change}'
        
        output_data.append([
            f'#{rank} {rank_change}', 
            player.name, 
            f'{new_rating} ({rating_change})',
            player.winPercentage()
        ])
        rank = rank + 1

    # Create DataFrame
    df = pd.DataFrame(output_data, columns=headers)
    print(df.to_string(index=False))
    
    print('\n -----------------------------')

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
        # registering game in player object
        player.register_win(adjusted_points, bid_and_won = (player_points>bid))
        
    # Update ratings for players in losing team
    for player in losing_team:
        adjusted_points = (bid/DENOMINATOR) * (1-adjustment_factor)
        # registering game in player object
        player.register_loss(adjusted_points)

def load_tournaments_from_history(universal_rating_system: UniversalRatingSystem):

    print('Going back in time!')
    for TOURNAMENT_TYPE, TOURNEY_NUMBER in tqdm(TOURNAMENT_LIST_CHRONOLOGICAL):
        
        tournament = Tournament(TOURNAMENT_TYPE, TOURNEY_NUMBER, display = False)
        
        _, _ = universal_rating_system.addTournamentData(tournament)

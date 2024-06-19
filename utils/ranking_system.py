from utils.Tournament import Tournament
import copy

BASE_RATING = 1000
DENOMINATOR = 200

class PlayerProfile:
    def __init__(self, name, rating=BASE_RATING):
        self.name = name
        self.rating = rating

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
    def __init__(self, rating=BASE_RATING):
        self.player_map = {}
        # todo - maintain ranking change after every tournament
        # self.tournament_map = {}

    
    def printRankingChange(self, before, after=None):
        if after is None:
            after = self.player_map
        
        # sorting based on ratings
        old_rankings =  rankPlayerMap(before)
        new_rankings =  rankPlayerMap(after)
        
        old_ranks = getPlayersToRankMapping(old_rankings)
        new_ranks = getPlayersToRankMapping(new_rankings)

        rank = 1
        for player in new_rankings.values():
            new_rating = player.rating
            old_rating = old_rankings[player.name].rating

            rating_change = round(new_rating - old_rating, 1)
            rank_change = old_ranks[player.name] - new_ranks[player.name]

            if rank_change > 0:
                rank_change = u"\u25B2"+f"{rank_change}"
            elif rank_change < 0:
                rank_change = u"\u25BC"+f"{abs(rank_change)}"
            else:
                rank_change = "-"


            if rating_change > 0:
                rating_change = f'+{rating_change}'
            
            # todo - print like table
            print(f'#{rank} [{rank_change}] {player.name} | {player.rating} ({rating_change})')
            rank = rank + 1
        print('\n -----------------------------')


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
        self.player_map[player_name] = PlayerProfile(player_name)

    def getPlayerProfile(self, player_name):
        if not self.isRegistered(player_name):
            # return exception
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
        player.rating = round(player.rating, 2)

    # Update ratings for players in losing team
    for player in losing_team:
        adjusted_points = (bid/DENOMINATOR) * (1-adjustment_factor)
        player.rating -= adjusted_points
        player.rating = round(player.rating, 2)


def score_wrapper(row, universal_rating_system, players):
    # Define teams and base points
    winning_team = []
    losing_team = []
    winning_team_points = []
    
    for player in players:
        if row[player] > 0:
            winning_team.append(universal_rating_system.getPlayerProfile(player))
            winning_team_points.append(row[player])
        else:
            losing_team.append(universal_rating_system.getPlayerProfile(player))

    calculate_rating_change(winning_team, losing_team, winning_team_points)



def compute_ranking(tournament: Tournament, universal_rating_system: UniversalRatingSystem):
    game_records = tournament.rawData
    players = tournament.players

    for player in players:
        if not universal_rating_system.isRegistered(player):
            universal_rating_system.registerPlayer(player)
    
    before_player_ratings = copy.deepcopy(universal_rating_system.getRankings())

    # feeding in scores one game at a time
    for _, row in game_records.iterrows():
        score_wrapper(row, universal_rating_system, players)

    after_player_ratings = universal_rating_system.getRankings()

    return before_player_ratings, after_player_ratings
        
from utils.data_preprocessor import get_players


BASE_RATING = 1000
DENOMINATOR = 200

class Player:
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

        
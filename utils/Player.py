
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
        return int(100.0*(self.careerWins/self.careerGames))

    def bidAndWonPercentage(self):
        return int(100.0*(self.bidAndWon/self.careerGames))
    
    def getDictForLeaderboard(self, new_rank, rank_change, new_rating, rating_change):
        return {
            'Rank': new_rank, 
            'Change': rank_change,
            'Player': self.name, 
            'Rating': f'{new_rating} ({rating_change})',
            '#Games': self.careerGames,
            'Win %': self.winPercentage(),
            'Bid+Win%': self.bidAndWonPercentage()
        }

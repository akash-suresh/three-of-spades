
from utils.Tournament import Tournament


class PlayerProfile:
    def __init__(self, name, rating):
        self.name = name
        self.rating = rating
        self.bidAndWon = 0
        self.careerGames = 0
        self.careerWins = 0
        # streak stats
        self.winStreak = 0
        self.bestWinStreak = 0
        self.lossStreak = 0
        self.worstLossStreak = 0
        self.currentTournament = None
        # like triple but better
        self.numFivles = 0
        self.numTenples = 0
        self.fiveMottes = 0
    
    def newTournamentStart(self, tournament: Tournament):
        # todo - store snapshot of ratings
        self.currentTournament = tournament.display()
        self.winStreak = 0
        self.lossStreak = 0


    def registerGame(self, tournament: Tournament, adjusted_points, is_win, bid_and_won = False):
        if tournament.display() != self.currentTournament:
            self.newTournamentStart(tournament)
        
        if is_win:
            self.registerWin(adjusted_points, bid_and_won)
        
        else:
            self.registerLoss(adjusted_points)
        
        self.recordStreaks(is_win)


    def registerWin(self, adjusted_points, bid_and_won = False):
        self.careerGames += 1
        self.careerWins += 1

        # updating rating
        self.rating += adjusted_points
        self.rating = round(self.rating, 2)

        if bid_and_won:
            self.bidAndWon += 1

    def recordStreaks(self, is_win):
        # print(is_win, self.winStreak, self.lossStreak)
        if is_win:
            # reset loss streak
            self.lossStreak = 0
            # increment win streak
            self.winStreak += 1
            self.bestWinStreak = max(self.winStreak, self.bestWinStreak)
            if self.winStreak == 5:
                self.numFivles += 1
            
            if self.winStreak == 10:
                self.numTenples += 1

        else:
            # reset win streak
            self.winStreak = 0
            # increment loss streak
            self.lossStreak += 1
            self.worstLossStreak = max(self.lossStreak, self.worstLossStreak)
            
            if self.lossStreak == 5:
                self.fiveMottes += 1

    def registerLoss(self, adjusted_points):
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
            'Bid+Win%': self.bidAndWonPercentage(),
            'Win Streak': self.bestWinStreak,
            'Loss Streak': self.worstLossStreak,
            '#Fivples': self.numFivles,
            '#Tenples': self.numTenples,
            '#FiveMottes': self.fiveMottes
        }

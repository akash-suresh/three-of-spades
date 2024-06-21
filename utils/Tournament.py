import pandas as pd
import matplotlib.pyplot as plt

from utils.constants import TournamentTypes, get_graph_path
from utils.data_cruncher import get_bid_and_won_stats, get_championship_details, get_pairwise_stats, get_tri_stats


class Tournament:

    tournamentType: TournamentTypes
    tournamentNumber: int
    # todo create Player class
    rawData: pd.DataFrame
    players: list[str]
    playerStats: pd.DataFrame
    gameData: pd.DataFrame
    pairwiseStats: pd.DataFrame
    trioStats: pd.DataFrame
    bidAndWonStats:pd.DataFrame

    def __init__(self, tournament_type: TournamentTypes, tournament_number: int, display: bool = True):
        self.tournamentType = tournament_type 
        self.tournamentNumber = tournament_number
        
        # read data from csv and store it
        raw_df, players, game_data, player_stats = get_championship_details(self.tournamentNumber, self.tournamentType)

        self.rawData = raw_df
        self.players = players
        self.playerStats = player_stats
        self.gameData = game_data

        if display:
            self.printTournamentHeader()
        
        self.pairwiseStats = get_pairwise_stats(self.rawData, min_num_games=10)
        self.trioStats = get_tri_stats(self.rawData, min_num_games=5)
        self.bidAndWonStats = get_bid_and_won_stats(self.rawData)

    def printTournamentHeader(self):
        
        print(f'> 3 of Spades {self.display()}')
        print(f'Players participating in this {self.tournamentType.display()} are : {self.players}')

    def num(self):
        return self.tournamentNumber
    
    def typ(self) -> TournamentTypes:
        return self.tournamentType
    
    def display(self):
        return f'{self.tournamentType.display()} #{self.tournamentNumber}'

    def getScoreBoard(self):
        return self.playerStats
    
    def getLeaderboardBarplot(self, save_image: bool = False):
        plot_leaderboard_barplot(self, save_image)
    
    def getTimeseriesPlot(self, save_image: bool = False):
        plot_leaderboard_timeseries(self, save_image)

    def getWinRatioSeriesPlot(self, save_image: bool = False):
        plot_performance_timeseries(self, save_image)


# todo - move this to different file later
def plot_leaderboard_barplot(tournament: Tournament, save_image: bool = False):
    player_stats = tournament.playerStats

    plt.figure(figsize=(7, 4))
    plt.bar(player_stats['Player'], player_stats['TotalPoints'], color=['pink', 'lightblue', 'lightgreen','lightcoral'])
    plt.xlabel('Player')
    plt.ylabel('Total Points')
    plt.title(f'Leaderboard : {tournament.display()}')
    plt.xticks(rotation=45)
    if save_image:
        plt.savefig(get_graph_path(tournament.num(), 'total_points'))
    plt.show()


def plot_leaderboard_timeseries(tournament: Tournament, save_image=False):

    # Plot the points accumulated over time
    plt.figure(figsize=(10, 6))

    game_data = tournament.gameData
    # Calculate cumulative points over time
    for player in tournament.players:
        plt.plot(game_data['Game ID'], game_data[f'CumSum_{player}'], marker='.', linestyle='-', label=player)

    plt.legend()
    plt.xlabel('Game Number')
    plt.ylabel('Points Accumulated')
    plt.title(f'Points Accumulated Over Time : {tournament.display()}')
    plt.grid(True)

    if save_image:
        plt.savefig(get_graph_path(tournament.num(), 'points_timeseries'))

    plt.show()


def plot_performance_timeseries(tournament: Tournament, save_image=False):
    game_data = tournament.gameData

    # Plot the points accumulated over time
    plt.figure(figsize=(10, 6))

    # Calculate cumulative points over time
    for player in tournament.players:
        plt.plot(game_data['Game ID'], game_data[f'WinRatio_{player}'], linestyle='-', label=player)

    plt.legend()
    plt.xlabel('Game Number')
    plt.ylabel('Win Ratio')
    plt.title(f'Win Ratio Over Time : {tournament.display()}')
    if save_image:
        plt.savefig(get_graph_path(tournament.num(), 'win_ratio_timeseries'))
    plt.grid(True)
    plt.show()


'''
from typing import List, Union

from enums.Suite import Suite
from utils.ErrorCode import (
    ERROR_INVALID_ARGUMENT,
    ERROR_INVALID_NUMBER_FOR_SUIT_JOKER,
    ERROR_INVALID_SUITE_FOR_NUMBER_ZERO,
)


class Card:
    number: int
    suite: Suite

    # initialize with Suite and Number
    def __init__(self, suite: Union[int, Suite], number: int):
        self.number = number
        if isinstance(suite, Suite):
            if self.number > 0 and suite is Suite.JOKER:
                raise Exception(ERROR_INVALID_NUMBER_FOR_SUIT_JOKER)
            if self.number == 0 and suite is not Suite.JOKER:
                raise Exception(ERROR_INVALID_SUITE_FOR_NUMBER_ZERO)
            self.suite = suite
        elif isinstance(suite, int):
            if self.number > 0 and suite == 0:
                raise Exception(ERROR_INVALID_NUMBER_FOR_SUIT_JOKER)
            if self.number == 0 and suite != 0:
                raise Exception(ERROR_INVALID_SUITE_FOR_NUMBER_ZERO)
            self.suite = Suite(suite)
        else:
            raise Exception(ERROR_INVALID_ARGUMENT)

    @property
    def toString(self) -> str:
        if self.suite is Suite.JOKER:
            return self.faceValue
        else:
            return self.faceValue + " of " + self.suite.name

    def __str__(self) -> str:
        return self.toString

    # returns face value
    @property
    def faceValue(self) -> str:
        if self.number == 0:
            return "Joker"
        elif self.number == 1:
            return "A"
        elif self.number == 11:
            return "J"
        elif self.number == 12:
            return "Q"
        elif self.number == 13:
            return "K"
        else:
            return str(self.number)

    # returns count of card
    @property
    def count(self) -> int:
        if self.number == 1:
            return 10
        return min(self.number, 10)

    # returns indices of card for hand matrix
    @property
    def getIndices(self) -> (int, int):
        return self.suite.value, self.number

    # method to return wildcard value
    def getWildCardValue(self) -> int:
        if self.suite is Suite.JOKER:
            return 1
        else:
            return self.number

    # method to return sequence value (used for sorting cards)
    def getSequenceValue(self, wildCardValue: int) -> int:
        if self.number == wildCardValue:
            return 0
        return self.number

    # method to get hash value
    def getHash(self, wildCardValue: int) -> str:
        if self.number == wildCardValue:
            return "0,0"
        return "{},{}".format(self.suite.value, self.number)

    # method to determine, if card is a joker
    def isJoker(self, wildCardValue: int) -> bool:
        return self.number == 0 or self.number == wildCardValue

    # method to get card count, considering wildCardValue
    def cardCountConsideringJoker(self, wildCardValue: int) -> int:
        if self.isJoker(wildCardValue):
            return 0
        return self.count


# function to print list of cards
def printCards(cards: List[Card], delimiter: str = ", ") -> None:
    seq = delimiter.join([str(card) for card in cards])
    print(seq)
'''
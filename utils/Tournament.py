from utils.constants import TournamentTypes
from utils.data_cruncher import get_championship_details
from utils.plot_utils import plot_leaderboard_barplot_v2


class Tournament:

    tournamentType: TournamentTypes
    tournamentNumber: int
    # todo create Player class
    rawData: object
    players: list[str]
    playerStats: object
    gameData: object


    def __init__(self, tournament_type: TournamentTypes, tournament_number: int):
        self.tournamentType = tournament_type 
        self.tournamentNumber = tournament_number
        
        # read data from csv and store it
        raw_df, players, game_data, player_stats = get_championship_details(self.tournamentNumber, self.tournamentType)

        self.rawData = raw_df
        self.players = players
        self.playerStats = player_stats
        self.gameData = game_data
        
    def getScoreBoard(self):
        return self.playerStats
    
    def getLeaderboardBarplot(self, save_image: bool = False):
        return plot_leaderboard_barplot_v2(self.playerStats, self.tournamentType, self.tournamentNumber, save_image)
    
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
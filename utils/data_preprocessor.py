import pandas as pd
import numpy as np

from utils.constants import NON_PLAYER_COLUMNS, TournamentTypes, get_datascore_path

# returns raw_df containing tournament scores
def get_tourney_data(tourney_number, is_mini_championship=False, is_friendly=False):
  
  # setting tournament type based on flags -- need to refactor
  tournament_type = TournamentTypes.CHAMPIONSHIP
  # checking both flags are not set to True
  assert not(is_friendly and is_mini_championship)

  if is_friendly:
    tournament_type = TournamentTypes.FRIENDLY
  elif is_mini_championship:
    tournament_type = TournamentTypes.MINI_CHAMPIONSHIP
  
  return get_tourney_data_v2(tourney_number, tournament_type=tournament_type)

# returns raw_df containing tournament scores
def get_tourney_data_v2(tourney_number, tournament_type = TournamentTypes.CHAMPIONSHIP):
  
  df = pd.read_csv(get_datascore_path(tourney_number, tournament_type))

  # inserting new column for Game ID
  df.insert(0, 'Game ID', np.arange(1, df.shape[0]+1))

  for col in df.columns:
    # optional block if you have bidder info
    if col in NON_PLAYER_COLUMNS:
        continue
    df[col] = df[col].astype(int)

  return df

# returns List of players participating using raw_df
def get_players(raw_df):
  players = list(filter(lambda player: player not in NON_PLAYER_COLUMNS, list(raw_df.columns[1:])))
  return players

# returns game_data which is enhanced raw_df
def get_game_data_as_timeseries(raw_df):
  # Load the data from the CSV file
  game_data = raw_df.copy(deep=True)
  players = get_players(raw_df)

  for player in players:
    game_data[f'CumSum_{player}'] = game_data[player].cumsum()
    game_data[f'MovingAvgPoints_{player}'] = game_data[f'CumSum_{player}']/game_data['Game ID']
    game_data[f'{player}_Won'] = game_data[f'{player}'].apply(lambda x: 1 if x > 0 else 0)
    game_data[f'NumGamesWon_{player}'] = game_data[f'{player}_Won'].cumsum()
    game_data[f'WinRatio_{player}'] = game_data[f'NumGamesWon_{player}']/game_data['Game ID']

  return game_data

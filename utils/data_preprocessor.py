import pandas as pd
import numpy as np

# non-player columns
NON_PLAYER_COLUMNS = {'Bidder'}

# returns raw_df containing tournament scores
def get_tourney_data(tourney_number):

  df = pd.read_csv(f'tourney_data/raw_scores/championship_{tourney_number}.csv')

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
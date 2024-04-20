import pandas as pd
import numpy as np

# non-player columns
NON_PLAYER_COLUMNS = {'Bidder'}

def get_tourney_data(tourney_number):

  df = pd.read_csv(f'tourney_data/championship_{tourney_number}.csv')

  # inserting new column for Game ID
  df.insert(0, 'Game ID', np.arange(1, df.shape[0]+1))

  for col in df.columns:
    # optional block if you have bidder info
    if col in NON_PLAYER_COLUMNS:
        continue
    df[col] = df[col].astype(int)

  return df

def get_players(df):
  players = list(filter(lambda player: player not in NON_PLAYER_COLUMNS, list(df.columns[1:])))
  return players

def get_game_data_as_timeseries(df):
  # Load the data from the CSV file
  game_data = df.copy(deep=True)
  players = get_players(df)

  for player in players:
    game_data[f'CumSum_{player}'] = game_data[player].cumsum()
    game_data[f'MovingAvgPoints_{player}'] = game_data[f'CumSum_{player}']/game_data['Game ID']
    game_data[f'{player}_Won'] = game_data[f'{player}'].apply(lambda x: 1 if x > 0 else 0)
    game_data[f'NumGamesWon_{player}'] = game_data[f'{player}_Won'].cumsum()
    game_data[f'WinRatio_{player}'] = game_data[f'NumGamesWon_{player}']/game_data['Game ID']

  return game_data

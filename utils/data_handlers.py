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

# Get player stats from raw_df
def get_player_stats(raw_df):

  player_stats = raw_df.melt(id_vars=['Game ID'], var_name='Player', value_name='Points')
  player_stats['Result'] = player_stats['Points'].apply(lambda x: 'Win' if x > 0 else 'Lose')
  # Calculate wins, losses, and win ratio
  player_stats['Wins'] = player_stats['Result'].apply(lambda x: 1 if x == 'Win' else 0)
  player_stats['Losses'] = player_stats['Result'].apply(lambda x: 1 if x == 'Lose' else 0)

  player_stats = player_stats.groupby('Player').agg(
    Wins=pd.NamedAgg(column='Wins', aggfunc='sum'),
    # Losses=pd.NamedAgg(column='Losses', aggfunc='sum'),
    TotalGames=pd.NamedAgg(column='Game ID', aggfunc='count'),
    AvgPoints=pd.NamedAgg(column='Points', aggfunc='mean'),
    TotalPoints=pd.NamedAgg(column='Points', aggfunc='sum'),
  ).reset_index()

  player_stats['WinRatio'] = player_stats['Wins'] / (player_stats['TotalGames'])
  player_stats = player_stats.sort_values(by=['TotalPoints', 'Wins'], ascending = False)
  return player_stats

def get_bid_and_won_stats(raw_df):
  players = get_players(raw_df)
  
  bid_and_win = {}
  for player in players:
    bid_and_win[player] = 0

  for index, row in raw_df.iterrows():
      x = row[1:]
      if(x.sum()%x.max()!=0):
        for player in players:
          if x[player] == x.max():
            bid_and_win[player] += 1

  res = pd.DataFrame(bid_and_win.items(), columns=['Player', 'Bid and Won'])
  res = res.sort_values(by=['Bid and Won'], ascending = False)
  return res

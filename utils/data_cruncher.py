import pandas as pd
import numpy as np

from utils.data_preprocessor import get_game_data_as_timeseries, get_players, get_tourney_data_v2

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

  player_stats['WinPercentage'] = 100.0* player_stats['Wins'] / (player_stats['TotalGames'])
  player_stats = player_stats.sort_values(by=['TotalPoints', 'Wins'], ascending = False)
  
  # rounding up values
  player_stats = player_stats.round({'AvgPoints': 1, 'WinPercentage': 1})
  return player_stats


def get_championship_details(tourney_number, tournament_type):
    
    raw_df = get_tourney_data_v2(tourney_number, tournament_type=tournament_type)
    game_data = get_game_data_as_timeseries(raw_df)
    players = get_players(raw_df)

    print(f'## 3 of Spades {tournament_type.display()} - {tourney_number}')
    print(f'Players participating in this {tournament_type.display()} are : {players}')

    player_stats = get_player_stats(raw_df)
    player_stats.to_csv(f'tourney_data/graphs/{tournament_type.code()}{tourney_number}_player_stats.csv')

    return raw_df, players, game_data, player_stats


def get_bid_and_won_stats(raw_df):
  players = get_players(raw_df)
  
  bid_and_win = {}
  for player in players:
    bid_and_win[player] = 0

  for _, row in raw_df.iterrows():
      x = row[1:]
      if(x.sum()%x.max()!=0):
        for player in players:
          if x[player] == x.max():
            bid_and_win[player] += 1

  res = pd.DataFrame(bid_and_win.items(), columns=['Player', 'Bid and Won'])
  res = res.sort_values(by=['Bid and Won'], ascending = False)
  return res

def get_pairwise_stats(df, min_num_games=10):

  # Calculate statistics for each pair of players when they are on the same team
  same_team_stats = df.melt(id_vars=['Game ID'], var_name='Player', value_name='Points')
  same_team_stats['Result'] = same_team_stats['Points'].apply(lambda x: 'Win' if x > 0 else 'Lose')

  same_team_stats['join_id'] = same_team_stats['Points'].apply(lambda x: 'Win' if x > 0 else 'Lose')

  # computing pairwise by JOIN
  result = same_team_stats.merge(same_team_stats, left_on=['Game ID', 'Result'], right_on=['Game ID', 'Result'], how='inner')
  result = result[result['Player_x'] != result['Player_y']]
  result = result[result['Player_x'] < result['Player_y']]
  result['Wins'] = result['Result'].apply(lambda x: 1 if x == 'Win' else 0)
  result['Losses'] = result['Result'].apply(lambda x: 1 if x == 'Lose' else 0)
  result['Points'] = result[['Points_x','Points_y']].min(axis=1)

  result = result.sort_values(by=['Game ID'])
  result = result.reset_index()

  result = result.groupby(['Player_x', 'Player_y']).agg(
    Wins=pd.NamedAgg(column='Wins', aggfunc='sum'),
    Losses=pd.NamedAgg(column='Losses', aggfunc='sum'),
    TotalGames=pd.NamedAgg(column='Game ID', aggfunc='count'),
    AvgPoints=pd.NamedAgg(column='Points', aggfunc='mean'),
  ).reset_index()

  result['WinPercentage'] = 100.0*result['Wins'] / (result['Wins'] + result['Losses'])
  result = result.sort_values(by=['WinPercentage'], ascending = False)
  # rounding up values
  result = result.round({'AvgPoints': 1, 'WinPercentage': 1})

  # filtering based on min_num_games threshold
  result = result[result['TotalGames']>=min_num_games]

  return result

def get_tri_stats(df, min_num_games=5):

  # Calculate statistics for each pair of players when they are on the same team
  same_team_stats = df.melt(id_vars=['Game ID'], var_name='Player', value_name='Points')
  same_team_stats['Result'] = same_team_stats['Points'].apply(lambda x: 'Win' if x > 0 else 'Lose')
  same_team_stats['join_id'] = same_team_stats['Points'].apply(lambda x: 'Win' if x > 0 else 'Lose')

  # computing pairwise by JOIN
  result = same_team_stats.merge(same_team_stats, left_on=['Game ID', 'Result'], right_on=['Game ID', 'Result'], how='inner')
  result = result.merge(same_team_stats, left_on=['Game ID', 'Result'], right_on=['Game ID', 'Result'], how='inner')
  result = result.rename(columns={"Player": "Player_z", "Points": "Points_z"})

  # filtering out bad values
  result = result[result['Player_x'] != result['Player_y']]
  result = result[result['Player_y'] != result['Player_z']]
  result = result[result['Player_x'] != result['Player_z']]

  result = result[result['Player_x'] < result['Player_y']]
  result = result[result['Player_y'] < result['Player_z']]
  result = result[result['Player_x'] < result['Player_z']]

  result['Wins'] = result['Result'].apply(lambda x: 1 if x == 'Win' else 0)
  result['Losses'] = result['Result'].apply(lambda x: 1 if x == 'Lose' else 0)
  result['Points'] = result[['Points_x','Points_y', 'Points_z']].min(axis=1)

  result = result.sort_values(by=['Game ID'])
  result = result.reset_index()

  result = result.groupby(['Player_x', 'Player_y', 'Player_z']).agg(
    Wins=pd.NamedAgg(column='Wins', aggfunc='sum'),
    Losses=pd.NamedAgg(column='Losses', aggfunc='sum'),
    TotalGames=pd.NamedAgg(column='Game ID', aggfunc='count'),
    AvgPoints=pd.NamedAgg(column='Points', aggfunc='mean'),
  ).reset_index()

  result['WinPercentage'] = 100.0*result['Wins'] / (result['Wins'] + result['Losses'])
  result = result.sort_values(by=['WinPercentage'], ascending = False)
  # rounding up values
  result = result.round({'AvgPoints': 1, 'WinPercentage': 1})

  # filtering based on min_num_games threshold
  result = result[result['TotalGames']>=min_num_games]

  return result

import matplotlib.pyplot as plt


def plot_leaderboard_barplot(player_stats, tourney_number, save_image=False):
    plt.figure(figsize=(7, 4))
    plt.bar(player_stats['Player'], player_stats['TotalPoints'], color=['pink', 'lightblue', 'lightgreen','lightcoral'])
    plt.xlabel('Player')
    plt.ylabel('Total Points')
    plt.title(f'Total Points for Each Individual Player : Championship #{tourney_number}')
    plt.xticks(rotation=45)
    if save_image:
        plt.savefig(f'tourney_data/graphs/C{tourney_number}_total_points.png')
    plt.show()


def plot_performance_timeseries(game_data, players, tourney_number, save_image=False):

  # Plot the points accumulated over time
  plt.figure(figsize=(10, 6))

  # Calculate cumulative points over time
  for player in players:
    plt.plot(game_data['Game ID'], game_data[f'WinRatio_{player}'], linestyle='-', label=player)

  plt.legend()
  plt.xlabel('Game Number')
  plt.ylabel('Win Ratio')
  plt.title(f'Win Ratio Over Time : Championship #{tourney_number}')
  if save_image:
    plt.savefig(f'tourney_data/graphs/C{tourney_number}_win_ratio_timeseries.png')
  plt.grid(True)
  plt.show()


def plot_leaderboard_timeseries(game_data, players, tourney_number, save_image=False):

  # Plot the points accumulated over time
  plt.figure(figsize=(10, 6))

  # Calculate cumulative points over time
  for player in players:
    plt.plot(game_data['Game ID'], game_data[f'CumSum_{player}'], marker='.', linestyle='-', label=player)

  plt.legend()
  plt.xlabel('Game Number')
  plt.ylabel('Points Accumulated')
  plt.title(f'Points Accumulated Over Time : Championship #{tourney_number}')
  plt.grid(True)
  
  if save_image:
    plt.savefig(f'tourney_data/graphs/C{tourney_number}_points_timeseries.png')
  
  plt.show()

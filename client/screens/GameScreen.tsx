// screens/GameScreen.tsx - 3x3 Board with WS Moves
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert, Button } from 'react-native';

interface GameState {
  board: string[];
  currentTurn: string;
  players: { [key: string]: string };
  winner: string;
  gameOver: boolean;
}

export default function GameScreen({ route, navigation }) {
  const { matchId, socket } = route.params;
  const [gameState, setGameState] = useState<GameState>({
    board: ['', '', '', '', '', '', '', '', ''],
    currentTurn: '',
    players: {},
    winner: '',
    gameOver: false,
  });
  const [myUserId] = useState('');  // Set from session.userId in lobby

  useEffect(() => {
    const handleMatchData = (data) => {
      if (data.matchId === matchId) {
        const state: GameState = JSON.parse(data.data);
        setGameState(state);
        if (state.gameOver) {
          const message = state.winner ? (state.winner === 'X' ? 'X Wins!' : 'O Wins!') : 'Draw!';
          Alert.alert('Game Over', message);
          navigation.navigate('Lobby');
        }
      }
    };

    socket.onmatchdata = handleMatchData;

    return () => {
      socket.onmatchdata = null;
    };
  }, [socket, matchId, navigation]);

  const makeMove = async (position: number) => {
    if (gameState.gameOver || gameState.board[position] !== '') return;
    try {
      await socket.sendMatchStateAsync(matchId, 1, JSON.stringify({ position }));  // OpCode 1 = move
    } catch (error) {
      Alert.alert('Move Failed', error.message);
    }
  };

  const renderCell = (index: number) => (
    <TouchableOpacity key={index} style={styles.cell} onPress={() => makeMove(index)}>
      <Text style={styles.symbol}>{gameState.board[index]}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.status}>
        {gameState.gameOver ? 'Game Over' : `Turn: ${gameState.currentTurn ? 'X' : 'O'}`}
      </Text>
      <View style={styles.board}>
        {Array.from({ length: 3 }, (_, row) =>
          <View key={row} style={styles.row}>
            {Array.from({ length: 3 }, (_, col) => renderCell(row * 3 + col))}
          </View>
        )}
      </View>
      <Button title="Leave Game" onPress={() => socket.leaveMatchAsync(matchId)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  status: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
  },
  board: {
    marginTop: 20,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  symbol: {
    fontSize: 50,
    fontWeight: 'bold',
  },
});
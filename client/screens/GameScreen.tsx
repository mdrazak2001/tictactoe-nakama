// screens/GameScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getSocket, getStoredSession } from './nakamaHelpers';
import type { Socket } from '@heroiclabs/nakama-js';

interface GameState {
  board: string[];
  currentTurn: string;
  players: { [key: string]: string };
  winner: string;
  gameOver: boolean;
}

export default function GameScreen({ route, navigation }: any) {
  const { matchId } = route.params;
  const socket: Socket | null = getSocket();

  const [gameState, setGameState] = useState<GameState>({
    board: Array(9).fill(''),
    currentTurn: '',
    players: {},
    winner: '',
    gameOver: false,
  });

  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [mySymbol, setMySymbol] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const session = await getStoredSession();
      if (!session) {
        Alert.alert('Session missing', 'Please login again');
        navigation.navigate('Lobby');
        return;
      }
      setMyUserId(session.user_id || null);
    })();
  }, [navigation]);

  useEffect(() => {
    if (!socket) {
      Alert.alert('Socket missing', 'Connection lost — returning to Lobby.');
      navigation.navigate('Lobby');
      return;
    }

    const handleMatchData = (m: any) => {
      try {
        const text = m.data ? new TextDecoder().decode(m.data) : null;
        console.log('[Game] onmatchdata op:', m.op_code, 'data:', text);

        if (!text) return;

        if (m.op_code === 1 || m.op_code === 2) {
          const state = JSON.parse(text);
          if (state.board && Array.isArray(state.board)) {
            const normalized: string[] = state.board.map((c: any) =>
              c === null || c === undefined ? '' : String(c)
            );
            state.board = normalized;
          }
          setGameState(state);
          if (state.players && myUserId) {
            setMySymbol(state.players[myUserId] ?? null);
          }
          if (state.gameOver) {
            const msg = state.winner ? `${state.winner} wins!` : "It's a draw!";
            setTimeout(() => {
              Alert.alert('Game Over', msg, [
                { text: 'Back to Lobby', onPress: () => navigation.navigate('Lobby') },
              ]);
            }, 500);
          }
        } else if (m.op_code === 3) {
          console.log('[Game] received leave/opcode3', text);
          Alert.alert('Opponent left', 'Opponent disconnected — returning to Lobby.', [
            { text: 'OK', onPress: () => navigation.navigate('Lobby') },
          ]);
        }
      } catch (err) {
        console.error('[Game] handleMatchData error', err);
      }
    };

    socket.onmatchdata = handleMatchData;

    return () => {
      if (socket) socket.onmatchdata = () => {};
    };
  }, [socket, myUserId, navigation]);

  const isMyTurn = () => {
    if (!myUserId || !gameState.currentTurn) return false;
    return gameState.currentTurn === myUserId;
  };

  const makeMove = async (position: number) => {
    if (!socket) {
      Alert.alert('Not connected', 'Socket missing.');
      return;
    }
    if (gameState.gameOver) return;
    if (gameState.board[position] !== '') return;
    if (!isMyTurn()) return;

    try {
      await socket.sendMatchState(matchId, 1, JSON.stringify({ position }));
      console.log('[Game] move sent', position);
    } catch (err) {
      console.error('[Game] sendMatchState error', err);
      Alert.alert('Move Failed', String(err));
    }
  };

  const leaveGame = async () => {
    if (!socket) {
      navigation.navigate('Lobby');
      return;
    }
    try {
      await socket.leaveMatch(matchId);
    } catch (err) {
      console.warn('[Game] leaveMatch error', err);
    } finally {
      navigation.navigate('Lobby');
    }
  };

  const getCellStyle = (index: number) => {
    const value = gameState.board[index];
    if (value === 'X') return styles.cellX;
    if (value === 'O') return styles.cellO;
    return null;
  };

  const renderCell = (index: number) => (
    <TouchableOpacity
      key={index}
      style={[
        styles.cell,
        getCellStyle(index),
        (!isMyTurn() || gameState.board[index] !== '') && styles.cellDisabled,
      ]}
      onPress={() => makeMove(index)}
      activeOpacity={0.7}
    >
      <Text style={[styles.symbol, gameState.board[index] === 'O' && styles.symbolO]}>
        {gameState.board[index]}
      </Text>
    </TouchableOpacity>
  );

  const turnLabel = () => {
    if (gameState.gameOver) return 'Game Over';
    if (!gameState.currentTurn) return 'Waiting for opponent...';
    const turnUserId = gameState.currentTurn;
    const symbol = gameState.players && gameState.players[turnUserId] ? gameState.players[turnUserId] : null;
    if (turnUserId === myUserId) {
      return `Your turn (${symbol})`;
    }
    return `Opponent's turn (${symbol})`;
  };

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={[styles.statusBadge, isMyTurn() && !gameState.gameOver && styles.statusBadgeActive]}>
            <Text style={styles.statusText}>{turnLabel()}</Text>
          </View>
          <Text style={styles.playerInfo}>You are playing as {mySymbol || '...'}</Text>
        </View>

        <View style={styles.boardContainer}>
          <View style={styles.board}>
            {Array.from({ length: 3 }, (_, row) => (
              <View key={row} style={styles.row}>
                {Array.from({ length: 3 }, (_, col) => renderCell(row * 3 + col))}
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.leaveButton} onPress={leaveGame}>
          <Text style={styles.leaveButtonText}>Leave Game</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    marginTop: 60,
    alignItems: 'center',
  },
  statusBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 15,
  },
  statusBadgeActive: {
    backgroundColor: '#4CAF50',
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  playerInfo: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.9,
  },
  boardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  board: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 10,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: 100,
    height: 100,
    backgroundColor: '#fff',
    margin: 5,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  cellX: {
    backgroundColor: '#e3f2fd',
  },
  cellO: {
    backgroundColor: '#fce4ec',
  },
  cellDisabled: {
    opacity: 0.6,
  },
  symbol: {
    fontSize: 60,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  symbolO: {
    color: '#E91E63',
  },
  leaveButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  leaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
// screens/GameScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert, Button } from 'react-native';
import { getSocket } from './nakamaHelpers'; // adjust path if needed
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
    board: ['', '', '', '', '', '', '', '', ''],
    currentTurn: '',
    players: {},
    winner: '',
    gameOver: false,
  });

  useEffect(() => {
    if (!socket) {
      Alert.alert('Socket missing', 'Connection was lost. Returning to Lobby.');
      navigation.navigate('Lobby');
      return;
    }

    // Handler expects Nakama MatchData shape
    const handleMatchData = (m: any) => {
      try {
        // m.data is Uint8Array or null
        const text = m.data ? new TextDecoder().decode(m.data) : null;
        console.log('[Game] onmatchdata op:', m.op_code, 'data:', text);
        if (!text) return;

        // assume server sends serialized GameState for opCode 2
        if (m.op_code === 2) {
          const state = JSON.parse(text);
          setGameState(state);
          if (state.gameOver) {
            const message = state.winner ? `${state.winner} Wins!` : 'Draw!';
            Alert.alert('Game Over', message, [{ text: 'OK', onPress: () => navigation.navigate('Lobby') }]);
          }
        }
      } catch (err) {
        console.error('[Game] error handling match data', err);
      }
    };

    // Attach handler
    socket.onmatchdata = handleMatchData;

    // Cleanup
    return () => {
      // remove handler only if same socket
      if (socket) {
        // best-effort: clear handler
        socket.onmatchdata = () => {};
      }
    };
  }, [socket, matchId, navigation]);

  const makeMove = async (position: number) => {
    if (!socket) {
      Alert.alert('Not connected', 'Socket missing.');
      return;
    }
    if (gameState.gameOver || gameState.board[position] !== '') return;

    try {
      // Use opCode 1 for move (server expects this)
      // In nakama-js v3 the method is sendMatchState (not sendMatchStateAsync)
      await socket.sendMatchState(matchId, 1, JSON.stringify({ position }));
      console.log('[Game] move sent', position);
    } catch (err: any) {
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

  const renderCell = (index: number) => (
    <TouchableOpacity key={index} style={styles.cell} onPress={() => makeMove(index)}>
      <Text style={styles.symbol}>{gameState.board[index]}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.status}>
        {gameState.gameOver ? 'Game Over' : `Turn: ${gameState.currentTurn || '—'}`}
      </Text>
      <View style={styles.board}>
        {Array.from({ length: 3 }, (_, row) =>
          <View key={row} style={styles.row}>
            {Array.from({ length: 3 }, (_, col) => renderCell(row * 3 + col))}
          </View>
        )}
      </View>
      <Button title="Leave Game" onPress={leaveGame} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  status: { fontSize: 18, fontWeight: 'bold', marginTop: 20 },
  board: { marginTop: 20 },
  row: { flexDirection: 'row' },
  cell: { width: 100, height: 100, borderWidth: 2, borderColor: '#333', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  symbol: { fontSize: 50, fontWeight: 'bold' },
});

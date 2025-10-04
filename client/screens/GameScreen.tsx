// screens/GameScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert, Button } from 'react-native';
import { getSocket, getStoredSession } from './nakamaHelpers';
import type { Socket } from '@heroiclabs/nakama-js';

interface GameState {
  board: string[];              // "X" | "O" | ""
  currentTurn: string;         // userId of player whose turn it is
  players: { [key: string]: string }; // userId -> "X"|"O"
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
    // get my user id from stored session
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

        // server sometimes sends initial state with op 1, updates with op 2, leave with op 3
        if (!text) {
          // some opcodes might not carry text — ignore
          return;
        }

        if (m.op_code === 1 || m.op_code === 2) {
          // Expect server to send serialized GameState
          const state = JSON.parse(text);
          // Normalize board to string array
          if (state.board && Array.isArray(state.board)) {
            const normalized: string[] = state.board.map((c: any) => (c === null || c === undefined ? '' : String(c)));
            state.board = normalized;
          }
          setGameState(state);
          // if we have players mapping and myUserId, set mySymbol
          if (state.players && myUserId) {
            setMySymbol(state.players[myUserId] ?? null);
          }
          if (state.gameOver) {
            const msg = state.winner ? `Winner: ${state.winner}` : 'Draw';
            Alert.alert('Game Over', msg, [{ text: 'OK', onPress: () => navigation.navigate('Lobby') }]);
          }
        } else if (m.op_code === 3) {
          // player left — server might send info about leave
          console.log('[Game] received leave/opcode3', text);
          // update UI or go back to lobby
          Alert.alert('Opponent left', 'Opponent disconnected — returning to Lobby.', [
            { text: 'OK', onPress: () => navigation.navigate('Lobby') },
          ]);
        } else {
          console.log('[Game] unhandled opcode', m.op_code);
        }
      } catch (err) {
        console.error('[Game] handleMatchData error', err);
      }
    };

    // Attach handler
    socket.onmatchdata = handleMatchData;

    // Cleanup
    return () => {
      if (socket) socket.onmatchdata = () => {};
    };
  }, [socket, myUserId, navigation]);

  // helper: check if it's this client's turn
  const isMyTurn = () => {
    if (!myUserId || !gameState.currentTurn) return false;
    return gameState.currentTurn === myUserId;
  };

  const makeMove = async (position: number) => {
    if (!socket) {
      Alert.alert('Not connected', 'Socket missing.');
      return;
    }
    if (gameState.gameOver) {
      Alert.alert('Game Over', 'This game is finished.');
      return;
    }
    if (gameState.board[position] !== '') {
      return; // cell occupied
    }

    // check server-authoritative: only send if it's my turn (client-side check)
    if (!isMyTurn()) {
      Alert.alert('Wait', "It's not your turn.");
      return;
    }

    try {
      // opCode 1 = move (server expects this)
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

  // render helpers
  const renderCell = (index: number) => (
    <TouchableOpacity
      key={index}
      style={[styles.cell, (!isMyTurn() || gameState.board[index] !== '') && styles.cellDisabled]}
      onPress={() => makeMove(index)}
      activeOpacity={0.7}
    >
      <Text style={styles.symbol}>{gameState.board[index]}</Text>
    </TouchableOpacity>
  );

  const turnLabel = () => {
    if (gameState.gameOver) return 'Game Over';
    if (!gameState.currentTurn) return 'Waiting...';
    // If we have a mapping to symbol, show symbol + (you)
    const turnUserId = gameState.currentTurn;
    const symbol = gameState.players && gameState.players[turnUserId] ? gameState.players[turnUserId] : null;
    if (turnUserId === myUserId) {
      return `Your turn (${symbol ?? ''})`;
    }
    return `Opponent's turn (${symbol ?? ''})`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.status}>{turnLabel()}</Text>

      <View style={styles.board}>
        {Array.from({ length: 3 }, (_, row) => (
          <View key={row} style={styles.row}>
            {Array.from({ length: 3 }, (_, col) => renderCell(row * 3 + col))}
          </View>
        ))}
      </View>

      <View style={{ width: '100%', alignItems: 'center', marginBottom: 24 }}>
        <Text> You: {mySymbol ?? '-' } </Text>
        <Button title="Leave Game" onPress={leaveGame} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  status: { fontSize: 18, fontWeight: 'bold', marginTop: 20 },
  board: { marginTop: 20 },
  row: { flexDirection: 'row' },
  cell: { width: 100, height: 100, borderWidth: 2, borderColor: '#333', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  cellDisabled: { opacity: 0.6 },
  symbol: { fontSize: 50, fontWeight: 'bold' },
});

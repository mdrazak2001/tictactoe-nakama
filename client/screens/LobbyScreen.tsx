// screens/LobbyScreen.tsx - Matchmaking for 2 Modes
import React, { useState, useEffect } from 'react';
import { View, Text, Button, Alert, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client, Socket } from '@heroiclabs/nakama-js';

const NAKAMA_HOST = 'localhost';
const NAKAMA_PORT = 7350;
const NAKAMA_HTTP_KEY = 'defaultkey';

const client = new Client(`http://${NAKAMA_HOST}:${NAKAMA_PORT}`, NAKAMA_HTTP_KEY, false, NAKAMA_PORT);

export default function LobbyScreen({ navigation }) {
  const [session, setSession] = useState(null);
  const [socket, setSocket] = useState(null);
  const [matchId, setMatchId] = useState('');
  const [queuing, setQueuing] = useState(false);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    const stored = await AsyncStorage.getItem('session');
    if (stored) {
      const sess = JSON.parse(stored);
      setSession(sess);
      const sock = client.createSocket();
      await sock.connect(sess.token, false, false);  // Connect with token
      setSocket(sock);
    } else {
      navigation.navigate('Auth');
    }
  };

  const startMatchmaking = async (mode: 'casual' | 'ranked') => {
    if (!socket) return Alert.alert('Error', 'Not connected');
    setQueuing(true);
    try {
      const query = mode === 'casual' ? '*' : 'mode:ranked';  // Query for modes
      const ticket = await socket.addMatchmakerAsync({ query, minCount: 2, maxCount: 2 });
      socket.onmatchmakerjoined = async (joined) => {
        if (joined.matches && joined.matches.length > 0) {
          const match = await socket.joinMatchAsync(joined.matches[0].matchId);
          setMatchId(match.matchId);  // Token: Share this matchId
          navigation.navigate('Game', { matchId: match.matchId, socket, session });
        }
      };
    } catch (error) {
      Alert.alert('Queue Failed', error.message);
    }
    setQueuing(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lobby</Text>
      <Text>Choose Mode to Queue</Text>
      <Button title={queuing ? "Queuing..." : "Casual Mode"} onPress={() => startMatchmaking('casual')} disabled={queuing} />
      <Button title={queuing ? "Queuing..." : "Ranked Mode"} onPress={() => startMatchmaking('ranked')} disabled={queuing} />
      <Button title="View Leaderboard" onPress={() => navigation.navigate('Leaderboard')} />
      {matchId && <Text style={styles.token}>Match Token: {matchId} (Share with opponent)</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  token: {
    marginTop: 20,
    fontSize: 12,
    textAlign: 'center',
    color: 'gray',
  },
});
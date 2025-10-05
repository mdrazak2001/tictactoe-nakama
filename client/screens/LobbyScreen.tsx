// screens/LobbyScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { getStoredSession, createSocketAndConnect, findMatch, joinMatch, removeMatchmaker } from './nakamaHelpers';
import type { Socket, Session, MatchmakerTicket } from '@heroiclabs/nakama-js';

type RootStackParamList = {
  Auth: undefined;
  Lobby: undefined;
  Game: { matchId: string };
  Leaderboard: undefined;
};

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Lobby'>;
};

export default function LobbyScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const ticketRef = useRef<MatchmakerTicket | null>(null);

  useEffect(() => {
    loadUsername();
    return () => {
      (async () => {
        if (socketRef.current && ticketRef.current) {
          await removeMatchmaker(socketRef.current, ticketRef.current);
        }
      })();
    };
  }, []);

  const loadUsername = async () => {
    const session = await getStoredSession();
    if (session?.username) {
      setUsername(session.username);
    }
  };

  const joinMatchFlow = async () => {
    setLoading(true);
    try {
      const session: Session | null = await getStoredSession();
      if (!session) {
        Alert.alert('Session missing', 'Please login first');
        setLoading(false);
        return;
      }

      let sock = socketRef.current;
      if (!sock) {
        sock = await createSocketAndConnect(session);
        socketRef.current = sock;
      }

      sock.onmatchmakermatched = async (mm: any) => {
        console.log('[Lobby] onmatchmakermatched', mm);
        try {
          const matchId = mm.match_id;
          const token = mm.token;
          await joinMatch(sock!, matchId, token);
          ticketRef.current = null;
          setLoading(false);
          navigation.navigate('Game', { matchId });
        } catch (err) {
          console.error('[Lobby] error joining match', err);
          Alert.alert('Join match failed', String(err));
          setLoading(false);
        }
      };

      sock.onmatchdata = (m: any) => {
        const text = m.data ? new TextDecoder().decode(m.data) : null;
        console.log('[Lobby] onmatchdata', m.op_code, text);
      };

      const ticket = await findMatch(sock, 'casual');
      ticketRef.current = ticket;
      console.log('[Lobby] matchmaker ticket:', ticket);
    } catch (err) {
      console.error('[Lobby] joinMatchFlow error', err);
      Alert.alert('Matchmaking Error', String(err));
      setLoading(false);
    }
  };

  const cancelMatchmaking = async () => {
    setLoading(false);
    const sock = socketRef.current;
    const ticket = ticketRef.current;
    if (sock && ticket) {
      await removeMatchmaker(sock, ticket);
      ticketRef.current = null;
    }
  };

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Tic-Tac-Toe</Text>
          <Text style={styles.subtitle}>Welcome, {username}!</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.card}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#667eea" />
                <Text style={styles.loadingText}>Finding opponent...</Text>
                <TouchableOpacity style={styles.cancelButton} onPress={cancelMatchmaking}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TouchableOpacity style={styles.playButton} onPress={joinMatchFlow}>
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.playButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.playButtonText}>Find Match</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.leaderboardButton}
                  onPress={() => navigation.navigate('Leaderboard')}
                >
                  <Text style={styles.leaderboardButtonText}>Leaderboard</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Ready to play?</Text>
        </View>
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
    padding: 20,
    justifyContent: 'space-between',
  },
  header: {
    marginTop: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  playButton: {
    marginBottom: 15,
    borderRadius: 15,
    overflow: 'hidden',
  },
  playButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  playButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  leaderboardButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
  },
  leaderboardButtonText: {
    color: '#667eea',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
});
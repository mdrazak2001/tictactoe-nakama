// screens/LobbyScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
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
  const [ticketInfo, setTicketInfo] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const ticketRef = useRef<MatchmakerTicket | null>(null);

  useEffect(() => {
    return () => {
      // cleanup on unmount: optionally remove matchmaker / disconnect socket
      (async () => {
        if (socketRef.current && ticketRef.current) {
          await removeMatchmaker(socketRef.current, ticketRef.current);
        }
        // keep socket connected if you want to reuse; otherwise disconnect:
        // socketRef.current?.disconnect();
      })();
    };
  }, []);

  const joinMatchFlow = async () => {
    setLoading(true);
    try {
      const session: Session | null = await getStoredSession();
      if (!session) {
        Alert.alert('Session missing', 'Please login first');
        setLoading(false);
        return;
      }

      // ensure socket is created + connected and attach handlers BEFORE findMatch
      let sock = socketRef.current;
      if (!sock) {
        sock = await createSocketAndConnect(session);
        socketRef.current = sock;
      }

      // Attach handlers (safe to re-assign; refer to same sock ref)
      sock.onmatchmakermatched = async (mm: any) => {
        console.log('[Lobby] onmatchmakermatched', mm);
        try {
          const matchId = mm.match_id;
          const token = mm.token;
          // join the match first (server-authoritative)
          await joinMatch(sock!, matchId, token);
          // clear ticket & loading before navigation
          ticketRef.current = null;
          setTicketInfo(null);
          setLoading(false);
          navigation.navigate('Game', { matchId });
        } catch (err) {
          console.error('[Lobby] error joining match', err);
          Alert.alert('Join match failed', String(err));
          setLoading(false);
        }
      };

      // attach matchdata for debugging (board updates, etc.)
      sock.onmatchdata = (m: any) => {
        const text = m.data ? new TextDecoder().decode(m.data) : null;
        console.log('[Lobby] onmatchdata', m.op_code, text);
      };

      // Now add to matchmaker
      const ticket = await findMatch(sock, 'casual');
      ticketRef.current = ticket;
      setTicketInfo(JSON.stringify(ticket));
      console.log('[Lobby] matchmaker ticket:', ticket);
      // keep loading true until matched or canceled
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
      setTicketInfo(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lobby</Text>
      <Button title={loading ? 'Finding Match...' : 'Find Match'} onPress={joinMatchFlow} disabled={loading} />
      <View style={{ marginTop: 12 }}>
        <Text>Ticket: {ticketInfo ?? 'none'}</Text>
      </View>
      {loading && <Button title="Cancel" onPress={cancelMatchmaking} />}
      <Button title="Leaderboard" onPress={() => navigation.navigate('Leaderboard')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
});

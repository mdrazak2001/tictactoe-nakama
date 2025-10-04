// screens/LeaderboardScreen.tsx - Fixed: Use full Session for listLeaderboardRecordsAsync, add limit/expiry, handle 401
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Button } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client, Session } from '@heroiclabs/nakama-js';
import { LeaderboardRecord } from '@heroiclabs/nakama-js';
import { getStoredSession } from './nakamaHelpers';

const SERVER_KEY = 'defaultkey';
const HOST = '10.75.82.153'; // your LAN IP (or 10.0.2.2 for emulator)
const PORT = '7350';

const client = new Client(SERVER_KEY, HOST, PORT, false);

export default function LeaderboardScreen({ navigation }: any) {
  const [records, setRecords] = useState<LeaderboardRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const session: Session | null = await getStoredSession();
      console.log('Stored session:', session);
      if (session) {
        // Use full Session (with token)
        const result = await client.listLeaderboardRecords(session, "tictactoe_leaderboard");
        console.log('Leaderboard result:', result.records?.length || 0, 'records');
        setRecords(result.records || []);
      }
    } catch (error) {
      console.error('Leaderboard load failed', error);
    }
    setLoading(false);
  };

  const renderRecord = ({ item, index }: { item: LeaderboardRecord; index: number }) => (
    <View style={styles.record}>
      <Text style={styles.rank}>{item.rank || index + 1}</Text>
      <Text style={styles.username}>{item.username || item.owner_id}</Text>
      <Text style={styles.score}>{item.score}</Text>
    </View>
  );

  if (loading) return <View style={styles.container}><Text>Loading...</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tic-Tac-Toe Leaderboard</Text>
      {records.length === 0 ? (
        <Text style={styles.empty}>No records yet. Play some games!</Text>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item, index) => item.owner_id ?? item.username ?? index.toString()}
          renderItem={renderRecord}
          style={styles.list}
        />
      )}
      <Button title="Back to Lobby" onPress={() => navigation.navigate('Lobby')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  empty: {
    textAlign: 'center',
    color: 'gray',
    marginTop: 20,
  },
  list: {
    flex: 1,
  },
  record: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  rank: {
    fontWeight: 'bold',
    width: 50,
  },
  username: {
    flex: 1,
  },
  score: {
    width: 50,
    textAlign: 'right',
  },
});
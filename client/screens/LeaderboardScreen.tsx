// screens/LeaderboardScreen.tsx - Top Players List
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client } from '@heroiclabs/nakama-js';

const NAKAMA_HOST = 'localhost';
const NAKAMA_PORT = 7350;
const NAKAMA_HTTP_KEY = 'defaultkey';

const client = new Client(`http://${NAKAMA_HOST}:${NAKAMA_PORT}`, NAKAMA_HTTP_KEY, false, NAKAMA_PORT);

export default function LeaderboardScreen({ navigation }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const stored = await AsyncStorage.getItem('session');
      if (stored) {
        const sess = JSON.parse(stored);
        const result = await client.listLeaderboardRecordsAsync(sess.token, "tictactoe_leaderboard", 10);
        setRecords(result.records || []);
      }
    } catch (error) {
      console.error('Leaderboard load failed', error);
    }
    setLoading(false);
  };

  const renderRecord = ({ item }) => (
    <View style={styles.record}>
      <Text style={styles.rank}>{item.rank}</Text>
      <Text style={styles.username}>{item.username || item.ownerId}</Text>
      <Text style={styles.score}>{item.score}</Text>
    </View>
  );

  if (loading) return <View style={styles.container}><Text>Loading...</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tic-Tac-Toe Leaderboard</Text>
      <FlatList
        data={records}
        keyExtractor={(item) => item.ownerId}
        renderItem={renderRecord}
        style={styles.list}
      />
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
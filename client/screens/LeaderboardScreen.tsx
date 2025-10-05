// screens/LeaderboardScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Button, ActivityIndicator } from 'react-native';
import { Client, Session } from '@heroiclabs/nakama-js';
import { LeaderboardRecord } from '@heroiclabs/nakama-js';
import { getStoredSession } from './nakamaHelpers';

const SERVER_KEY = 'defaultkey';
const HOST = '192.168.0.105';
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
      console.log('Fetching leaderboard...');
      
      if (session) {
        // Fetch leaderboard records
        const result = await client.listLeaderboardRecords(
          session, 
          "tictactoe_leaderboard",
          undefined, // ownerIds
          100        // limit
        );
        
        console.log('Leaderboard result:', result.records?.length || 0, 'records');
        console.log('Raw records:', result.records);

        // Fetch usernames for each record using Users API
        const recordsWithUsernames = await Promise.all(
          (result.records || []).map(async (record) => {
            // Check if username is already in the record
            if (record.username) {
              console.log('Record already has username:', record.username);
              return record;
            }
            
            try {
              // Fetch user info by their ID
              const users = await client.getUsers(session, [record?.owner_id ?? '']);
              if (users.users && users.users.length > 0) {
                record.username = users.users[0].username;
                console.log('Fetched username for', record.owner_id, ':', record.username);
              }
            } catch (fetchError) {
              console.warn('Failed to fetch username for', record.owner_id, fetchError);
              record.username = record.owner_id?.slice(0, 8) + '...';
            }
            return record;
          })
        );

        setRecords(recordsWithUsernames);
      }
    } catch (error) {
      console.error('Leaderboard load failed', error);
    }
    setLoading(false);
  };

  const renderRecord = ({ item, index }: { item: LeaderboardRecord; index: number }) => (
    <View style={styles.record}>
      <Text style={styles.rank}>#{item.rank || index + 1}</Text>
      <Text style={styles.username}>{item.username || 'Unknown'}</Text>
      <View style={styles.scoreContainer}>
        <Text style={styles.score}>{item.score} pts</Text>
        <Text style={styles.subscore}>{item.subscore} wins</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏆 Leaderboard</Text>
      
      {records.length === 0 ? (
        <Text style={styles.empty}>No records yet. Play some games!</Text>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item, index) => item.owner_id || index.toString()}
          renderItem={renderRecord}
          style={styles.list}
        />
      )}
      
      <View style={styles.buttonContainer}>
        <Button title="Refresh" onPress={loadLeaderboard} />
        <View style={{ height: 10 }} />
        <Button title="Back to Lobby" onPress={() => navigation.navigate('Lobby')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  empty: {
    textAlign: 'center',
    color: 'gray',
    marginTop: 40,
    fontSize: 16,
  },
  list: {
    flex: 1,
  },
  record: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
    marginBottom: 8,
    borderRadius: 8,
  },
  rank: {
    fontWeight: 'bold',
    width: 50,
    fontSize: 18,
    color: '#333',
  },
  username: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  score: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  subscore: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  buttonContainer: {
    marginTop: 10,
  },
});
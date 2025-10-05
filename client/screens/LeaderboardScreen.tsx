// screens/LeaderboardScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
    setLoading(true);
    try {
      const session: Session | null = await getStoredSession();
      console.log('Fetching leaderboard...');
      
      if (session) {
        const result = await client.listLeaderboardRecords(
          session, 
          "tictactoe_leaderboard",
          undefined,
          100
        );
        
        console.log('Leaderboard result:', result.records?.length || 0, 'records');

        const recordsWithUsernames = await Promise.all(
          (result.records || []).map(async (record) => {
            if (record.username) {
              return record;
            }

            console.log('record: ', record);
            
            try {
              const users = await client.getUsers(session, [record?.owner_id ?? '']);
              if (users.users && users.users.length > 0) {
                record.username = users.users[0].username;
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

  const getRankStyle = (rank: number) => {
    if (rank === 1) return styles.rankGold;
    if (rank === 2) return styles.rankSilver;
    if (rank === 3) return styles.rankBronze;
    return styles.rankDefault;
  };

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const renderRecord = ({ item, index }: { item: LeaderboardRecord; index: number }) => {
    const rank = item.rank || index + 1;
    return (
      <View style={[styles.record, rank <= 3 && styles.recordHighlight]}>
        <View style={[styles.rankBadge, getRankStyle(rank)]}>
          <Text style={styles.rankText}>{getRankEmoji(rank)}</Text>
        </View>
        
        <View style={styles.playerInfo}>
          <Text style={styles.username}>{item.username || 'Unknown'}</Text>
          <View style={styles.statsRow}>
            <Text style={styles.statLabel}>{item.subscore} wins</Text>
            <Text style={styles.statSeparator}>•</Text>
            <Text style={styles.statLabel}>{item.metadata?.losses || 0} losses</Text>
          </View>
        </View>
        
        <View style={styles.scoreContainer}>
          <Text style={styles.score}>{item.score}</Text>
          <Text style={styles.scoreLabel}>pts</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Leaderboard</Text>
          <Text style={styles.subtitle}>Top Players</Text>
        </View>

        <View style={styles.listContainer}>
          {records.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No players yet</Text>
              <Text style={styles.emptySubtext}>Be the first to play!</Text>
            </View>
          ) : (
            <FlatList
              data={records}
              keyExtractor={(item, index) => item.owner_id || index.toString()}
              renderItem={renderRecord}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={loadLeaderboard}>
            <Text style={styles.buttonText}>Refresh</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => navigation.navigate('Lobby')}
          >
            <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Back to Lobby</Text>
          </TouchableOpacity>
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
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 15,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 5,
  },
  listContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 15,
  },
  listContent: {
    paddingBottom: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  record: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recordHighlight: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  rankBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  rankGold: {
    backgroundColor: '#FFD700',
  },
  rankSilver: {
    backgroundColor: '#C0C0C0',
  },
  rankBronze: {
    backgroundColor: '#CD7F32',
  },
  rankDefault: {
    backgroundColor: '#e0e0e0',
  },
  rankText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  playerInfo: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statSeparator: {
    marginHorizontal: 6,
    color: '#ccc',
  },
  scoreContainer: {
    alignItems: 'center',
  },
  score: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#667eea',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  buttonContainer: {
    marginTop: 15,
    gap: 10,
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonSecondary: {
    backgroundColor: '#fff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#667eea',
  },
});
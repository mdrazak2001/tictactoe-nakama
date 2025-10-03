import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  Auth: undefined;
  Lobby: undefined;
  Game: undefined;
  Leaderboard: undefined;
};

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Auth'>;
};

export default function LobbyScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lobby - Auth Success!</Text>
      <Text>Matchmaking coming soon...</Text>
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
});
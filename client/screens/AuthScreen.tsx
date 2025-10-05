// screens/AuthScreen.tsx
import React, { useState } from 'react';
import { View, Text, Button, Alert, StyleSheet, TextInput } from 'react-native';
import { Client, Session } from '@heroiclabs/nakama-js';
import * as Device from 'expo-device';
import { v4 as uuidv4 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';

const NAKAMA_HOST = '192.168.0.105';
const NAKAMA_PORT = '7350';
const NAKAMA_HTTP_KEY = 'defaultkey';

const client = new Client(NAKAMA_HTTP_KEY, NAKAMA_HOST, NAKAMA_PORT, false);

type RootStackParamList = {
  Auth: undefined;
  Lobby: undefined;
  Game: { matchId: string };
  Leaderboard: undefined;
};

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Auth'>;
};

export default function AuthScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');

  const authenticate = async () => {
    if (!username.trim()) {
      Alert.alert('Username Required', 'Please enter a username');
      return;
    }

    setLoading(true);
    try {
      let rawId = Device.osBuildId ?? Device.modelName ?? uuidv4();
      const deviceId = String(rawId).replace(/[^\w-]/g, '_').slice(0, 128);

      console.log('Raw Device ID:', rawId, '-> sanitized:', deviceId);

      // Authenticate and set username
      console.log('Authenticating with deviceId:', deviceId, 'username:', username.trim());
      const session: Session = await client.authenticateDevice(deviceId, true, username.trim());

      // Always update the username in case account already existed
      try {
        await client.updateAccount(session, { username: username.trim() });
        console.log('Username updated to:', username.trim());
      } catch (updateError) {
        console.warn('Failed to update username:', updateError);
      }


      console.log('Authenticated with userId:', session.user_id);
      console.log('Username:', session.username);
      console.log('Session token:', session.token);

      await AsyncStorage.setItem('session_full', JSON.stringify(session));

      navigation.navigate('Lobby');
    } catch (error: any) {
      Alert.alert('Auth Failed', error?.message ?? JSON.stringify(error) ?? 'Unknown error');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tic-Tac-Toe Multiplayer</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Enter your username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        maxLength={20}
      />
      
      <Button 
        title={loading ? "Authenticating..." : "Login"} 
        onPress={authenticate} 
        disabled={loading} 
      />
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
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
  },
});
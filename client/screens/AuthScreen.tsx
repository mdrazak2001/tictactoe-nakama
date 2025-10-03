// screens/AuthScreen.tsx - Device Authentication (Fixed: Client constructor, method name, prop typing)
import React, { useState } from 'react';
import { View, Text, Button, Alert, StyleSheet } from 'react-native';
import { Client, Session } from '@heroiclabs/nakama-js';
import * as Device from 'expo-device';
import { v4 as uuidv4 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';

const NAKAMA_HOST = '192.168.0.105';  // Update to deployed URL later
const NAKAMA_PORT = '7350';
const NAKAMA_HTTP_KEY = 'defaultkey';

// const client = new Client(`http://${NAKAMA_HOST}:${NAKAMA_PORT}`, NAKAMA_HTTP_KEY, false, NAKAMA_PORT);  // Fixed: useSSL (false), httpPort (NAKAMA_PORT)
const client = new Client(NAKAMA_HTTP_KEY, NAKAMA_HOST, NAKAMA_PORT, false);

type RootStackParamList = {
  Auth: undefined;
  Lobby: undefined;
  Game: undefined;
  Leaderboard: undefined;
};

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Auth'>;
};

export default function AuthScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false);

  const authenticate = async () => {
    setLoading(true);
    try {

      const deviceId = Device.osBuildId || uuidv4();  // Use device ID or generate UUID
      const session: Session = await client.authenticateDevice(deviceId);  // Fixed: Use authenticateDevice (async Promise)
    //   console.log('Authenticated with userId:', session.user_id);
    //   console.log('Session token:', session.token);

      await AsyncStorage.setItem('session', JSON.stringify({
        token: session.token,
        userId: session.user_id,
        expiry: session.expires_at,
      }));
      navigation.navigate('Lobby');
    } catch (error: any) {
      Alert.alert('Auth Failed', error?.message ?? JSON.stringify(error) ?? 'Unknown error');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tic-Tac-Toe Multiplayer</Text>
      <Text>Authenticate with Device</Text>
      <Button title={loading ? "Authenticating..." : "Login"} onPress={authenticate} disabled={loading} />
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
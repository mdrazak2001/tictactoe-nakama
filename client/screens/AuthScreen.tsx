// screens/AuthScreen.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
      console.log('Authenticating with deviceId:', deviceId, 'username:', username.trim());
      
      const session: Session = await client.authenticateDevice(deviceId, true, username.trim());

      try {
        await client.updateAccount(session, { username: username.trim() });
        console.log('Username updated to:', username.trim());
      } catch (updateError) {
        console.warn('Failed to update username:', updateError);
      }

      console.log('Authenticated with userId:', session.user_id);
      console.log('Username:', session.username);

      await AsyncStorage.setItem('session_full', JSON.stringify(session));

      navigation.navigate('Lobby');
    } catch (error: any) {
      Alert.alert('Auth Failed', error?.message ?? JSON.stringify(error) ?? 'Unknown error');
    }
    setLoading(false);
  };

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>X O</Text>
            <Text style={styles.title}>Tic-Tac-Toe</Text>
            <Text style={styles.subtitle}>Multiplayer Challenge</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.welcomeText}>Choose your username</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Enter username"
              placeholderTextColor="#999"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              maxLength={20}
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={authenticate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.buttonText}>Start Playing</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>Ready to challenge players worldwide?</Text>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logo: {
    fontSize: 80,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
    letterSpacing: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 5,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 15,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  button: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 30,
    textAlign: 'center',
  },
});
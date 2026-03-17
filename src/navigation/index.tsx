import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { Colors } from '../constants/colors';
import { setApiToken, getMe } from '../services/api';
import { wsManager } from '../services/ws';
import { useAuthStore } from '../store/authStore';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';

export function RootNavigator() {
  const { isAuthenticated, setAuth, logout } = useAuthStore();
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      try {
        const token = await SecureStore.getItemAsync('auth_token');
        if (token) {
          setApiToken(token);
          // Validate token by fetching the current user
          const user = await getMe();
          setAuth(token, user);
          wsManager.connect(token);
        }
      } catch {
        // Token invalid or expired — clear it
        await SecureStore.deleteItemAsync('auth_token');
        setApiToken(null);
        logout();
      } finally {
        setBootstrapping(false);
      }
    }

    bootstrap();
  }, [setAuth, logout]);

  if (bootstrapping) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: Colors.accent,
          background: Colors.bg,
          card: Colors.bgCard,
          text: Colors.text,
          border: Colors.border,
          notification: Colors.orange,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '900' },
        },
      }}
    >
      {isAuthenticated ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

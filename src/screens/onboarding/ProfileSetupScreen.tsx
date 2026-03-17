import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';
import { Colors } from '../../constants/colors';
import { updateMe } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from '../../components/Avatar';

type Props = NativeStackScreenProps<AuthStackParamList, 'ProfileSetup'>;

export function ProfileSetupScreen({ navigation }: Props) {
  const setUser = useAuthStore((s) => s.setUser);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    const name = displayName.trim();
    if (!name) {
      Alert.alert('Required', 'Please enter your name.');
      return;
    }
    setLoading(true);
    try {
      const updatedUser = await updateMe(name);
      setUser(updatedUser);
      navigation.navigate('BotChoice');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save name';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>What should we call you?</Text>
            <Text style={styles.subtitle}>
              This name will be visible to your contacts
            </Text>
          </View>

          <View style={styles.avatarContainer}>
            <Avatar
              name={displayName.trim() || '?'}
              size={80}
            />
            {displayName.trim() ? (
              <Text style={styles.avatarLabel}>{displayName.trim()}</Text>
            ) : null}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={Colors.textMuted}
            value={displayName}
            onChangeText={setDisplayName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleContinue}
            maxLength={50}
          />

          <TouchableOpacity
            style={[styles.button, (loading || !displayName.trim()) && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={loading || !displayName.trim()}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.bg} />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  flex: {
    flex: 1,
  },
  inner: {
    padding: 28,
    paddingTop: 48,
    flexGrow: 1,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textMuted,
    lineHeight: 22,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 32,
    gap: 12,
  },
  avatarLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  input: {
    height: 54,
    borderRadius: 12,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    fontSize: 17,
    color: Colors.text,
    marginBottom: 24,
  },
  button: {
    backgroundColor: Colors.accent,
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.bg,
    letterSpacing: 0.3,
  },
});

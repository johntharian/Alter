import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../../types';
import { Colors } from '../../constants/colors';
import { setBotInstructions, setLLMPreference, setLLMApiKey } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

// Works in both onboarding and in-app contexts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyNavigation = any;

interface Capability {
  key: string;
  icon: string;
  name: string;
  description: string;
  enabled: boolean;
  locked?: boolean;
}

const INITIAL_CAPABILITIES: Capability[] = [
  {
    key: 'reply',
    icon: '💬',
    name: 'Reply to messages',
    description: 'Automatically respond to incoming messages',
    enabled: true,
    locked: true,
  },
  {
    key: 'schedule',
    icon: '📅',
    name: 'Schedule meetings',
    description: 'Help schedule and manage calendar events',
    enabled: false,
  },
  {
    key: 'email',
    icon: '✉️',
    name: 'Send emails',
    description: 'Draft and send emails on your behalf',
    enabled: false,
  },
  {
    key: 'search',
    icon: '🔍',
    name: 'Search the web',
    description: 'Search the internet for up-to-date information',
    enabled: false,
  },
];

interface LLMProvider {
  id: string;
  label: string;
  sub: string;
  icon: string;
}

const PROVIDERS: LLMProvider[] = [
  { id: 'gemini', label: 'Gemini',  sub: 'Google',        icon: '✦' },
  { id: 'claude', label: 'Claude',  sub: 'Anthropic',     icon: '◆' },
  { id: 'gpt4o',  label: 'GPT-4o', sub: 'OpenAI',        icon: '⬡' },
  { id: 'custom', label: 'Custom',  sub: 'Bring your own', icon: '⌥' },
];

export function BotCapabilitiesScreen() {
  const navigation = useNavigation<AnyNavigation>();
  const route = useRoute<RouteProp<AuthStackParamList, 'BotCapabilities'>>();
  const user = useAuthStore((s) => s.user);
  const [capabilities, setCapabilities] = useState<Capability[]>(INITIAL_CAPABILITIES);
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLLM, setSelectedLLM] = useState<string>('gemini');
  const [customModelId, setCustomModelId] = useState('');
  const [apiKey, setApiKey] = useState('');

  const toggleCapability = (key: string) => {
    setCapabilities((prev) =>
      prev.map((c) =>
        c.key === key && !c.locked ? { ...c, enabled: !c.enabled } : c
      )
    );
  };

  const handleDone = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (instructions.trim()) {
        await setBotInstructions(user.id, instructions.trim());
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      Alert.alert('Error', message);
      setLoading(false);
      return;
    }
    setLoading(false);
    if (route.params?.onboarding) {
      // Onboarding complete — flip isAuthenticated so RootNavigator shows MainTabs
      useAuthStore.getState().completeOnboarding();
    } else {
      // In-app context (from Settings): just go back
      navigation.goBack();
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
            <Text style={styles.title}>What can your bot do?</Text>
            <Text style={styles.subtitle}>
              Toggle the capabilities your bot should have
            </Text>
          </View>

          <View style={styles.capabilitiesList}>
            {capabilities.map((cap, i) => (
              <View
                key={cap.key}
                style={[
                  styles.capabilityRow,
                  i < capabilities.length - 1 && styles.capabilityRowBorder,
                ]}
              >
                <Text style={styles.capabilityIcon}>{cap.icon}</Text>
                <View style={styles.capabilityInfo}>
                  <Text style={styles.capabilityName}>{cap.name}</Text>
                  <Text style={styles.capabilityDesc}>{cap.description}</Text>
                </View>
                <Switch
                  value={cap.enabled}
                  onValueChange={() => toggleCapability(cap.key)}
                  disabled={cap.locked}
                  trackColor={{ false: Colors.border, true: Colors.accent }}
                  thumbColor={Colors.text}
                  ios_backgroundColor={Colors.border}
                />
              </View>
            ))}
          </View>

          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsLabel}>Special instructions (optional)</Text>
            <TextInput
              style={styles.instructionsInput}
              placeholder="e.g. Always respond in Spanish. Be brief and professional."
              placeholderTextColor={Colors.textMuted}
              value={instructions}
              onChangeText={setInstructions}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleDone}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.bg} />
            ) : (
              <Text style={styles.buttonText}>Done</Text>
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
    marginBottom: 28,
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
  capabilitiesList: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
    overflow: 'hidden',
  },
  capabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  capabilityRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  capabilityIcon: {
    fontSize: 22,
  },
  capabilityInfo: {
    flex: 1,
  },
  capabilityName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  capabilityDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
  },
  instructionsContainer: {
    marginBottom: 28,
  },
  instructionsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  instructionsInput: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: Colors.text,
    minHeight: 120,
    lineHeight: 22,
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

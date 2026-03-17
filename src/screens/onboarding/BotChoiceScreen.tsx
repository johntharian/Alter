import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '../../types';
import { Colors } from '../../constants/colors';
import { updateMyBot, provisionManagedBot } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

type Props = NativeStackScreenProps<AuthStackParamList, 'BotChoice'>;

type BotType = 'own' | 'managed' | null;

export function BotChoiceScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const [selected, setSelected] = useState<BotType>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!selected) {
      Alert.alert('Choose a bot type', 'Please select how you want to set up your bot.');
      return;
    }
    if (!user) return;

    setLoading(true);
    try {
      if (selected === 'own') {
        const url = webhookUrl.trim();
        if (!url) {
          Alert.alert('Webhook URL Required', 'Please enter your bot webhook URL.');
          setLoading(false);
          return;
        }
        await updateMyBot(url);
        // Own bot skips capabilities screen — onboarding complete, flip to MainTabs
        useAuthStore.getState().completeOnboarding();
      } else {
        // Managed bot: show capabilities setup
        await provisionManagedBot();
        navigation.navigate('BotCapabilities', { onboarding: true });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Setup failed';
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
            <Text style={styles.title}>Set up your bot</Text>
            <Text style={styles.subtitle}>
              Choose how you want to configure your personal AI bot
            </Text>
          </View>

          {/* Card: Managed bot */}
          <TouchableOpacity
            style={[
              styles.card,
              selected === 'managed' && styles.cardSelected,
            ]}
            onPress={() => setSelected('managed')}
            activeOpacity={0.85}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardIconWrap}>
                <Text style={styles.cardIcon}>✨</Text>
              </View>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Use our managed bot</Text>
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>Recommended</Text>
                </View>
              </View>
            </View>
            <Text style={styles.cardDesc}>
              We host and manage your AI bot. Just configure its capabilities and instructions.
            </Text>
            {selected === 'managed' && (
              <View style={styles.selectedCheck}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.accent} />
              </View>
            )}
          </TouchableOpacity>

          {/* Card: Own bot */}
          <TouchableOpacity
            style={[
              styles.card,
              selected === 'own' && styles.cardSelected,
            ]}
            onPress={() => setSelected('own')}
            activeOpacity={0.85}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardIconWrap}>
                <Text style={styles.cardIcon}>🔗</Text>
              </View>
              <Text style={styles.cardTitle}>Bring your own bot</Text>
            </View>
            <Text style={styles.cardDesc}>
              Connect your own bot via a webhook URL. You control the logic and hosting.
            </Text>
            {selected === 'own' && (
              <>
                <TextInput
                  style={styles.urlInput}
                  placeholder="https://your-bot.com/webhook"
                  placeholderTextColor={Colors.textMuted}
                  value={webhookUrl}
                  onChangeText={setWebhookUrl}
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <View style={styles.selectedCheck}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.accent} />
                </View>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, (!selected || loading) && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!selected || loading}
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
  card: {
    backgroundColor: Colors.bgCard,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    position: 'relative',
  },
  cardSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentDim,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.bgCardHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: {
    fontSize: 20,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  recommendedBadge: {
    backgroundColor: Colors.accentDim,
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  recommendedText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.accent,
  },
  cardDesc: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
  },
  urlInput: {
    marginTop: 14,
    height: 48,
    borderRadius: 10,
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    fontSize: 14,
    color: Colors.text,
  },
  selectedCheck: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  button: {
    marginTop: 8,
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

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import { AuthStackParamList } from '../../types';
import { Colors } from '../../constants/colors';
import { verifyOTP, requestOTP, setApiToken } from '../../services/api';
import { wsManager } from '../../services/ws';
import { useAuthStore } from '../../store/authStore';

type Props = NativeStackScreenProps<AuthStackParamList, 'OTPVerify'>;

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export function OTPVerifyScreen({ navigation, route }: Props) {
  const { phone_number } = route.params;
  const setPendingAuth = useAuthStore((s) => s.setPendingAuth);

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const inputRefs = useRef<Array<TextInput | null>>(Array(OTP_LENGTH).fill(null));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    startCountdown();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCountdown = () => {
    setCountdown(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    try {
      await requestOTP(phone_number);
      startCountdown();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resend';
      Alert.alert('Error', message);
    }
  };

  const handleVerify = useCallback(
    async (code: string) => {
      if (code.length !== OTP_LENGTH) return;
      setLoading(true);
      try {
        const { token, user } = await verifyOTP(phone_number, code);
        // Persist token
        await SecureStore.setItemAsync('auth_token', token);
        // Set API token
        setApiToken(token);
        // Store credentials without flipping isAuthenticated yet.
        // isAuthenticated stays false until onboarding completes (BotCapabilitiesScreen
        // or BotChoiceScreen calls completeOnboarding()), keeping the root navigator
        // on AuthStack so the onboarding flow can finish.
        setPendingAuth(token, user);
        // Connect WebSocket early so onboarding API calls work
        wsManager.connect(token);
        // Route: new users need onboarding, returning users go straight to main app
        if (!user.display_name) {
          navigation.navigate('ProfileSetup');
        } else {
          // Returning user — onboarding already done, go straight to MainTabs
          useAuthStore.getState().completeOnboarding();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Verification failed';
        Alert.alert('Invalid Code', message);
        // Clear digits
        setDigits(Array(OTP_LENGTH).fill(''));
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } finally {
        setLoading(false);
      }
    },
    [phone_number, setPendingAuth, navigation]
  );

  const handleDigitChange = (text: string, index: number) => {
    const char = text.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);

    if (char && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const code = newDigits.join('');
    if (code.length === OTP_LENGTH && !newDigits.includes('')) {
      handleVerify(code);
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      const newDigits = [...digits];
      newDigits[index - 1] = '';
      setDigits(newDigits);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const displayPhone = phone_number;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.inner}>
          <View style={styles.header}>
            <Text style={styles.title}>Verify your number</Text>
            <Text style={styles.subtitle}>Code sent to {displayPhone}</Text>
          </View>

          <View style={styles.digitRow}>
            {digits.map((digit, i) => (
              <TextInput
                key={i}
                ref={(ref) => { inputRefs.current[i] = ref; }}
                style={[
                  styles.digitInput,
                  digit ? styles.digitInputFilled : null,
                ]}
                value={digit}
                onChangeText={(text) => handleDigitChange(text, i)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                keyboardType="number-pad"
                maxLength={2}
                autoFocus={i === 0}
                selectTextOnFocus
                caretHidden
              />
            ))}
          </View>

          <View style={styles.resendRow}>
            {countdown > 0 ? (
              <Text style={styles.countdownText}>
                Resend in{' '}
                <Text style={styles.countdownNumber}>{countdown}s</Text>
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendLink}>Resend code</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              (loading || digits.includes('')) && styles.buttonDisabled,
            ]}
            onPress={() => handleVerify(digits.join(''))}
            disabled={loading || digits.includes('')}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.bg} />
            ) : (
              <Text style={styles.buttonText}>Verify</Text>
            )}
          </TouchableOpacity>
        </View>
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
    flex: 1,
    padding: 28,
    paddingTop: 48,
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
  digitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
    gap: 10,
  },
  digitInput: {
    flex: 1,
    height: 58,
    borderRadius: 12,
    backgroundColor: Colors.bgCard,
    borderWidth: 2,
    borderColor: Colors.border,
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  digitInputFilled: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentDim,
  },
  resendRow: {
    alignItems: 'center',
    marginBottom: 32,
  },
  countdownText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  countdownNumber: {
    color: Colors.text,
    fontWeight: '600',
  },
  resendLink: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '600',
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

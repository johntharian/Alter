import React, { useState, useRef } from 'react';
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
import { requestOTP } from '../../services/api';

type Props = NativeStackScreenProps<AuthStackParamList, 'PhoneEntry'>;

export function PhoneEntryScreen({ navigation }: Props) {
  const [countryCode, setCountryCode] = useState('+1');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingCountryCode, setEditingCountryCode] = useState(false);
  const phoneInputRef = useRef<TextInput>(null);

  const fullPhone = `${countryCode}${phoneNumber}`;

  const handleSend = async () => {
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length < 7) {
      Alert.alert('Invalid Number', 'Please enter a valid phone number.');
      return;
    }

    setLoading(true);
    try {
      await requestOTP(fullPhone);
      navigation.navigate('OTPVerify', { phone_number: fullPhone });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send code';
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
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Enter your number</Text>
            <Text style={styles.subtitle}>
              We'll send you a 6-digit code to verify
            </Text>
          </View>

          <View style={styles.inputRow}>
            {editingCountryCode ? (
              <TextInput
                style={[styles.countryInput, styles.countryInputEditing]}
                value={countryCode}
                onChangeText={(t) => {
                  // Keep + prefix
                  const cleaned = t.startsWith('+') ? t : '+' + t.replace(/\D/g, '');
                  setCountryCode(cleaned);
                }}
                keyboardType="phone-pad"
                autoFocus
                onBlur={() => setEditingCountryCode(false)}
                maxLength={5}
                returnKeyType="done"
                onSubmitEditing={() => {
                  setEditingCountryCode(false);
                  phoneInputRef.current?.focus();
                }}
              />
            ) : (
              <TouchableOpacity
                style={styles.countryInput}
                onPress={() => setEditingCountryCode(true)}
              >
                <Text style={styles.countryCodeText}>{countryCode}</Text>
              </TouchableOpacity>
            )}
            <TextInput
              ref={phoneInputRef}
              style={styles.phoneInput}
              placeholder="Phone number"
              placeholderTextColor={Colors.textMuted}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoFocus={!editingCountryCode}
              maxLength={15}
              returnKeyType="done"
              onSubmitEditing={handleSend}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSend}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.bg} />
            ) : (
              <Text style={styles.buttonText}>Send Code</Text>
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
    marginBottom: 36,
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 10,
  },
  countryInput: {
    height: 54,
    width: 68,
    borderRadius: 12,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  countryInputEditing: {
    borderColor: Colors.accent,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  phoneInput: {
    flex: 1,
    height: 54,
    borderRadius: 12,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    fontSize: 17,
    color: Colors.text,
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
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.bg,
    letterSpacing: 0.3,
  },
});

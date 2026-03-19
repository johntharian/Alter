import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { Colors } from '../../constants/colors';
import { BotConfig } from '../../types';
import { getMyBot, setApiToken, getLLMPreference, setLLMPreference, setLLMApiKey } from '../../services/api';
import { wsManager } from '../../services/ws';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from '../../components/Avatar';

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuthStore();
  const [botConfig, setBotConfig] = useState<BotConfig | null>(null);
  const [loadingBot, setLoadingBot] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [preferredLlm, setPreferredLlm] = useState<string>('gemini');
  const [apiKeysSet, setApiKeysSet] = useState<Record<string, boolean>>({});
  const [savingLlm, setSavingLlm] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savingKey, setSavingKey] = useState(false);

  const loadBot = useCallback(async () => {
    setLoadingBot(true);
    try {
      const config = await getMyBot();
      setBotConfig(config);
    } catch {
      // Bot might not be configured yet
    } finally {
      setLoadingBot(false);
    }
  }, []);

  const loadLlmPref = useCallback(async () => {
    if (!user?.id) return;
    try {
      const pref = await getLLMPreference(user.id);
      setPreferredLlm(pref.preferred_llm);
      setApiKeysSet(pref.api_keys_set);
    } catch { /* default stays gemini */ }
  }, [user?.id]);

  useEffect(() => {
    loadBot();
    loadLlmPref();
  }, [loadBot, loadLlmPref]);

  const handleLlmChange = async (llm: string) => {
    if (!user?.id || savingLlm) return;
    setSavingLlm(true);
    try {
      await setLLMPreference(user.id, llm);
      setPreferredLlm(llm);
      setApiKeyInput('');
    } catch {
      Alert.alert('Error', 'Failed to update AI model.');
    } finally { setSavingLlm(false); }
  };

  const handleSaveApiKey = async () => {
    if (!user?.id || !apiKeyInput.trim()) return;
    setSavingKey(true);
    try {
      await setLLMApiKey(user.id, preferredLlm, apiKeyInput.trim());
      setApiKeysSet(prev => ({ ...prev, [preferredLlm]: true }));
      setApiKeyInput('');
      Alert.alert('Saved', 'API key saved.');
    } catch {
      Alert.alert('Error', 'Failed to save API key.');
    } finally { setSavingKey(false); }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await SecureStore.deleteItemAsync('auth_token');
          setApiToken(null);
          wsManager.disconnect();
          logout();
        },
      },
    ]);
  };

  const isManagedBot = botConfig
    ? botConfig.url.includes('managed') || botConfig.url === ''
    : false;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* User Section */}
        <View style={styles.userSection}>
          <Avatar name={user?.display_name || user?.phone_number || '?'} size={72} />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user?.display_name || 'No name set'}
            </Text>
            <Text style={styles.userPhone}>{user?.phone_number}</Text>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Bot Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Bot</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="hardware-chip-outline" size={18} color={Colors.textMuted} style={styles.rowIcon} />
              <Text style={styles.rowLabel}>Bot type</Text>
              <View style={styles.rowRight}>
                {loadingBot ? (
                  <ActivityIndicator size="small" color={Colors.textMuted} />
                ) : (
                  <Text style={styles.rowValue}>
                    {botConfig ? (isManagedBot ? 'Managed' : 'Custom') : 'Not configured'}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.rowDivider} />
            <View style={styles.row}>
              <Ionicons name="sparkles-outline" size={18} color={Colors.textMuted} style={styles.rowIcon} />
              <Text style={styles.rowLabel}>AI Model</Text>
              {savingLlm ? <ActivityIndicator size="small" color={Colors.textMuted} /> : (
                <View style={styles.modelPicker}>
                  {(['gemini', 'claude'] as const).map((llm) => (
                    <TouchableOpacity key={llm}
                      style={[styles.modelOption, preferredLlm === llm && styles.modelOptionActive]}
                      onPress={() => handleLlmChange(llm)}>
                      <Text style={[styles.modelOptionText, preferredLlm === llm && styles.modelOptionTextActive]}>
                        {llm === 'gemini' ? 'Gemini' : 'Claude'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.rowDivider} />
            <View style={styles.row}>
              <Ionicons name="key-outline" size={18} color={Colors.textMuted} style={styles.rowIcon} />
              <TextInput
                style={styles.apiKeyInput}
                placeholder={apiKeysSet[preferredLlm] ? '••••••••  (tap to update)' : 'Paste API key...'}
                placeholderTextColor={Colors.textMuted}
                value={apiKeyInput}
                onChangeText={setApiKeyInput}
                secureTextEntry
                autoCapitalize="none"
              />
              {apiKeyInput.trim() ? (
                <TouchableOpacity onPress={handleSaveApiKey} disabled={savingKey}>
                  {savingKey
                    ? <ActivityIndicator size="small" color={Colors.accent} />
                    : <Text style={styles.saveKeyText}>Save</Text>}
                </TouchableOpacity>
              ) : null}
            </View>

            {botConfig && !isManagedBot && (
              <>
                <View style={styles.rowDivider} />
                <View style={styles.row}>
                  <Ionicons name="link-outline" size={18} color={Colors.textMuted} style={styles.rowIcon} />
                  <Text style={styles.rowLabel}>Webhook URL</Text>
                  <View style={styles.rowRight}>
                    <Text style={styles.rowValueSmall} numberOfLines={1}>
                      {botConfig.url}
                    </Text>
                  </View>
                </View>
              </>
            )}

            <View style={styles.rowDivider} />
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate('BotCapabilitiesMain')}
            >
              <Ionicons name="flash-outline" size={18} color={Colors.textMuted} style={styles.rowIcon} />
              <Text style={styles.rowLabel}>Capabilities</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.rowDivider} />
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate('BotInstructions')}
            >
              <Ionicons name="document-text-outline" size={18} color={Colors.textMuted} style={styles.rowIcon} />
              <Text style={styles.rowLabel}>Instructions</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>App</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="notifications-outline" size={18} color={Colors.textMuted} style={styles.rowIcon} />
              <Text style={styles.rowLabel}>Notifications</Text>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: Colors.border, true: Colors.accent }}
                thumbColor={Colors.text}
                ios_backgroundColor={Colors.border}
              />
            </View>
          </View>
        </View>

        {/* Danger Section */}
        <View style={styles.section}>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color={Colors.red} style={styles.rowIcon} />
              <Text style={[styles.rowLabel, styles.dangerText]}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.version}>Alter v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 24,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    gap: 16,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 3,
  },
  userPhone: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.bgCardHover,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  rowIcon: {
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  rowRight: {
    flexShrink: 1,
    maxWidth: 160,
  },
  rowValue: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'right',
  },
  rowValueSmall: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'right',
  },
  rowDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 46,
  },
  dangerText: {
    color: Colors.red,
  },
  modelPicker: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modelOption: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: Colors.bgCard,
  },
  modelOptionActive: {
    backgroundColor: Colors.accent,
  },
  modelOptionText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  modelOptionTextActive: {
    color: Colors.text,
  },
  apiKeyInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    marginRight: 8,
  },
  saveKeyText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.accent,
  },
  version: {
    fontSize: 12,
    color: Colors.textDim,
    textAlign: 'center',
    paddingTop: 8,
  },
});

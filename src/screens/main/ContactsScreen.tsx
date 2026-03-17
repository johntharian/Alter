import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ExpoContacts from 'expo-contacts';
import { Colors } from '../../constants/colors';
import { ContactInfo, ChatsStackParamList } from '../../types';
import { syncContacts, getContacts, getThreads } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useThreadStore } from '../../store/threadStore';
import { Avatar } from '../../components/Avatar';

type Props = NativeStackScreenProps<ChatsStackParamList, 'Contacts'>;

export function ContactsScreen({ navigation }: Props) {
  const currentUser = useAuthStore((s) => s.user);
  const { threads, setThreads } = useThreadStore();
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getContacts();
      setContacts(list);
    } catch {
      // Might be empty — that's fine
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleSync = async () => {
    const { status } = await ExpoContacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your contacts in Settings.'
      );
      return;
    }

    setSyncing(true);
    try {
      const { data } = await ExpoContacts.getContactsAsync({
        fields: [ExpoContacts.Fields.PhoneNumbers],
      });

      const phoneNumbers: string[] = [];
      data.forEach((contact) => {
        contact.phoneNumbers?.forEach((p) => {
          if (p.number) {
            // Normalize: keep digits and leading +
            const normalized = p.number.replace(/[\s\-().]/g, '');
            if (normalized) phoneNumbers.push(normalized);
          }
        });
      });

      if (phoneNumbers.length === 0) {
        Alert.alert('No Contacts', 'No phone numbers found in your contacts.');
        return;
      }

      const { found } = await syncContacts(phoneNumbers);
      setContacts(found);
      if (found.length > 0) {
        navigation.goBack();
      } else {
        Alert.alert('No Matches', 'None of your contacts are on Alter yet');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      Alert.alert('Error', message);
    } finally {
      setSyncing(false);
    }
  };

  const findOrNavigateThread = async (contact: ContactInfo) => {
    // Find existing thread
    const existing = threads.find(
      (t) =>
        (t.participant_a === currentUser?.id && t.participant_b === contact.user_id) ||
        (t.participant_b === currentUser?.id && t.participant_a === contact.user_id)
    );

    if (existing) {
      navigation.navigate('ChatView', {
        threadId: existing.id,
        contactName: contact.display_name || contact.phone_number,
        contactPhone: contact.phone_number,
      });
      return;
    }

    // Refresh threads then try again
    try {
      const fresh = await getThreads();
      setThreads(fresh);
      const found = fresh.find(
        (t) =>
          (t.participant_a === currentUser?.id && t.participant_b === contact.user_id) ||
          (t.participant_b === currentUser?.id && t.participant_a === contact.user_id)
      );
      if (found) {
        navigation.navigate('ChatView', {
          threadId: found.id,
          contactName: contact.display_name || contact.phone_number,
          contactPhone: contact.phone_number,
        });
      } else {
        // No thread yet; navigate anyway — sending a message will create it
        navigation.navigate('ChatView', {
          threadId: '',
          contactName: contact.display_name || contact.phone_number,
          contactPhone: contact.phone_number,
        });
      }
    } catch {
      navigation.navigate('ChatView', {
        threadId: '',
        contactName: contact.display_name || contact.phone_number,
        contactPhone: contact.phone_number,
      });
    }
  };

  const renderContact = ({ item }: { item: ContactInfo }) => (
    <TouchableOpacity
      style={styles.contactRow}
      onPress={() => findOrNavigateThread(item)}
      activeOpacity={0.7}
    >
      <Avatar name={item.display_name || item.phone_number} size={44} style={styles.avatar} />
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>
          {item.display_name || item.phone_number}
        </Text>
        <Text style={styles.contactPhone}>{item.phone_number}</Text>
      </View>
      <Ionicons name="chatbubble-ellipses" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Contacts</Text>
        <TouchableOpacity
          style={styles.syncButton}
          onPress={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator size="small" color={Colors.accent} />
          ) : (
            <Ionicons name="sync" size={20} color={Colors.accent} />
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      ) : contacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.syncCard}>
            <Text style={styles.syncCardTitle}>Find people on Alter</Text>
            <Text style={styles.syncCardDesc}>
              Sync your contacts to discover friends already using Alter
            </Text>
            <TouchableOpacity
              style={[styles.syncCardButton, syncing && styles.syncCardButtonDisabled]}
              onPress={handleSync}
              disabled={syncing}
            >
              {syncing ? (
                <ActivityIndicator color={Colors.bg} />
              ) : (
                <Text style={styles.syncCardButtonText}>Sync Contacts</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.user_id}
          renderItem={renderContact}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <TouchableOpacity
              style={styles.syncRow}
              onPress={handleSync}
              disabled={syncing}
            >
              <Ionicons name="sync" size={16} color={Colors.accent} />
              <Text style={styles.syncRowText}>
                {syncing ? 'Syncing…' : 'Sync contacts again'}
              </Text>
            </TouchableOpacity>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  syncButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  syncCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    alignItems: 'center',
  },
  syncCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  syncCardDesc: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  syncCardButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  syncCardButtonDisabled: {
    opacity: 0.5,
  },
  syncCardButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.bg,
  },
  list: {
    flexGrow: 1,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  syncRowText: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '600',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  avatar: {},
  contactInfo: {
    flex: 1,
    minWidth: 0,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 13,
    color: Colors.textMuted,
  },
});

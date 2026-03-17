import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Thread, ContactInfo, FeedEvent, ChatsStackParamList } from '../../types';
import { getThreads, getContacts } from '../../services/api';
import { wsManager } from '../../services/ws';
import { useThreadStore } from '../../store/threadStore';
import { useAuthStore } from '../../store/authStore';
import { ThreadRow } from '../../components/ThreadRow';
import { EmptyState } from '../../components/EmptyState';

type NavProp = NativeStackNavigationProp<ChatsStackParamList, 'ChatsScreen'>;

export function ChatsScreen() {
  const navigation = useNavigation<NavProp>();
  const { threads, setThreads, moveToTop, updateTakeover } = useThreadStore();
  const currentUser = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const contactMap = useRef<Map<string, ContactInfo>>(new Map());

  const buildContactMap = (list: ContactInfo[]) => {
    const map = new Map<string, ContactInfo>();
    list.forEach((c) => map.set(c.user_id, c));
    contactMap.current = map;
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [threadList, contactList] = await Promise.all([
        getThreads(),
        getContacts(),
      ]);
      setThreads(threadList);
      buildContactMap(contactList);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }, [setThreads]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // WebSocket subscription
  useEffect(() => {
    const handler = (event: FeedEvent) => {
      if (event.type === 'new_message') {
        const msg = event.data as { thread_id?: string; [key: string]: unknown };
        if (msg.thread_id) {
          // Refresh threads to get updated last_message
          getThreads()
            .then((list) => setThreads(list))
            .catch(() => {});
          moveToTop(msg.thread_id);
        }
      } else if (event.type === 'takeover_started') {
        const d = event.data as { thread_id?: string; by_user_id?: string };
        if (d.thread_id) updateTakeover(d.thread_id, d.by_user_id);
      } else if (event.type === 'takeover_ended') {
        const d = event.data as { thread_id?: string };
        if (d.thread_id) updateTakeover(d.thread_id, undefined);
      }
    };
    wsManager.subscribe(handler);
    return () => wsManager.unsubscribe(handler);
  }, [setThreads, moveToTop, updateTakeover]);

  const getContactForThread = (thread: Thread): ContactInfo | null => {
    if (!currentUser) return null;
    const otherId =
      thread.participant_a === currentUser.id
        ? thread.participant_b
        : thread.participant_a;
    return contactMap.current.get(otherId) ?? null;
  };

  const getThreadName = (thread: Thread): string => {
    const contact = getContactForThread(thread);
    if (contact) return contact.display_name || contact.phone_number;
    if (!currentUser) return '';
    return thread.participant_a === currentUser.id
      ? thread.participant_b
      : thread.participant_a;
  };

  const filteredThreads = search.trim()
    ? threads.filter((t) => {
        const name = getThreadName(t).toLowerCase();
        return name.includes(search.trim().toLowerCase());
      })
    : threads;

  const navigateToChat = (thread: Thread) => {
    const contact = getContactForThread(thread);
    const name = getThreadName(thread);
    const phone =
      contact?.phone_number ??
      (currentUser
        ? thread.participant_a === currentUser.id
          ? thread.participant_b
          : thread.participant_a
        : '');
    navigation.navigate('ChatView', {
      threadId: thread.id,
      contactName: name,
      contactPhone: phone,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Chats</Text>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate('Contacts')}
        >
          <Ionicons name="person-add" size={22} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      ) : filteredThreads.length === 0 ? (
        <EmptyState
          icon="🤖"
          title="No conversations yet"
          subtitle="Start a conversation with your contacts"
          actionLabel="Find contacts →"
          onAction={() => navigation.navigate('Contacts')}
        />
      ) : (
        <FlatList
          data={filteredThreads}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ThreadRow
              thread={item}
              contact={getContactForThread(item)}
              currentUserId={currentUser?.id ?? ''}
              onPress={() => navigateToChat(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Contacts')}
        activeOpacity={0.85}
      >
        <Ionicons name="create" size={24} color={Colors.bg} />
      </TouchableOpacity>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchIcon: {
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    flexGrow: 1,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});

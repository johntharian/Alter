import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Message, FeedEvent, ContactInfo } from '../../types';
import { getThreads, getThreadMessages, sendMessage, getContacts } from '../../services/api';
import { wsManager } from '../../services/ws';
import { useAuthStore } from '../../store/authStore';
import { useMessageStore } from '../../store/messageStore';
import { useThreadStore } from '../../store/threadStore';
import { MessageBubble } from '../../components/MessageBubble';
import { QuickActionButton } from '../../components/QuickActionButton';
import { EmptyState } from '../../components/EmptyState';
import { Avatar } from '../../components/Avatar';

export function MyBotScreen() {
  const navigation = useNavigation<any>();
  const currentUser = useAuthStore((s) => s.user);
  const { messages, setMessages, addMessage, updateMessageStatus } = useMessageStore();
  const { threads, setThreads } = useThreadStore();

  const [botThreadId, setBotThreadId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [mentions, setMentions] = useState<Array<{ display_name: string; phone: string; user_id: string }>>([]);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');

  const flatListRef = useRef<FlatList>(null);
  const botMessages = botThreadId ? (messages[botThreadId] ?? []) : [];

  const findBotThread = useCallback(
    async (threadList: typeof threads) => {
      if (!currentUser) return null;
      // Bot thread: both participants are the current user (self-thread)
      // or one side is the user and the other is their own number
      const selfThread = threadList.find(
        (t) =>
          t.participant_a === currentUser.id &&
          t.participant_b === currentUser.id
      );
      return selfThread ?? null;
    },
    [currentUser]
  );

  const loadBotThread = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const threadList = await getThreads();
      setThreads(threadList);
      const selfThread = await findBotThread(threadList);
      if (selfThread) {
        setBotThreadId(selfThread.id);
        const msgs = await getThreadMessages(selfThread.id);
        setMessages(selfThread.id, msgs);
      }

      // Count pending messages (queued status)
      const pendingThreads = threadList.filter((t) => t.human_takeover_by);
      setPendingCount(pendingThreads.length);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load bot';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }, [currentUser, setThreads, findBotThread, setMessages]);

  useEffect(() => {
    loadBotThread();
  }, [loadBotThread]);

  useEffect(() => {
    getContacts().then(setContacts).catch(() => {});
  }, []);

  // WebSocket subscription
  useEffect(() => {
    const handler = (event: FeedEvent) => {
      if (!botThreadId) return;
      if (event.type === 'new_message') {
        const msg = event.data as Message;
        if (msg.thread_id === botThreadId) {
          addMessage(botThreadId, msg);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      } else if (event.type === 'status_update') {
        const d = event.data as { message_id?: string; status?: string; thread_id?: string };
        if (d.message_id && d.status && d.thread_id === botThreadId) {
          updateMessageStatus(d.message_id, botThreadId, d.status);
        }
      }
    };
    wsManager.subscribe(handler);
    return () => wsManager.unsubscribe(handler);
  }, [botThreadId, addMessage, updateMessageStatus]);

  const handleTextChange = (text: string) => {
    setInputText(text);
    const lastAt = text.lastIndexOf('@');
    if (lastAt !== -1) {
      const afterAt = text.slice(lastAt + 1);
      if (!afterAt.includes(' ')) {
        setShowMentionPicker(true);
        setMentionFilter(afterAt.toLowerCase());
        return;
      }
    }
    setShowMentionPicker(false);
  };

  const handleSelectMention = (contact: ContactInfo) => {
    const name = contact.display_name || contact.phone_number;
    const lastAt = inputText.lastIndexOf('@');
    const newText = inputText.slice(0, lastAt) + `@${name} `;
    setInputText(newText);
    setMentions((prev) => [
      ...prev,
      { display_name: name, phone: contact.phone_number, user_id: contact.user_id },
    ]);
    setShowMentionPicker(false);
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !currentUser) return;

    setSending(true);
    setInputText('');
    setMentions([]);
    setShowMentionPicker(false);
    try {
      const result = await sendMessage({
        to: currentUser.phone_number,
        intent: 'owner_command',
        payload: {
          text,
          ...(mentions.length > 0 && { mentions }),
        },
      });

      // Ensure thread ID is tracked (handles first-ever message case)
      const threadId = result.thread_id;
      if (!botThreadId) setBotThreadId(threadId);

      // Add the sent message directly — WebSocket dedup will skip it if it arrives later
      addMessage(threadId, {
        id: result.message_id,
        thread_id: threadId,
        from_user_id: currentUser.id,
        to_user_id: currentUser.id,
        intent: 'owner_command',
        payload: { text, ...(mentions.length > 0 && { mentions }) },
        status: result.status,
        human_override: false,
        created_at: new Date().toISOString(),
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send';
      Alert.alert('Send Failed', message);
      setInputText(text);
    } finally {
      setSending(false);
    }
  };

  const isOwnMessage = (msg: Message): boolean => {
    return msg.from_user_id === currentUser?.id && !msg.human_override;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Bot</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('BotInstructions')}
        >
          <Ionicons name="settings-outline" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActions}
        >
          <QuickActionButton
            label={`Pending Approvals${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
            variant={pendingCount > 0 ? 'accent' : 'default'}
            onPress={() => {
              // Navigate to chats tab to see threads with takeover
              navigation.navigate('Chats');
            }}
          />
          <QuickActionButton
            label="Recent Activity"
            variant="default"
            onPress={() => {
              navigation.navigate('Chats');
            }}
          />
          <QuickActionButton
            label="My Instructions"
            variant="default"
            onPress={() => {
              navigation.navigate('BotInstructions');
            }}
          />
        </ScrollView>
      </View>

      <View style={styles.divider} />

      {/* Chat Area */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={Colors.accent} size="large" />
          </View>
        ) : botMessages.length === 0 ? (
          <EmptyState
            icon="🤖"
            title="Chat with your bot"
            subtitle="Send a message below to interact with your personal AI bot"
          />
        ) : (
          <FlatList
            ref={flatListRef}
            data={botMessages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MessageBubble message={item} isOwn={isOwnMessage(item)} />
            )}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
          />
        )}

        <SafeAreaView edges={['bottom']} style={styles.inputSafe}>
          {showMentionPicker && (
            <View style={styles.mentionPicker}>
              <FlatList
                data={contacts.filter((c) =>
                  (c.display_name || c.phone_number).toLowerCase().includes(mentionFilter)
                )}
                keyExtractor={(c) => c.user_id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.mentionRow}
                    onPress={() => handleSelectMention(item)}
                    activeOpacity={0.7}
                  >
                    <Avatar name={item.display_name || item.phone_number} size={32} />
                    <Text style={styles.mentionName}>{item.display_name || item.phone_number}</Text>
                  </TouchableOpacity>
                )}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 180 }}
              />
            </View>
          )}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="Message your bot... (type @ to mention a contact)"
              placeholderTextColor={Colors.textMuted}
              value={inputText}
              onChangeText={handleTextChange}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color={Colors.bg} />
              ) : (
                <Ionicons name="arrow-up" size={20} color={Colors.bg} />
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
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
  settingsButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionsWrapper: {
    paddingVertical: 8,
  },
  quickActions: {
    paddingHorizontal: 16,
    gap: 0,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
    marginBottom: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesList: {
    paddingVertical: 12,
    flexGrow: 1,
  },
  inputSafe: {
    backgroundColor: Colors.bg,
  },
  mentionPicker: {
    backgroundColor: Colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  mentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  mentionName: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 10,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: Colors.bgCard,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    lineHeight: 20,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});

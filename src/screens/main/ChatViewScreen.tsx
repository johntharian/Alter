import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Message, FeedEvent, ChatsStackParamList } from '../../types';
import {
  getThreadMessages,
  sendMessage,
  startTakeover,
  endTakeover,
} from '../../services/api';
import { wsManager } from '../../services/ws';
import { useMessageStore } from '../../store/messageStore';
import { useAuthStore } from '../../store/authStore';
import { useThreadStore } from '../../store/threadStore';
import { MessageBubble } from '../../components/MessageBubble';
import { TakeoverBanner } from '../../components/TakeoverBanner';
import { Avatar } from '../../components/Avatar';

type Props = NativeStackScreenProps<ChatsStackParamList, 'ChatView'>;

export function ChatViewScreen({ navigation, route }: Props) {
  const { threadId, contactName, contactPhone } = route.params;
  const currentUser = useAuthStore((s) => s.user);
  const { messages, setMessages, addMessage, updateMessageStatus } = useMessageStore();
  const { threads, updateTakeover } = useThreadStore();

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [togglingTakeover, setTogglingTakeover] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState(threadId);

  const flatListRef = useRef<FlatList>(null);
  const thread = threads.find((t) => t.id === activeThreadId);
  const isTakeover = thread?.human_takeover_by === currentUser?.id;
  const threadMessages = messages[activeThreadId] ?? [];

  const loadMessages = useCallback(async () => {
    if (!activeThreadId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const msgs = await getThreadMessages(activeThreadId);
      setMessages(activeThreadId, msgs);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load messages';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }, [activeThreadId, setMessages]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // WebSocket subscription
  useEffect(() => {
    const handler = (event: FeedEvent) => {
      if (event.type === 'new_message') {
        const msg = event.data as Message;
        // If we didn't have a thread yet, capture the new thread_id
        if (!activeThreadId && msg.thread_id) {
          setActiveThreadId(msg.thread_id);
        }
        if (msg.thread_id === activeThreadId || (!activeThreadId && msg.thread_id && contactPhone)) {
          addMessage(msg.thread_id, msg);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      } else if (event.type === 'status_update') {
        const d = event.data as { message_id?: string; status?: string; thread_id?: string };
        if (d.message_id && d.status && d.thread_id === activeThreadId) {
          updateMessageStatus(d.message_id, activeThreadId, d.status);
        }
      } else if (event.type === 'takeover_started') {
        const d = event.data as { thread_id?: string; by_user_id?: string };
        if (d.thread_id === activeThreadId) updateTakeover(d.thread_id, d.by_user_id);
      } else if (event.type === 'takeover_ended') {
        const d = event.data as { thread_id?: string };
        if (d.thread_id === activeThreadId) updateTakeover(d.thread_id, undefined);
      }
    };
    wsManager.subscribe(handler);
    return () => wsManager.unsubscribe(handler);
  }, [activeThreadId, contactPhone, addMessage, updateMessageStatus, updateTakeover]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !currentUser) return;

    setSending(true);
    setInputText('');
    try {
      await sendMessage({
        to: contactPhone,
        intent: 'text_message',
        payload: { text },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send';
      Alert.alert('Send Failed', message);
      setInputText(text); // restore
    } finally {
      setSending(false);
    }
  };


  const handleTakeoverToggle = async () => {
    if (!activeThreadId) return;
    setTogglingTakeover(true);
    try {
      if (isTakeover) {
        await endTakeover(activeThreadId);
        updateTakeover(activeThreadId, undefined);
      } else {
        await startTakeover(activeThreadId);
        updateTakeover(activeThreadId, currentUser?.id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to toggle takeover';
      Alert.alert('Error', message);
    } finally {
      setTogglingTakeover(false);
    }
  };

  const isOwnMessage = (msg: Message): boolean => {
    return msg.from_user_id === currentUser?.id;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Avatar name={contactName} size={36} takeover={isTakeover} />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {contactName}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.takeoverButton,
            isTakeover && styles.takeoverButtonActive,
            !activeThreadId && styles.takeoverButtonDisabled,
          ]}
          onPress={handleTakeoverToggle}
          disabled={togglingTakeover || !activeThreadId}
        >
          {togglingTakeover ? (
            <ActivityIndicator size="small" color={isTakeover ? Colors.orange : Colors.textMuted} />
          ) : (
            <Ionicons
              name="hand-right"
              size={20}
              color={isTakeover ? Colors.orange : Colors.textMuted}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Takeover Banner */}
      {isTakeover && <TakeoverBanner />}

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={Colors.accent} size="large" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={threadMessages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MessageBubble message={item} isOwn={isOwnMessage(item)} />
            )}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
            ListEmptyComponent={
              <View style={styles.emptyMessages}>
                <Text style={styles.emptyText}>No messages yet</Text>
                {isTakeover && (
                  <Text style={styles.emptySubtext}>
                    Send a message to start the conversation
                  </Text>
                )}
              </View>
            }
          />
        )}

        {/* Input area */}
        <SafeAreaView edges={['bottom']} style={styles.inputSafe}>
          <View style={styles.inputRow}>
            {isTakeover ? (
              <>
                <TextInput
                  style={styles.textInput}
                  placeholder="Type a message..."
                  placeholderTextColor={Colors.textMuted}
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  maxLength={2000}
                  returnKeyType="send"
                  onSubmitEditing={handleSend}
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
              </>
            ) : (
              <View style={styles.disabledInputWrap}>
                <Ionicons name="lock-closed" size={14} color={Colors.textMuted} style={styles.lockIcon} />
                <Text style={styles.disabledInputText}>
                  Tap{' '}
                  <Text style={styles.disabledInputAccent}>
                    <Ionicons name="hand-right" size={13} />
                  </Text>
                  {' '}to take over and reply manually
                </Text>
              </View>
            )}
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
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  backButton: {
    padding: 4,
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  takeoverButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  takeoverButtonActive: {
    backgroundColor: Colors.orangeDim,
    borderColor: Colors.orange,
  },
  takeoverButtonDisabled: {
    opacity: 0.35,
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
  emptyMessages: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: 200,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textMuted,
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textDim,
    textAlign: 'center',
  },
  inputSafe: {
    backgroundColor: Colors.bg,
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
  disabledInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    height: 44,
    gap: 8,
  },
  lockIcon: {
    marginRight: 2,
  },
  disabledInputText: {
    fontSize: 14,
    color: Colors.textMuted,
    flex: 1,
  },
  disabledInputAccent: {
    color: Colors.textMuted,
  },
});

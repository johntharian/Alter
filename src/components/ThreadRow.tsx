import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { Thread, ContactInfo } from '../types';
import { Avatar } from './Avatar';
import { formatTime } from '../utils/formatters';

interface ThreadRowProps {
  thread: Thread;
  contact: ContactInfo | null;
  currentUserId: string;
  onPress: () => void;
}

export function ThreadRow({ thread, contact, currentUserId, onPress }: ThreadRowProps) {
  const name = contact?.display_name ?? contact?.phone_number ?? getOtherParticipant(thread, currentUserId);
  const isTakeover = !!thread.human_takeover_by;
  const preview = thread.last_message ?? '';
  const time = formatTime(thread.created_at);

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <Avatar name={name} size={48} takeover={isTakeover} style={styles.avatar} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.time}>{time}</Text>
        </View>
        <View style={styles.bottomRow}>
          <Text style={styles.preview} numberOfLines={1}>
            {preview || 'No messages yet'}
          </Text>
          {isTakeover && (
            <View style={styles.takeoverDot} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function getOtherParticipant(thread: Thread, currentUserId: string): string {
  if (thread.participant_a === currentUserId) return thread.participant_b;
  return thread.participant_a;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    marginRight: 12,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  preview: {
    fontSize: 13,
    color: Colors.textMuted,
    flex: 1,
    marginRight: 8,
  },
  takeoverDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.orange,
  },
});

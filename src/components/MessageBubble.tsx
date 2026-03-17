import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { Message } from '../types';
import { renderPayload, isPayloadFallback } from '../utils/payloadRenderer';
import { formatMessageTime } from '../utils/formatters';
import { StatusIndicator } from './StatusIndicator';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const text = renderPayload(message.payload, message.intent);
  const isFallback = isPayloadFallback(message.payload);
  const time = formatMessageTime(message.created_at);

  return (
    <View style={[styles.container, isOwn ? styles.containerOwn : styles.containerOther]}>
      <View
        style={[
          styles.bubble,
          isOwn ? styles.bubbleOwn : styles.bubbleOther,
        ]}
      >
        {message.human_override && (
          <Text style={styles.youTag}>You</Text>
        )}
        <Text
          style={[
            styles.text,
            isFallback && styles.textFallback,
          ]}
        >
          {text}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.time}>{time}</Text>
          {isOwn && (
            <View style={styles.status}>
              <StatusIndicator status={message.status} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 2,
    flexDirection: 'row',
  },
  containerOwn: {
    justifyContent: 'flex-end',
  },
  containerOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 7,
  },
  bubbleOwn: {
    backgroundColor: Colors.bubbleOutgoing,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 160, 0.2)',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: Colors.bubbleIncoming,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 4,
  },
  youTag: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.accent,
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  text: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 21,
  },
  textFallback: {
    color: Colors.textMuted,
    fontStyle: 'italic',
    fontSize: 13,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  time: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  status: {
    marginLeft: 2,
  },
});

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { MessageStatus } from '../types';

interface StatusIndicatorProps {
  status: MessageStatus | string;
}

export function StatusIndicator({ status }: StatusIndicatorProps) {
  switch (status) {
    case 'queued':
      return (
        <View style={styles.row}>
          <Ionicons name="checkmark" size={13} color={Colors.textMuted} />
        </View>
      );

    case 'delivered':
    case 'client_delivered':
      return (
        <View style={styles.row}>
          <Ionicons name="checkmark-done" size={13} color={Colors.textMuted} />
        </View>
      );

    case 'processed':
      return (
        <View style={styles.row}>
          <Ionicons name="checkmark-done" size={13} color={Colors.accent} />
        </View>
      );

    case 'failed':
      return (
        <View style={styles.row}>
          <Ionicons name="alert-circle" size={13} color={Colors.red} />
        </View>
      );

    default:
      return (
        <View style={styles.row}>
          <Ionicons name="checkmark" size={13} color={Colors.textMuted} />
        </View>
      );
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

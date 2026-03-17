import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface TakeoverBannerProps {
  message?: string;
}

export function TakeoverBanner({
  message = 'You are in control of this conversation',
}: TakeoverBannerProps) {
  return (
    <View style={styles.banner}>
      <Ionicons name="hand-right" size={16} color={Colors.orange} style={styles.icon} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.orangeDim,
    borderBottomWidth: 1,
    borderBottomColor: Colors.orange,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.orange,
    flex: 1,
  },
});

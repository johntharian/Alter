import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../constants/colors';

interface QuickActionButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'accent' | 'default';
  style?: ViewStyle;
}

export function QuickActionButton({
  label,
  onPress,
  variant = 'default',
  style,
}: QuickActionButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.pill, variant === 'accent' ? styles.pillAccent : styles.pillDefault, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.label, variant === 'accent' ? styles.labelAccent : styles.labelDefault]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  pillAccent: {
    backgroundColor: Colors.accentDim,
    borderColor: Colors.accent,
  },
  pillDefault: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.border,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  labelAccent: {
    color: Colors.accent,
  },
  labelDefault: {
    color: Colors.textMuted,
  },
});

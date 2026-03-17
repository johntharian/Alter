import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { getInitials } from '../utils/formatters';

// A deterministic color palette for avatar backgrounds
const AVATAR_COLORS = [
  '#1a4a3a',
  '#2a3a5a',
  '#3a2a4a',
  '#4a3a1a',
  '#1a3a4a',
  '#2a4a2a',
  '#4a1a2a',
  '#3a4a2a',
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

interface AvatarProps {
  name: string;
  size?: number;
  style?: object;
  /** Show an orange dot for takeover */
  takeover?: boolean;
}

export function Avatar({ name, size = 44, style, takeover = false }: AvatarProps) {
  const initials = getInitials(name);
  const bgColor = AVATAR_COLORS[hashName(name) % AVATAR_COLORS.length];
  const fontSize = size * 0.38;
  const dotSize = size * 0.28;

  return (
    <View style={[styles.wrapper, style]}>
      <View
        style={[
          styles.circle,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor },
        ]}
      >
        <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
      </View>
      {takeover && (
        <View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              bottom: 0,
              right: 0,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: Colors.text,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dot: {
    position: 'absolute',
    backgroundColor: Colors.orange,
    borderWidth: 2,
    borderColor: Colors.bg,
  },
});

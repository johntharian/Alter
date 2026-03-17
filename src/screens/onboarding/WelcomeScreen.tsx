import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types';
import { Colors } from '../../constants/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

const { width, height } = Dimensions.get('window');
const DOT_COUNT = 18;

// Deterministic dot positions
function getDotMeta(i: number) {
  const seed1 = ((i * 1013904223) >>> 0) % 1000;
  const seed2 = ((i * 1664525 + 1013904223) >>> 0) % 1000;
  return {
    x: (seed1 / 1000) * width,
    y: (seed2 / 1000) * height,
    size: 4 + (i % 3) * 2,
    delay: (i * 200) % 2000,
    duration: 3000 + (i % 3) * 500,
  };
}

const DOT_METAS = Array.from({ length: DOT_COUNT }, (_, i) => getDotMeta(i));

// Each dot as its own component so hooks are at the top level
function AnimatedDot({ index }: { index: number }) {
  const meta = DOT_METAS[index];
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(meta.delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: meta.duration,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: meta.duration,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, meta.delay, meta.duration]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: meta.x,
        top: meta.y,
        width: meta.size,
        height: meta.size,
        borderRadius: meta.size / 2,
        backgroundColor: Colors.accent,
        opacity: anim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.04, 0.25, 0.04],
        }),
      }}
    />
  );
}

function BackgroundDots() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {DOT_METAS.map((_, i) => (
        <AnimatedDot key={i} index={i} />
      ))}
    </View>
  );
}

export function WelcomeScreen({ navigation }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <View style={styles.root}>
      <BackgroundDots />
      <SafeAreaView style={styles.safe}>
        <View style={styles.inner}>
          <Animated.View
            style={[
              styles.center,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🤖</Text>
            </View>
            <Text style={styles.brand}>BotsApp</Text>
            <Text style={styles.tagline}>Your AI. Your number. Your network.</Text>
          </Animated.View>

          <Animated.View style={[styles.bottom, { opacity: fadeAnim }]}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('PhoneEntry')}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>Get Started</Text>
            </TouchableOpacity>
            <Text style={styles.disclaimer}>
              By continuing, you agree to our Terms & Privacy Policy
            </Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  safe: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.bgCard,
    borderWidth: 2,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  logoEmoji: {
    fontSize: 44,
  },
  brand: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  bottom: {
    alignItems: 'center',
  },
  button: {
    width: '100%',
    backgroundColor: Colors.accent,
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.bg,
    letterSpacing: 0.3,
  },
  disclaimer: {
    fontSize: 12,
    color: Colors.textDim,
    textAlign: 'center',
  },
});

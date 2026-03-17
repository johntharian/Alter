export const Colors = {
  bg: '#0a0e14',
  bgCard: '#111820',
  bgCardHover: '#161f2a',
  border: '#1c2a38',
  borderBright: '#243546',
  text: '#e8f0f8',
  textMuted: '#4a6070',
  textDim: '#2a3a4a',
  accent: '#00d4a0',
  accentDim: 'rgba(0, 212, 160, 0.12)',
  orange: '#ff7040',
  orangeDim: 'rgba(255, 112, 64, 0.12)',
  red: '#ff4455',
  green: '#00d4a0',
  // Bubbles
  bubbleOutgoing: 'rgba(0, 212, 160, 0.15)',
  bubbleIncoming: '#111820',
} as const;

export type ColorKey = keyof typeof Colors;

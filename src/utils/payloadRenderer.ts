/**
 * Extract a readable text string from an unknown message payload.
 * Falls back to humanizing the intent string if no text is found.
 */
export function renderPayload(payload: unknown, intent: string): string {
  if (typeof payload === 'string') return payload;

  if (payload && typeof payload === 'object') {
    const p = payload as Record<string, unknown>;
    if (typeof p.text === 'string') return p.text;
    if (typeof p.message === 'string') return p.message;
    if (typeof p.content === 'string') return p.content;
    if (typeof p.body === 'string') return p.body;
  }

  // Fallback: humanize the intent
  return intent.replace(/_/g, ' ');
}

/**
 * Returns true if the payload has no extractable human-readable text,
 * i.e. we fell back to the intent label.
 */
export function isPayloadFallback(payload: unknown): boolean {
  if (typeof payload === 'string') return false;
  if (payload && typeof payload === 'object') {
    const p = payload as Record<string, unknown>;
    if (
      typeof p.text === 'string' ||
      typeof p.message === 'string' ||
      typeof p.content === 'string' ||
      typeof p.body === 'string'
    ) {
      return false;
    }
  }
  return true;
}

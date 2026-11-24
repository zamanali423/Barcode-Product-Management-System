let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
  }
  return audioContext;
}

function tone(context: AudioContext, frequency: number, start: number, duration: number) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(0.06, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export function playScanFeedback(found: boolean, enabled: boolean) {
  if (enabled) {
    try {
      const context = getAudioContext();
      if (context) {
        if (context.state === 'suspended') void context.resume();
        const now = context.currentTime;
        if (found) {
          tone(context, 880, now, 0.08);
          tone(context, 1318, now + 0.085, 0.1);
        } else {
          tone(context, 320, now, 0.12);
          tone(context, 240, now + 0.14, 0.16);
        }
      }
    } catch {
      // Audio feedback is optional.
    }
  }

  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(found ? 35 : [35, 60, 35]);
    }
  } catch {
    // Vibration is optional.
  }
}

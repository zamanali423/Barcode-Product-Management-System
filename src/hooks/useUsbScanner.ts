import { useEffect, useRef } from 'react';
import type { UsbScanSuffix } from '../types';
import { isEditableTarget } from '../lib/utils';

interface UseUsbScannerOptions {
  enabled: boolean;
  onScan: (barcode: string) => void;
  minLength?: number;
  /** Max delay between keystrokes for scanner-like input. */
  maxKeystrokeGapMs?: number;
  /** Which key(s) a USB scanner appends to complete a code. */
  suffix?: UsbScanSuffix;
}

const SUFFIX_KEYS: Record<UsbScanSuffix, ReadonlySet<string>> = {
  enter: new Set(['Enter']),
  tab: new Set(['Tab']),
  both: new Set(['Enter', 'Tab']),
};

/**
 * USB scanners act as keyboards: they type the code rapidly and end with
 * Enter or Tab. This listens globally on the scanner screen while ignoring
 * real text inputs and only emits complete codes.
 */
export function useUsbScanner({
  enabled,
  onScan,
  minLength = 4,
  maxKeystrokeGapMs = 80,
  suffix = 'both',
}: UseUsbScannerOptions) {
  const onScanRef = useRef(onScan);
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return;

    const terminatorKeys = SUFFIX_KEYS[suffix];
    const reset = () => {
      bufferRef.current = '';
      lastKeyTimeRef.current = 0;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.isComposing || event.repeat) return;
      if (isEditableTarget(event.target)) return;

      if (event.key === 'Escape') {
        reset();
        return;
      }

      if (terminatorKeys.has(event.key)) {
        const value = bufferRef.current.trim();
        reset();
        if (value.length >= minLength) {
          event.preventDefault();
          onScanRef.current(value);
        }
        return;
      }

      if (event.key.length !== 1) return;
      const charCode = event.key.charCodeAt(0);
      if (charCode < 32) return;

      const now = performance.now();
      if (now - lastKeyTimeRef.current > maxKeystrokeGapMs) {
        bufferRef.current = '';
      }
      lastKeyTimeRef.current = now;
      // 2D keyboard-wedge scanners can emit long QR payloads, not just short
      // product codes. Keep the buffer generous while still bounding memory.
      if (bufferRef.current.length < 2048) {
        bufferRef.current += event.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, minLength, maxKeystrokeGapMs, suffix]);
}

import { useEffect, useRef, useCallback } from 'react';

export interface UseBarcodeScannerOptions {
  onScan: (scannedCode: string) => void;
  /** Max milliseconds between keystrokes to be considered a barcode scanner burst (default 50ms) */
  maxIntervalMs?: number;
  /** Minimum character length to be considered a valid barcode (default 3) */
  minLength?: number;
  /** Whether scanner listening is currently active (default true) */
  enabled?: boolean;
  /** Whether to play synthesized audio beep on scan (default true) */
  soundFeedback?: boolean;
}

/**
 * Synthesizes short POS acoustic beeps via Web Audio API without needing external audio assets.
 */
export function playScannerBeep(type: 'success' | 'error' = 'success') {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'success') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, ctx.currentTime); // High A6 pitch
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } else {
      // Double low buzz for invalid/not found
      [0, 0.1].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.07);
      });
    }
  } catch (e) {
    // AudioContext might be restricted until user interaction
  }
}

/**
 * High-performance Global Barcode / QR Code Scanner Hook
 *
 * Captures HID keyboard emulation keystroke bursts from USB and Bluetooth barcode scanners.
 * Handles timing thresholds (<50ms intervals) to cleanly separate scanner input from human typing.
 */
export function useBarcodeScanner({
  onScan,
  maxIntervalMs = 50,
  minLength = 3,
  enabled = true,
  soundFeedback = true,
}: UseBarcodeScannerOptions) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const currentTime = performance.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      const target = e.target as HTMLElement | null;
      const isInputFocused =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      // If the time between keystrokes is too long, reset the buffer
      if (timeDiff > maxIntervalMs) {
        bufferRef.current = '';
      }

      // Enter key indicates end of barcode stream
      if (e.key === 'Enter') {
        const code = bufferRef.current.trim();
        if (code.length >= minLength) {
          // If scanner scanned while an input was focused, prevent form submission
          e.preventDefault();
          e.stopPropagation();

          if (soundFeedback) {
            playScannerBeep('success');
          }
          onScanRef.current(code);
          bufferRef.current = '';
          return;
        }
        bufferRef.current = '';
        return;
      }

      // Printable single-character keys only
      if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // If user is actively typing slowly into an input box, let standard input handle it
        if (isInputFocused && timeDiff > maxIntervalMs) {
          bufferRef.current = '';
          return;
        }
        bufferRef.current += e.key;
      }
    },
    [enabled, maxIntervalMs, minLength, soundFeedback]
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) return;

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, handleKeyDown]);
}

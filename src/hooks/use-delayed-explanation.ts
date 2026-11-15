import { useCallback, useEffect, useRef, useState } from "react";

/** Derive a single explanation only after an uninterrupted one-second dwell. */
export function useDelayedExplanation<T>(derive: () => T, source: unknown) {
  const [result, setResult] = useState<{ source: unknown; value: T } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancel = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = undefined;
    setResult(null);
  }, []);
  useEffect(() => {
    cancel();
    return () => clearTimeout(timer.current);
  }, [source, cancel]);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** Close after a short grace period, so the pointer can travel into the explanation box. */
  const closeSoon = useCallback(() => {
    clearTimeout(timer.current); timer.current = undefined;
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setResult(null), 200);
  }, []);
  const keepOpen = useCallback(() => clearTimeout(closeTimer.current), []);
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  const start = () => {
    clearTimeout(closeTimer.current);
    cancel();
    timer.current = setTimeout(() => {
      timer.current = undefined;
      setResult({ source, value: derive() });
    }, 1000);
  };
  const value = result !== null && result.source === source ? result.value : null;
  return { value, start, cancel, closeSoon, keepOpen };
}
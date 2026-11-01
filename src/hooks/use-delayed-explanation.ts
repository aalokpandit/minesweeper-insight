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
  const start = () => {
    cancel();
    timer.current = setTimeout(() => {
      timer.current = undefined;
      setResult({ source, value: derive() });
    }, 1000);
  };
  return { value: result?.source === source ? result.value : null, start, cancel };
}
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDelayedExplanation } from "@/hooks/use-delayed-explanation";

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("on-demand explanations", () => {
  it("derives nothing on rendering and derives only after one second", () => {
    vi.useFakeTimers();
    const derive = vi.fn(() => 42);
    const source = {};
    const { result, rerender } = renderHook(() => useDelayedExplanation(derive, source));
    rerender();
    expect(derive).not.toHaveBeenCalled();
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(999));
    expect(derive).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(derive).toHaveBeenCalledTimes(1);
    expect(result.current.value).toBe(42);
    rerender();
    expect(derive).toHaveBeenCalledTimes(1);
  });

  it("cancels derivation when leaving or changing the board", () => {
    vi.useFakeTimers();
    const derive = vi.fn(() => 42);
    const { result, rerender } = renderHook(({ source }) => useDelayedExplanation(derive, source), {
      initialProps: { source: {} },
    });
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(700));
    act(() => result.current.cancel());
    act(() => vi.advanceTimersByTime(1000));
    expect(derive).not.toHaveBeenCalled();
    act(() => result.current.start());
    rerender({ source: {} });
    act(() => vi.advanceTimersByTime(1000));
    expect(derive).not.toHaveBeenCalled();
    expect(result.current.value).toBeNull();
  });
});
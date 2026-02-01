import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  debounce,
  throttle 
} from '../../utils/performanceOptimizations';

describe('PerformanceOptimizations', () => {
  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should delay function execution', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 1000);

      debouncedFn();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(500);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(500);
      expect(fn).toHaveBeenCalledOnce();
    });

    it('should reset timer on multiple calls', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 1000);

      debouncedFn();
      vi.advanceTimersByTime(500);
      
      debouncedFn(); // Reset timer
      vi.advanceTimersByTime(500);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(500);
      expect(fn).toHaveBeenCalledOnce();
    });

    it('should pass arguments correctly', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn('arg1', 42, { key: 'value' });
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith('arg1', 42, { key: 'value' });
    });
  });

  describe('throttle', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should execute function immediately on first call', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 1000);

      throttledFn();
      expect(fn).toHaveBeenCalledOnce();
    });

    it('should prevent execution during throttle period', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 1000);

      throttledFn(); // Called immediately
      throttledFn(); // Throttled
      throttledFn(); // Throttled

      expect(fn).toHaveBeenCalledOnce();
    });

    it('should allow execution after throttle period', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 1000);

      throttledFn(); // Called immediately
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1000);

      throttledFn(); // Should be called now
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should pass arguments correctly', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 100);

      throttledFn('test', 123);
      expect(fn).toHaveBeenCalledWith('test', 123);
    });
  });
});


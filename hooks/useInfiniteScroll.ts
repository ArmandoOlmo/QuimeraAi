import { useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  threshold?: number; // Distance from bottom to trigger load (default 100px)
}

/**
 * Hook for implementing infinite scroll
 * Uses IntersectionObserver to detect when user scrolls near bottom
 */
export const useInfiniteScroll = ({
  onLoadMore,
  hasMore,
  isLoading,
  threshold = 100,
}: UseInfiniteScrollOptions) => {
  const observerTarget = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      
      // If the sentinel is visible and we have more items and not currently loading
      if (entry.isIntersecting && hasMore && !isLoading) {
        onLoadMore();
      }
    },
    [hasMore, isLoading, onLoadMore]
  );

  useEffect(() => {
    const element = observerTarget.current;
    if (!element) return;

    const options = {
      root: null, // viewport
      rootMargin: `${threshold}px`,
      threshold: 0,
    };

    const observer = new IntersectionObserver(handleObserver, options);
    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [handleObserver, threshold]);

  return observerTarget;
};

/**
 * Paginate an array of items
 */
export const paginateArray = <T,>(
  items: T[],
  currentPage: number,
  itemsPerPage: number
): T[] => {
  return items.slice(0, currentPage * itemsPerPage);
};

/**
 * Check if there are more items to load
 */
export const hasMoreItems = <T,>(
  totalItems: number,
  currentPage: number,
  itemsPerPage: number
): boolean => {
  return currentPage * itemsPerPage < totalItems;
};


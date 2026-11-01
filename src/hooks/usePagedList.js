import { useEffect, useRef, useState } from "react";

const PAGE_SIZE = 12;

export function useDebouncedValue(value, delay = 300) {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
}

// Loads a page of events at a time. The current list stays on screen until the
// next one arrives, so typing in a search box doesn't flash a loader.
export function usePagedList(fetchPage, deps = []) {
  const [state, setState] = useState({
    items: [],
    page: 1,
    totalPages: 1,
    summary: null,
    loading: true,
    loadingMore: false,
    error: null,
  });
  const latestRequest = useRef(0);

  const load = async (page) => {
    const request = ++latestRequest.current;
    try {
      const data = await fetchPage({ page, limit: PAGE_SIZE });
      if (request !== latestRequest.current) return;

      setState((prev) => {
        const seen = new Set(prev.items.map((item) => item._id));
        return {
          items: page === 1 ? data.events : [...prev.items, ...data.events.filter((item) => !seen.has(item._id))],
          page,
          totalPages: data.pagination.totalPages,
          summary: data.summary || null,
          loading: false,
          loadingMore: false,
          error: null,
        };
      });
    } catch (error) {
      if (request !== latestRequest.current) return;
      setState((prev) => ({ ...prev, loading: false, loadingMore: false, error }));
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const loadMore = () => {
    setState((prev) => ({ ...prev, loadingMore: true }));
    load(state.page + 1);
  };

  return { ...state, hasMore: state.page < state.totalPages, loadMore, reload: () => load(1) };
}

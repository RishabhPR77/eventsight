import { useCallback, useEffect, useState } from "react";

// Loads data on mount and when deps change. reload() refreshes in place, so
// the screen keeps showing the current data instead of flashing a loader.
export function useResource(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    fetcher()
      .then((data) => active && setState({ data, loading: false, error: null }))
      .catch((error) => active && setState((prev) => ({ ...prev, loading: false, error })));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, ...deps]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return { ...state, reload };
}

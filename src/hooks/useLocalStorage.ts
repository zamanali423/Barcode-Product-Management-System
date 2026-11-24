import { useCallback, useEffect, useState } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValueState] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage can be unavailable in private browsing; the UI still works.
    }
  }, [key, value]);

  const setValue = useCallback((next: T | ((previous: T) => T)) => {
    setValueState((previous) =>
      typeof next === 'function' ? (next as (value: T) => T)(previous) : next,
    );
  }, []);

  return [value, setValue] as const;
}

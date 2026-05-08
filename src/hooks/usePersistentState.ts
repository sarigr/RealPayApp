import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

export function usePersistentState<T>(
  key: string,
  defaultValue: T,
  isValid?: (value: unknown) => value is T
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return defaultValue;
    }

    try {
      const storedValue = window.localStorage.getItem(key);

      if (storedValue === null) {
        return defaultValue;
      }

      try {
        const parsedValue: unknown = JSON.parse(storedValue);

        if (isValid && !isValid(parsedValue)) {
          return defaultValue;
        }

        return parsedValue as T;
      } catch {
        if (isValid && isValid(storedValue)) {
          return storedValue;
        }

        return defaultValue;
      }
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Persistence is best-effort and intentionally local to this browser.
    }
  }, [key, value]);

  return [value, setValue];
}
